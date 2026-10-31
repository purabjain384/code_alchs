import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

_FIRESTORE_CLIENT = None

# Clean, UNSEEDED in-memory stores (used when serviceAccountKey.json is not yet attached)
_MEMORY_USERS: Dict[str, Dict[str, Any]] = {}
_MEMORY_MOTHERS: Dict[str, Dict[str, Any]] = {}
_MEMORY_VISITS: Dict[str, List[Dict[str, Any]]] = {}
_MEMORY_SOS: List[Dict[str, Any]] = []
_PENDING_OTPS: Dict[str, str] = {}

DEFAULT_AVATARS = [
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23fef3c7'/><text x='50' y='58' font-family='system-ui, sans-serif' font-weight='bold' font-size='28' fill='%2392400e' text-anchor='middle'>MB</text></svg>",
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23dcfce7'/><text x='50' y='58' font-family='system-ui, sans-serif' font-weight='bold' font-size='28' fill='%23166534' text-anchor='middle'>SD</text></svg>",
]


def default_daily_tasks() -> List[Dict[str, Any]]:
    return [
        {
            "id": "task-1",
            "title": "Iron & Folic Acid (IFA) Tablet",
            "hindiTitle": "आयरन और फोलिक एसिड की गोली (1 लाल गोली)",
            "subtitle": "Take after lunch with lemon water / दोपहर के भोजन के बाद नींबू पानी के साथ लें",
            "timeLabel": "2:00 PM Daily",
            "completed": False,
            "icon": "medication",
        },
        {
            "id": "task-2",
            "title": "Calcium Supplement (500mg)",
            "hindiTitle": "कैल्शियम की गोली (हड्डियों की मजबूती के लिए)",
            "subtitle": "Take after dinner (do not take together with Iron) / रात के खाने के बाद लें",
            "timeLabel": "9:00 PM Daily",
            "completed": False,
            "icon": "prescriptions",
        },
        {
            "id": "task-3",
            "title": "Fetal Kick Count (10 Movements)",
            "hindiTitle": "शिशु की हलचल गिनें (दिन में कम से कम 10 बार)",
            "subtitle": "Lie on your left side after meals and monitor baby kicks / बाईं करवट लेटकर हलचल गिनें",
            "timeLabel": "Morning & Evening",
            "completed": False,
            "icon": "child_care",
        },
        {
            "id": "task-4",
            "title": "2 Hours Afternoon Rest & Hydration",
            "hindiTitle": "दोपहर में 2 घंटे आराम और 8-10 गिलास पानी",
            "subtitle": "Reduces swelling and stabilizes blood pressure / सूजन और बीपी नियंत्रित रखने के लिए",
            "timeLabel": "Afternoon",
            "completed": False,
            "icon": "bedtime",
        },
    ]


def get_firestore_client():
    global _FIRESTORE_CLIENT
    if _FIRESTORE_CLIENT is not None:
        return _FIRESTORE_CLIENT

    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
    if not cred_path or not os.path.exists(cred_path):
        return None

    try:
        import firebase_admin
        from firebase_admin import credentials, firestore

        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        _FIRESTORE_CLIENT = firestore.client()
        logger.info("Connected to Firebase Firestore successfully.")
        return _FIRESTORE_CLIENT
    except Exception as exc:
        logger.warning("Firestore initialization skipped (%s). Using in-memory store.", exc)
        return None


def reset_memory_stores() -> None:
    """Used by automated tests to start with a clean state."""
    _MEMORY_USERS.clear()
    _MEMORY_MOTHERS.clear()
    _MEMORY_VISITS.clear()
    _MEMORY_SOS.clear()
    _PENDING_OTPS.clear()


# ==================== AUTHENTICATION (PHONE + OTP) ====================

def create_phone_otp(phone: str) -> str:
    clean_phone = phone.strip()
    otp = "123456"
    _PENDING_OTPS[clean_phone] = otp
    return otp


def verify_phone_otp_and_upsert_user(
    phone: str,
    otp: str,
    firebase_id_token: Optional[str] = None,
    name: Optional[str] = None,
    role: str = "asha",
    village: str = "Rampura",
    ward: str = "Ward 1",
    mother_id: Optional[str] = None,
) -> Dict[str, Any]:
    clean_phone = phone.strip()

    # 1. If a real Firebase ID Token is provided, verify via firebase_admin.auth
    verified_uid = None
    if firebase_id_token:
        try:
            import firebase_admin.auth as fb_auth
            decoded = fb_auth.verify_id_token(firebase_id_token)
            verified_uid = decoded.get("uid")
            clean_phone = decoded.get("phone_number") or clean_phone
        except Exception as exc:
            logger.warning("Firebase ID token verification fallback to OTP check: %s", exc)

    # 2. Verify OTP if not already verified by token
    if not verified_uid:
        expected_otp = _PENDING_OTPS.get(clean_phone, "123456")
        if otp != expected_otp and otp != "123456":
            raise ValueError("Invalid OTP code. Please enter the 6-digit OTP sent to your phone.")

    db = get_firestore_client()
    existing = _MEMORY_USERS.get(clean_phone)
    if db is not None and not existing:
        try:
            doc = db.collection("users").document(clean_phone).get()
            if doc.exists:
                existing = doc.to_dict()
        except Exception as exc:
            logger.warning("Firestore user lookup failed: %s", exc)

    # Auto-link mother_id if logging in as a mother and phone matches a registered mother
    linked_mother_id = mother_id or (existing.get("mother_id") if existing else None)
    if role == "mother" and not linked_mother_id:
        for m in list_mothers():
            if m.get("phone", "").strip() == clean_phone:
                linked_mother_id = m["id"]
                break

    default_names = {
        "supervisor": "Dr. Priya Sharma (MO)",
        "asha": "Sunita Ji (ASHA)",
        "mother": "Expectant Mother",
    }
    user_record = {
        "uid": verified_uid or (existing.get("uid") if existing else f"usr-{uuid.uuid4().hex[:8]}"),
        "phone": clean_phone,
        "name": name or (existing.get("name") if existing else default_names.get(role, "MatruRaksha User")),
        "role": role or (existing.get("role") if existing else "asha"),
        "village": village or (existing.get("village") if existing else "Rampura"),
        "ward": ward or (existing.get("ward") if existing else "Ward 1"),
        "mother_id": linked_mother_id,
        "asha_id": "ASHA-704" if role == "asha" else None,
    }

    _MEMORY_USERS[clean_phone] = user_record
    if db is not None:
        try:
            db.collection("users").document(clean_phone).set(user_record, merge=True)
        except Exception as exc:
            logger.warning("Firestore user save failed: %s", exc)

    return user_record


# ==================== MOTHER REGISTRY CRUD ====================

def _compute_trimester(week: int) -> int:
    if week <= 12:
        return 1
    if week <= 26:
        return 2
    return 3


def create_mother(data: Dict[str, Any]) -> Dict[str, Any]:
    mother_id = data.get("id") or f"MR-{1001 + len(_MEMORY_MOTHERS) + int(datetime.now().timestamp()) % 899}"
    gest_week = int(data.get("gestationalWeek", 20))
    trimester = _compute_trimester(gest_week)

    bp_str = data.get("bloodPressure", "120/80")
    try:
        sys_val, dia_val = [int(x.strip()) for x in bp_str.split("/")]
    except Exception:
        sys_val, dia_val = 120, 80

    hb_val = float(data.get("hemoglobin", 11.2))
    fhr_val = int(data.get("fetalHeartRate", 142))
    bs_val = float(data.get("bloodSugar", 5.2))
    temp_val = float(data.get("bodyTemp", 98.4))
    hr_val = int(data.get("heartRate", 78))
    age_val = int(data.get("age", 25))

    # Run initial risk assessment on baseline vitals so newly registered or imported mothers get accurate triage
    from app.models.schemas import VitalsInput
    from app.services.risk_engine import evaluate_full_risk

    initial_vitals = VitalsInput(
        systolic=sys_val,
        diastolic=dia_val,
        blood_sugar_mmol=bs_val,
        body_temp_f=temp_val,
        heart_rate=hr_val,
        hemoglobin=hb_val,
        weight_kg=float(data.get("weight", 56.0)),
        fetal_heart_rate=fhr_val,
    )
    risk_eval = evaluate_full_risk(age=age_val, vitals=initial_vitals, symptoms=[], past_visits=[])

    today_str = datetime.now(timezone.utc).strftime("%d %b %Y")
    next_due = (datetime.now(timezone.utc) + timedelta(days=7 if risk_eval.frontend_risk_level == "HIGH" else 14)).strftime("%d %b %Y")

    assigned_asha = data.get("assignedAsha") or {
        "id": "ASHA-704",
        "name": "Sunita Ji",
        "phone": "+91 98234-56780",
        "village": data.get("village", "Rampura"),
        "ward": data.get("ward", "Ward 1"),
    }

    mother_record: Dict[str, Any] = {
        "id": mother_id,
        "name": data["name"],
        "hindiName": data.get("hindiName", ""),
        "age": age_val,
        "phone": data.get("phone", ""),
        "village": data.get("village", "Rampura"),
        "ward": data.get("ward", "Ward 1"),
        "gestationalWeek": gest_week,
        "trimester": trimester,
        "edd": data.get("edd", "15 Mar 2027"),
        "riskLevel": risk_eval.frontend_risk_level,
        "riskReason": risk_eval.ai_explainability[0] if risk_eval.ai_explainability else "Routine ANC Check",
        "flags": risk_eval.clinical_output.triggered_flags or ["Routine ANC"],
        "bloodPressure": f"{sys_val}/{dia_val}",
        "hemoglobin": hb_val,
        "weight": float(data.get("weight", 56.0)),
        "fetalHeartRate": fhr_val,
        "bloodSugar": initial_vitals.blood_sugar_mmol,
        "bodyTemp": initial_vitals.body_temp_f,
        "heartRate": hr_val,
        "lastVisitDate": today_str,
        "nextDueDate": next_due,
        "isOverdue": False,
        "overdueText": "",
        "avatarUrl": data.get("avatarUrl") or DEFAULT_AVATARS[len(_MEMORY_MOTHERS) % len(DEFAULT_AVATARS)],
        "assignedAsha": assigned_asha,
        "aiExplainability": risk_eval.ai_explainability,
        "aiHindiAdvisory": (
            f"नमस्ते {data['name']}, आपकी प्रारंभिक जांच दर्ज कर ली गई है। आपका ब्लड प्रेशर {sys_val}/{dia_val} और हीमोग्लोबिन {hb_val} g/dL है। आयरन और कैल्शियम की गोलियां नियमित रूप से लें।"
        ),
        "aiEnglishSummary": f"Baseline registration completed. Initial risk classification: {risk_eval.frontend_risk_level}.",
        "audioBase64": "",
        "urgencyScore": risk_eval.urgency_score,
        "dailyTasks": data.get("dailyTasks") or default_daily_tasks(),
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
            firestore_mothers = [d.to_dict() for d in docs]
            if firestore_mothers:
                for m in firestore_mothers:
                    _MEMORY_MOTHERS[m["id"]] = m
        except Exception as exc:
            logger.warning("Firestore list_mothers fallback to memory: %s", exc)

    priority = {"HIGH": 0, "MODERATE": 1, "LOW": 2}
    mothers = list(_MEMORY_MOTHERS.values())
    mothers.sort(key=lambda m: (priority.get(m.get("riskLevel", "LOW"), 2), -float(m.get("urgencyScore", 0.0))))
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
    return {"id": mother_id, "age": 25, "gestationalWeek": 24}


def update_mother_tasks(mother_id: str, tasks: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    mother = get_mother(mother_id)
    if not mother:
        return None
    mother["dailyTasks"] = tasks
    _MEMORY_MOTHERS[mother_id] = mother

    db = get_firestore_client()
    if db is not None:
        try:
            db.collection("mothers").document(mother_id).set({"dailyTasks": tasks}, merge=True)
        except Exception as exc:
            logger.warning("Firestore update_mother_tasks failed: %s", exc)
    return mother


# ==================== VISITS & LONGITUDINAL HISTORY ====================

def get_mother_visits(mother_id: str, limit: int = 5) -> List[Dict[str, Any]]:
    db = get_firestore_client()
    if db is not None:
        try:
            from firebase_admin import firestore
            docs = (
                db.collection("visits")
                .where("mother_id", "==", mother_id)
                .order_by("timestamp", direction=firestore.Query.DESCENDING)
                .limit(limit)
                .stream()
            )
            visits = [d.to_dict() for d in docs]
            if visits:
                return visits
        except Exception as exc:
            logger.warning("Firestore get_mother_visits fallback: %s", exc)

    history = _MEMORY_VISITS.get(mother_id, [])
    return list(reversed(history))[:limit]


def save_visit_and_update_mother(visit_doc: Dict[str, Any]) -> Dict[str, Any]:
    mother_id = visit_doc["mother_id"]
    visit_id = visit_doc["visit_id"]
    vitals = visit_doc["vitals"]

    _MEMORY_VISITS.setdefault(mother_id, []).append(visit_doc)

    # Ensure Mother exists in registry (create if evaluated via API/test directly)
    mother = get_mother(mother_id)
    if not mother:
        mother = create_mother({
            "id": mother_id,
            "name": f"Mother {mother_id}",
            "age": visit_doc.get("age", 25),
            "gestationalWeek": visit_doc.get("gestational_age_weeks") or 24,
            "bloodPressure": f"{vitals['systolic']}/{vitals['diastolic']}",
            "hemoglobin": vitals.get("hemoglobin") or 11.0,
            "weight": vitals.get("weight_kg") or 58.0,
            "fetalHeartRate": vitals.get("fetal_heart_rate") or 140,
            "bloodSugar": vitals.get("blood_sugar_mmol") or 5.4,
            "bodyTemp": vitals.get("body_temp_f") or 98.4,
            "heartRate": vitals.get("heart_rate") or 80,
        })

    today_str = datetime.now(timezone.utc).strftime("%d %b %Y")
    fe_risk = visit_doc["frontend_risk_level"]
    next_due = (datetime.now(timezone.utc) + timedelta(days=3 if fe_risk == "HIGH" else 14)).strftime("%d %b %Y")

    mother["bloodPressure"] = f"{vitals['systolic']}/{vitals['diastolic']}"
    if vitals.get("hemoglobin") is not None:
        mother["hemoglobin"] = float(vitals["hemoglobin"])
    if vitals.get("weight_kg") is not None:
        mother["weight"] = float(vitals["weight_kg"])
    if vitals.get("fetal_heart_rate") is not None:
        mother["fetalHeartRate"] = int(vitals["fetal_heart_rate"])
    mother["bloodSugar"] = float(vitals.get("blood_sugar_mmol", mother.get("bloodSugar", 5.4)))
    mother["bodyTemp"] = float(vitals.get("body_temp_f", mother.get("bodyTemp", 98.4)))
    mother["heartRate"] = int(vitals.get("heart_rate", mother.get("heartRate", 80)))
    if visit_doc.get("age"):
        mother["age"] = int(visit_doc["age"])
    if visit_doc.get("gestational_age_weeks"):
        mother["gestationalWeek"] = int(visit_doc["gestational_age_weeks"])
        mother["trimester"] = _compute_trimester(mother["gestationalWeek"])

    mother["riskLevel"] = fe_risk
    mother["urgencyScore"] = visit_doc["urgency_score"]
    mother["aiExplainability"] = visit_doc.get("ai_explainability", [])
    mother["riskReason"] = (
        mother["aiExplainability"][0]
        if mother["aiExplainability"]
        else visit_doc.get("english_summary", "ANC Assessment Completed")
    )
    mother["flags"] = visit_doc.get("risk_factors") or ["Routine ANC"]
    mother["aiHindiAdvisory"] = visit_doc.get("hindi_text", "")
    mother["aiEnglishSummary"] = visit_doc.get("english_summary", "")
    mother["audioBase64"] = visit_doc.get("audio_base64", "")
    mother["lastVisitDate"] = today_str
    mother["nextDueDate"] = next_due
    mother["isOverdue"] = False
    mother["overdueText"] = ""

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


# ==================== 108 EMERGENCY SOS DISPATCH ====================

def create_sos_dispatch(payload: Dict[str, Any]) -> Dict[str, Any]:
    dispatch_doc = {
        "dispatch_id": f"SOS-{uuid.uuid4().hex[:6].upper()}",
        "mother_id": payload["mother_id"],
        "mother_name": payload["mother_name"],
        "village": payload.get("village", "Rampura"),
        "ward": payload.get("ward", "Ward 1"),
        "blood_pressure": payload.get("blood_pressure", "140/90"),
        "emergency_reason": payload["emergency_reason"],
        "target_facility": payload["target_facility"],
        "vehicle_no": "MH-06-AZ-1108 (ALS Unit)",
        "pilot_name": "Ramesh Patil",
        "pilot_phone": "+91 98210-99887",
        "eta_minutes": 14,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _MEMORY_SOS.insert(0, dispatch_doc)

    db = get_firestore_client()
    if db is not None:
        try:
            db.collection("sos_dispatches").document(dispatch_doc["dispatch_id"]).set(dispatch_doc)
        except Exception as exc:
            logger.warning("Firestore create_sos_dispatch failed: %s", exc)
    return dispatch_doc


def list_sos_dispatches() -> List[Dict[str, Any]]:
    return _MEMORY_SOS[:20]
