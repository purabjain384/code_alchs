import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.models.schemas import (
    EvaluateVisitRequest,
    PastVisitSummary,
    VisitResultRecord,
    VitalsInput,
)

logger = logging.getLogger(__name__)

BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent

_FIRESTORE_CLIENT: Optional[Any] = None
_FIREBASE_INIT_ATTEMPTED: bool = False

# Local in-memory fallback collections when Firebase credentials are not configured yet
_MEMORY_VISITS: Dict[str, Dict[str, Any]] = {}
_MEMORY_MOTHERS: Dict[str, Dict[str, Any]] = {}


def get_firestore_client() -> Optional[Any]:
    """Initialize Firebase Admin once and return the Firestore client, or None if offline/unconfigured."""
    global _FIRESTORE_CLIENT, _FIREBASE_INIT_ATTEMPTED
    if _FIREBASE_INIT_ATTEMPTED:
        return _FIRESTORE_CLIENT

    _FIREBASE_INIT_ATTEMPTED = True
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore

        if not firebase_admin._apps:
            cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "").strip()
            project_id = os.getenv("FIREBASE_PROJECT_ID", "").strip()
            if project_id == "your-firebase-project-id":
                project_id = ""
            options = {"projectId": project_id} if project_id else None

            candidate_cred = Path(cred_path) if cred_path else None
            if candidate_cred and not candidate_cred.is_absolute():
                candidate_cred = BACKEND_ROOT / candidate_cred

            if candidate_cred and candidate_cred.exists():
                cred = credentials.Certificate(str(candidate_cred))
                firebase_admin.initialize_app(cred, options=options)
                logger.info("Initialized Firebase Admin with service account %s", candidate_cred)
            elif os.getenv("K_SERVICE") or project_id:
                firebase_admin.initialize_app(options=options)
                logger.info("Initialized Firebase Admin with Application Default Credentials.")
            else:
                logger.info(
                    "No valid GOOGLE_APPLICATION_CREDENTIALS found. Using in-memory Firestore fallback for local dev."
                )
                return None

        _FIRESTORE_CLIENT = firestore.client()
    except Exception as exc:
        logger.warning("Firestore initialization skipped (%s). Using in-memory store.", exc)
        _FIRESTORE_CLIENT = None

    return _FIRESTORE_CLIENT


def _compute_gestational_weeks_from_lmp(lmp_date_str: Optional[str]) -> Optional[int]:
    """Improvement #2: Compute gestational weeks from mothers.lmp_date (ISO date string) if present."""
    if not lmp_date_str:
        return None
    try:
        cleaned = str(lmp_date_str).replace("Z", "+00:00")
        lmp_dt = datetime.fromisoformat(cleaned)
        if lmp_dt.tzinfo is None:
            lmp_dt = lmp_dt.replace(tzinfo=timezone.utc)
        days = (datetime.now(timezone.utc) - lmp_dt).days
        weeks = max(1, min(44, days // 7))
        return int(weeks)
    except Exception:
        return None


def fetch_mother_profile(mother_id: str) -> Dict[str, Any]:
    """
    Improvement #2: Fetch `mothers/{motherId}` from Firestore (or in-memory store)
    so `age`, `asha_uid`, `phc_id`, and `lmp_date` can be auto-filled if omitted by Flutter.
    """
    db = get_firestore_client()
    if db is not None:
        try:
            doc = db.collection("mothers").document(mother_id).get()
            if doc.exists:
                return doc.to_dict() or {}
        except Exception as exc:
            logger.warning("Firestore fetch_mother_profile failed (%s), checking in-memory store.", exc)

    return _MEMORY_MOTHERS.get(mother_id, {})


def resolve_request_with_mother_profile(payload: EvaluateVisitRequest) -> EvaluateVisitRequest:
    """
    Improvement #2: Enrich missing `age`, `gestational_weeks`, `asha_uid`, or `phc_id`
    from `mothers/{motherId}` with safe defaults so `/evaluate-visit` never fails if Flutter
    only sends `mother_id` and `current_vitals`.
    """
    profile = fetch_mother_profile(payload.mother_id)

    resolved_age = payload.age or profile.get("age") or 25
    resolved_asha = payload.asha_uid or profile.get("asha_uid") or "asha_demo_01"
    resolved_phc = payload.phc_id or profile.get("phc_id") or "phc_demo_01"
    resolved_weeks = (
        payload.gestational_weeks
        or _compute_gestational_weeks_from_lmp(profile.get("lmp_date"))
        or 28
    )

    return payload.model_copy(
        update={
            "age": int(resolved_age),
            "asha_uid": str(resolved_asha),
            "phc_id": str(resolved_phc),
            "gestational_weeks": int(resolved_weeks),
        }
    )


def _compute_next_visit_due_iso(risk_level: str, now_utc: datetime) -> str:
    """Compute next_visit_due timestamp based on risk level."""
    if risk_level == "high":
        delta = timedelta(days=2)
    elif risk_level == "mid":
        delta = timedelta(days=7)
    else:
        delta = timedelta(days=28)
    return (now_utc + delta).isoformat()


def fetch_mother_visit_history(
    mother_id: str,
    max_visits: Optional[int] = None,
) -> List[PastVisitSummary]:
    """
    Fetch the mother's complete visit history (up to `MAX_HISTORY_VISITS`, default 50)
    from Firestore (or in-memory fallback) in chronological order (oldest to newest)
    for overall pregnancy trajectory analysis.
    """
    if max_visits is None:
        max_visits = int(os.getenv("MAX_HISTORY_VISITS", "50"))

    db = get_firestore_client()
    summaries: List[PastVisitSummary] = []

    if db is not None:
        try:
            from google.cloud.firestore_v1.base_query import FieldFilter

            query = (
                db.collection("visits")
                .where(filter=FieldFilter("mother_id", "==", mother_id))
                .limit(max_visits)
            )
            docs = list(query.stream())
            raw_records = [doc.to_dict() for doc in docs if doc.exists]
            raw_records.sort(key=lambda r: str(r.get("visit_at", "")))
            for rec in raw_records:
                vitals_dict = rec.get("vitals")
                if vitals_dict:
                    summaries.append(
                        PastVisitSummary(
                            visit_at=str(rec.get("visit_at", "")),
                            gestational_weeks=rec.get("gestational_weeks"),
                            vitals=VitalsInput(**vitals_dict),
                        )
                    )
            return summaries
        except Exception as exc:
            logger.warning("Firestore fetch_mother_visit_history failed (%s), checking in-memory store.", exc)

    # In-memory fallback lookup
    mother_visits = [
        v for v in _MEMORY_VISITS.values() if v.get("mother_id") == mother_id
    ]
    mother_visits.sort(key=lambda r: str(r.get("visit_at", "")))
    for rec in mother_visits[-max_visits:]:
        vitals_dict = rec.get("vitals")
        if vitals_dict:
            summaries.append(
                PastVisitSummary(
                    visit_at=str(rec.get("visit_at", "")),
                    gestational_weeks=rec.get("gestational_weeks"),
                    vitals=VitalsInput(**vitals_dict),
                )
            )
    return summaries


def save_visit_and_update_mother(
    request: EvaluateVisitRequest,
    result_record: VisitResultRecord,
    bp_trend: str,
    urgency_score: float,
) -> str:
    """
    1. Write the complete visit record to `visits/{visitId}` with `status: "scored"`.
    2. Update the parent `mothers/{motherId}` summary fields (`latest_risk`, `risk_rank`,
       `latest_urgency_score`, `latest_visit_at`, `next_visit_due`, `bp_trend`) in one batch
       write so the Supervisor Dashboard updates immediately.
    Returns the generated `visit_id`.
    """
    now_utc = datetime.now(timezone.utc)
    now_iso = now_utc.isoformat()
    next_due_iso = _compute_next_visit_due_iso(result_record.risk_level, now_utc)
    visit_id = f"visit_{uuid.uuid4().hex[:12]}"

    visit_doc: Dict[str, Any] = {
        "mother_id": request.mother_id,
        "asha_uid": request.asha_uid or "asha_demo_01",
        "phc_id": request.phc_id or "phc_demo_01",
        "visit_at": now_iso,
        "gestational_weeks": request.gestational_weeks,
        "vitals": {
            "systolic": request.current_vitals.systolic,
            "diastolic": request.current_vitals.diastolic,
            "blood_sugar_mmol": request.current_vitals.blood_sugar_mmol,
            "body_temp_f": request.current_vitals.body_temp_f,
            "heart_rate": request.current_vitals.heart_rate,
        },
        "status": "scored",
        "result": result_record.model_dump(),
    }

    mother_summary_update: Dict[str, Any] = {
        "asha_uid": request.asha_uid or "asha_demo_01",
        "phc_id": request.phc_id or "phc_demo_01",
        "age": request.age or 25,
        "latest_risk": result_record.risk_level,
        "risk_rank": result_record.risk_rank,
        "latest_urgency_score": urgency_score,
        "latest_visit_at": now_iso,
        "next_visit_due": next_due_iso,
        "bp_trend": bp_trend,
    }

    db = get_firestore_client()
    if db is not None:
        try:
            batch = db.batch()
            visit_ref = db.collection("visits").document(visit_id)
            mother_ref = db.collection("mothers").document(request.mother_id)
            batch.set(visit_ref, visit_doc)
            batch.set(mother_ref, mother_summary_update, merge=True)
            batch.commit()
            logger.info(
                "Saved visit %s and updated mother %s in Firestore.",
                visit_id,
                request.mother_id,
            )
            return visit_id
        except Exception as exc:
            logger.warning("Firestore batch write failed (%s). Saving to in-memory store.", exc)

    # Save to local in-memory store
    _MEMORY_VISITS[visit_id] = visit_doc
    existing_mother = _MEMORY_MOTHERS.get(request.mother_id, {})
    existing_mother.update(mother_summary_update)
    _MEMORY_MOTHERS[request.mother_id] = existing_mother
    return visit_id

