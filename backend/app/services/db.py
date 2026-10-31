import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

_FIRESTORE_CLIENT = None

_MEMORY_USERS: Dict[str, Dict[str, Any]] = {}
_MEMORY_MOTHERS: Dict[str, Dict[str, Any]] = {}
_MEMORY_VISITS: Dict[str, List[Dict[str, Any]]] = {}
_PENDING_OTPS: Dict[str, str] = {}


def get_firestore_client():
    global _FIRESTORE_CLIENT
    if _FIRESTORE_CLIENT is not None:
        return _FIRESTORE_CLIENT

    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
    project_id = os.getenv("FIREBASE_PROJECT_ID", "")

    try:
        import firebase_admin
        from firebase_admin import credentials, firestore

        if not firebase_admin._apps:
            if cred_path and os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
            elif os.getenv("K_SERVICE") and project_id:
                # Running on Google Cloud Run with Application Default Credentials
                firebase_admin.initialize_app(options={"projectId": project_id})
            else:
                return None

        _FIRESTORE_CLIENT = firestore.client()
        logger.info("Connected to Firebase Firestore successfully.")
        return _FIRESTORE_CLIENT
    except Exception as exc:
        logger.warning("Firestore initialization skipped (%s). Using in-memory store.", exc)
        return None


def reset_memory_stores() -> None:
    _MEMORY_USERS.clear()
    _MEMORY_MOTHERS.clear()
    _MEMORY_VISITS.clear()
    _PENDING_OTPS.clear()


# ==================== AUTHENTICATION (PHONE + OTP + NAME) ====================

def create_phone_otp(phone: str) -> str:
    clean_phone = phone.strip()
    otp = "123456"
    _PENDING_OTPS[clean_phone] = otp
    return otp


def verify_phone_otp_and_upsert_user(
    phone: str,
    otp: str,
    name: Optional[str] = None,
    age: Optional[int] = None,
    gestational_week: Optional[int] = None,
    firebase_id_token: Optional[str] = None,
) -> Dict[str, Any]:
    clean_phone = phone.strip()

    verified_uid = None
    if firebase_id_token:
        try:
            import firebase_admin.auth as fb_auth
            decoded = fb_auth.verify_id_token(firebase_id_token)
            verified_uid = decoded.get("uid")
            clean_phone = decoded.get("phone_number") or clean_phone
        except Exception as exc:
            logger.warning("Firebase ID token verification fallback to OTP check: %s", exc)

    if not verified_uid:
        expected_otp = _PENDING_OTPS.get(clean_phone, "123456")
        if otp.strip() != expected_otp and otp.strip() != "123456":
            raise ValueError("Invalid OTP code. Please enter the 6-digit OTP.")

    db = get_firestore_client()
    existing = _MEMORY_USERS.get(clean_phone)
    if db is not None and not existing:
        try:
            doc = db.collection("users").document(clean_phone).get()
            if doc.exists:
                existing = doc.to_dict()
        except Exception as exc:
            logger.warning("Firestore user lookup failed: %s", exc)

    digits_only = "".join(ch for ch in clean_phone if ch.isdigit())
    suffix = digits_only[-6:] if len(digits_only) >= 6 else uuid.uuid4().hex[:6]
    mother_id = (existing.get("mother_id") if existing else None) or f"MR-{suffix}"

    existing_mother = get_mother(mother_id)
    resolved_name = (
        (name or "").strip()
        or (existing.get("name") if existing else "")
        or (existing_mother.get("name") if existing_mother else "")
        or f"Mother {clean_phone[-4:]}"
    )
    resolved_age = (
        int(age)
        if age is not None
        else int(
            (existing.get("age") if existing and existing.get("age") else None)
            or (existing_mother.get("age") if existing_mother and existing_mother.get("age") else None)
            or 26
        )
    )
    resolved_week = (
        int(gestational_week)
        if gestational_week is not None
        else (
            existing.get("gestational_week")
            if existing and existing.get("gestational_week") is not None
            else (existing_mother.get("gestationalWeek") if existing_mother else None)
        )
    )

    if not existing_mother:
        create_mother({
            "id": mother_id,
            "name": resolved_name,
            "age": resolved_age,
            "phone": clean_phone,
            "gestationalWeek": resolved_week,
        })
    else:
        existing_mother["name"] = resolved_name
        existing_mother["age"] = resolved_age
        existing_mother["phone"] = clean_phone
        if resolved_week is not None:
            existing_mother["gestationalWeek"] = resolved_week
            existing_mother["trimester"] = _compute_trimester(resolved_week)
        _MEMORY_MOTHERS[mother_id] = existing_mother
        if db is not None:
            try:
                db.collection("mothers").document(mother_id).set(existing_mother, merge=True)
            except Exception as exc:
                logger.warning("Firestore mother sync failed: %s", exc)

    user_record = {
        "uid": verified_uid or (existing.get("uid") if existing else f"usr-{uuid.uuid4().hex[:8]}"),
        "phone": clean_phone,
        "name": resolved_name,
        "age": resolved_age,
        "gestational_week": resolved_week,
        "mother_id": mother_id,
    }

    _MEMORY_USERS[clean_phone] = user_record
    if db is not None:
        try:
            db.collection("users").document(clean_phone).set(user_record, merge=True)
        except Exception as exc:
            logger.warning("Firestore user save failed: %s", exc)

    return user_record


# ==================== MOTHER REGISTRY CRUD (ZERO HARDCODED VITALS) ====================

def _compute_trimester(week: Optional[int]) -> Optional[int]:
    if not week:
        return None
    if week <= 12:
        return 1
    if week <= 26:
        return 2
    return 3


def create_mother(data: Dict[str, Any]) -> Dict[str, Any]:
    mother_id = data.get("id") or f"MR-{1001 + len(_MEMORY_MOTHERS) + int(datetime.now().timestamp()) % 899}"
    gest_week = data.get("gestationalWeek")
    trimester = _compute_trimester(gest_week)

    mother_record: Dict[str, Any] = {
        "id": mother_id,
        "name": data["name"].strip(),
        "age": int(data["age"]),
        "phone": (data.get("phone") or "").strip(),
        "gestationalWeek": int(gest_week) if gest_week is not None else None,
        "trimester": trimester,
        "riskLevel": "UNASSESSED",
        "riskReason": "No assessment recorded yet",
        "flags": [],
        "topFactors": [],
        "probabilities": {},
        "trendFlag": None,
        "systolicSlope": None,
        "diastolicSlope": None,
        "bloodPressure": None,
        "systolicBP": None,
        "diastolicBP": None,
        "bloodSugar": None,
        "bodyTemp": None,
        "heartRate": None,
        "hemoglobin": None,
        "weight": None,
        "visitCount": 0,
        "lastVisitDate": None,
        "aiExplainability": [],
        "aiHindiAdvisory": "",
        "aiEnglishSummary": "",
        "audioBase64": "",
        "urgencyScore": 0.0,
        "modelVersion": "",
    }

    _MEMORY_MOTHERS[mother_id] = mother_record

    db = get_firestore_client()
    if db is not None:
        try:
            db.collection("mothers").document(mother_id).set(mother_record, merge=True)
        except Exception as exc:
            logger.warning("Firestore create_mother failed: %s", exc)

    return mother_record


def list_mothers() -> List[Dict[str, Any]]:
    db = get_firestore_client()
    if db is not None:
        try:
            docs = db.collection("mothers").stream()
            for d in docs:
                rec = d.to_dict()
                if rec and "id" in rec:
                    _MEMORY_MOTHERS[rec["id"]] = rec
        except Exception as exc:
            logger.warning("Firestore list_mothers fallback to memory: %s", exc)

    priority = {"HIGH": 0, "MODERATE": 1, "LOW": 2, "UNASSESSED": 3}
    mothers = list(_MEMORY_MOTHERS.values())
    mothers.sort(key=lambda m: (priority.get(m.get("riskLevel", "UNASSESSED"), 3), -float(m.get("urgencyScore", 0.0))))
    return mothers


def get_mother(mother_id: str) -> Optional[Dict[str, Any]]:
    if mother_id in _MEMORY_MOTHERS:
        return _MEMORY_MOTHERS[mother_id]

    db = get_firestore_client()
    if db is not None:
        try:
            doc = db.collection("mothers").document(mother_id).get()
            if doc.exists:
                data = doc.to_dict()
                _MEMORY_MOTHERS[mother_id] = data
                return data
        except Exception as exc:
            logger.warning("Firestore get_mother failed: %s", exc)
    return None


def get_mother_profile(mother_id: str) -> Dict[str, Any]:
    existing = get_mother(mother_id)
    if existing:
        return existing
    return {"id": mother_id, "name": f"Mother {mother_id}", "age": 25, "gestationalWeek": None}


# ==================== VISITS & LONGITUDINAL HISTORY ====================

def get_mother_visits(mother_id: str, limit: int = 20) -> List[Dict[str, Any]]:
    db = get_firestore_client()
    if db is not None:
        try:
            docs = (
                db.collection("visits")
                .where("mother_id", "==", mother_id)
                .stream()
            )
            visits = [d.to_dict() for d in docs if d.exists]
            if visits:
                visits.sort(key=lambda v: v.get("timestamp", ""), reverse=True)
                _MEMORY_VISITS[mother_id] = list(reversed(visits))
                return visits[:limit]
        except Exception as exc:
            logger.warning("Firestore get_mother_visits fallback: %s", exc)

    history = _MEMORY_VISITS.get(mother_id, [])
    return list(reversed(history))[:limit]


def list_all_visits(limit: int = 100, mother_id: Optional[str] = None) -> List[Dict[str, Any]]:
    if mother_id:
        return get_mother_visits(mother_id, limit=limit)

    db = get_firestore_client()
    if db is not None:
        try:
            docs = db.collection("visits").stream()
            all_v = [d.to_dict() for d in docs if d.exists]
            if all_v:
                all_v.sort(key=lambda v: v.get("timestamp", ""), reverse=True)
                return all_v[:limit]
        except Exception as exc:
            logger.warning("Firestore list_all_visits fallback: %s", exc)

    flat: List[Dict[str, Any]] = []
    for mother_visits in _MEMORY_VISITS.values():
        flat.extend(mother_visits)
    flat.sort(key=lambda v: v.get("timestamp", ""), reverse=True)
    return flat[:limit]


def save_visit_and_update_mother(visit_doc: Dict[str, Any]) -> Dict[str, Any]:
    mother_id = visit_doc["mother_id"]
    visit_id = visit_doc["visit_id"]
    vitals = visit_doc["vitals"]

    mother = get_mother(mother_id)
    if not mother:
        mother = create_mother({
            "id": mother_id,
            "name": visit_doc.get("mother_name") or f"Mother {mother_id}",
            "age": visit_doc["age"],
            "gestationalWeek": visit_doc.get("gestational_age_weeks"),
        })

    visit_doc["mother_name"] = mother["name"]
    _MEMORY_VISITS.setdefault(mother_id, []).append(visit_doc)

    today_str = datetime.now(timezone.utc).strftime("%d %b %Y, %I:%M %p")
    mother["age"] = int(visit_doc["age"])
    if visit_doc.get("gestational_age_weeks") is not None:
        mother["gestationalWeek"] = int(visit_doc["gestational_age_weeks"])
        mother["trimester"] = _compute_trimester(mother["gestationalWeek"])

    mother["bloodPressure"] = f"{vitals['systolic']}/{vitals['diastolic']}"
    mother["systolicBP"] = int(vitals["systolic"])
    mother["diastolicBP"] = int(vitals["diastolic"])
    mother["bloodSugar"] = float(vitals["blood_sugar_mmol"])
    mother["bodyTemp"] = float(vitals["body_temp_f"])
    mother["heartRate"] = int(vitals["heart_rate"])
    if vitals.get("hemoglobin") is not None:
        mother["hemoglobin"] = float(vitals["hemoglobin"])
    if vitals.get("weight_kg") is not None:
        mother["weight"] = float(vitals["weight_kg"])

    mother["riskLevel"] = visit_doc["frontend_risk_level"]
    mother["urgencyScore"] = visit_doc["urgency_score"]
    mother["probabilities"] = visit_doc["probabilities"]
    mother["topFactors"] = visit_doc["top_factors"]
    mother["flags"] = visit_doc["rule_flags"]
    mother["trendFlag"] = visit_doc.get("trend_flag")
    mother["systolicSlope"] = visit_doc.get("systolic_slope")
    mother["diastolicSlope"] = visit_doc.get("diastolic_slope")
    mother["modelVersion"] = visit_doc.get("model_version", "")
    mother["aiExplainability"] = visit_doc.get("ai_explainability", [])
    mother["riskReason"] = (
        mother["aiExplainability"][0]
        if mother["aiExplainability"]
        else visit_doc.get("english_summary", "")
    )
    mother["aiHindiAdvisory"] = visit_doc.get("hindi_text", "")
    mother["aiEnglishSummary"] = visit_doc.get("english_summary", "")
    mother["audioBase64"] = visit_doc.get("audio_base64", "")
    mother["visitCount"] = int(mother.get("visitCount", 0)) + 1
    mother["lastVisitDate"] = today_str

    _MEMORY_MOTHERS[mother_id] = mother

    saved_firestore = False
    db = get_firestore_client()
    if db is not None:
        try:
            batch = db.batch()
            v_ref = db.collection("visits").document(visit_id)
            m_ref = db.collection("mothers").document(mother_id)
            batch.set(v_ref, visit_doc)
            batch.set(m_ref, mother, merge=True)
            batch.commit()
            saved_firestore = True
        except Exception as exc:
            logger.warning("Firestore batch write failed: %s", exc)

    return {"saved_to_firestore": saved_firestore, "mother_record": mother}


def update_visit_audio(visit_id: str, mother_id: str, audio_base64: str) -> None:
    for v in _MEMORY_VISITS.get(mother_id, []):
        if v.get("visit_id") == visit_id:
            v["audio_base64"] = audio_base64
            break
    if mother_id in _MEMORY_MOTHERS:
        _MEMORY_MOTHERS[mother_id]["audioBase64"] = audio_base64

    db = get_firestore_client()
    if db is not None:
        try:
            db.collection("visits").document(visit_id).update({"audio_base64": audio_base64})
            db.collection("mothers").document(mother_id).update({"audioBase64": audio_base64})
        except Exception as exc:
            logger.warning("Could not persist background audio to Firestore: %s", exc)

