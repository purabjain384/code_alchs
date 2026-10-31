import os
import uuid
from typing import Any, Dict, List

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from app.models.schemas import (
    AuthUserResponse,
    DailyTaskUpdateRequest,
    EvaluateVisitRequest,
    EvaluateVisitResponse,
    MotherCreateRequest,
    MotherRecordResponse,
    MotherSummaryResponse,
    SendOtpRequest,
    SendOtpResponse,
    SosDispatchRequest,
    SosDispatchResponse,
    TTSRequest,
    TTSResponse,
    VerifyOtpRequest,
)
from app.services.ai_services import (
    GEMINI_MODEL,
    GEMINI_TTS_MODEL,
    generate_bilingual_explanation,
    summarize_mother_history,
    synthesize_hindi_speech,
)
from app.services.db import (
    create_mother,
    create_phone_otp,
    create_sos_dispatch,
    get_mother,
    get_mother_profile,
    get_mother_visits,
    list_mothers,
    list_sos_dispatches,
    save_visit_and_update_mother,
    update_mother_tasks,
    verify_phone_otp_and_upsert_user,
)
from app.services.risk_engine import evaluate_full_risk

app = FastAPI(
    title="MatruRaksha AI Clinical Surveillance & Maternal Triage API",
    version="2.0.0",
    description="3-Layer Maternal Risk Engine (UCI ML + MoHFW Protocols + Multi-Visit Trajectory) + Gemini 3.8 Flash + Firebase Auth & Firestore",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "gemini_model": GEMINI_MODEL,
        "tts_model": GEMINI_TTS_MODEL,
        "mothers_count": len(list_mothers()),
    }


# ==================== AUTHENTICATION ROUTES ====================

@app.post("/auth/send-otp", response_model=SendOtpResponse)
def send_otp_route(req: SendOtpRequest):
    otp = create_phone_otp(req.phone)
    return SendOtpResponse(
        phone=req.phone.strip(),
        otp_sent=True,
        demo_otp_hint=otp,
        message=f"OTP dispatched to {req.phone.strip()}. (Use {otp} for instant verification if Firebase SMS is not active).",
    )


@app.post("/auth/verify-otp", response_model=AuthUserResponse)
def verify_otp_route(req: VerifyOtpRequest):
    try:
        user = verify_phone_otp_and_upsert_user(
            phone=req.phone,
            otp=req.otp,
            firebase_id_token=req.firebase_id_token,
            name=req.name,
            role=req.role,
            village=req.village or "Rampura",
            ward=req.ward or "Ward 1",
            mother_id=req.mother_id,
        )
        return AuthUserResponse(**user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ==================== MOTHER REGISTRY ROUTES ====================

@app.get("/mothers", response_model=List[MotherRecordResponse])
def get_all_mothers_route():
    return list_mothers()


@app.post("/mothers", response_model=MotherRecordResponse)
def create_mother_route(req: MotherCreateRequest):
    created = create_mother(req.model_dump())
    return created


@app.post("/mothers/bulk-import", response_model=List[MotherRecordResponse])
def bulk_import_mothers_route(records: List[Dict[str, Any]]):
    """
    Allows importing rows directly from your ML training/testing dataset (CSV/JSON)
    with columns like Age, SystolicBP, DiastolicBP, BS, BodyTemp, HeartRate, or MotherRecord fields.
    """
    imported = []
    for idx, row in enumerate(records):
        sys_bp = int(row.get("SystolicBP") or row.get("systolic") or str(row.get("bloodPressure", "120/80")).split("/")[0])
        dia_bp = int(row.get("DiastolicBP") or row.get("diastolic") or str(row.get("bloodPressure", "120/80")).split("/")[-1])
        bs_val = float(row.get("BS") or row.get("bloodSugar") or row.get("blood_sugar_mmol") or 5.2)
        temp_val = float(row.get("BodyTemp") or row.get("bodyTemp") or row.get("body_temp_f") or 98.4)
        hr_val = int(row.get("HeartRate") or row.get("heartRate") or row.get("heart_rate") or 78)
        age_val = int(row.get("Age") or row.get("age") or 25)

        payload = {
            "id": row.get("id") or row.get("mother_id"),
            "name": row.get("name") or f"Dataset Mother #{idx + 1}",
            "hindiName": row.get("hindiName") or "",
            "age": age_val,
            "phone": str(row.get("phone") or ""),
            "village": row.get("village") or "Rampura",
            "ward": row.get("ward") or "Ward 1",
            "gestationalWeek": int(row.get("gestationalWeek") or 24),
            "edd": row.get("edd") or "15 Mar 2027",
            "bloodPressure": f"{sys_bp}/{dia_bp}",
            "hemoglobin": float(row.get("hemoglobin") or row.get("hb") or 11.0),
            "weight": float(row.get("weight") or 58.0),
            "fetalHeartRate": int(row.get("fetalHeartRate") or row.get("fhr") or 142),
            "bloodSugar": bs_val,
            "bodyTemp": temp_val,
            "heartRate": hr_val,
        }
        imported.append(create_mother(payload))
    return imported


@app.get("/mothers/{mother_id}", response_model=MotherRecordResponse)
def get_single_mother_route(mother_id: str):
    mother = get_mother(mother_id)
    if not mother:
        raise HTTPException(status_code=404, detail=f"Mother {mother_id} not found")
    return mother


@app.put("/mothers/{mother_id}/tasks", response_model=MotherRecordResponse)
def update_daily_tasks_route(mother_id: str, req: DailyTaskUpdateRequest):
    updated = update_mother_tasks(mother_id, [t.model_dump() for t in req.tasks])
    if not updated:
        raise HTTPException(status_code=404, detail=f"Mother {mother_id} not found")
    return updated


# ==================== CLINICAL VISIT & AI EVALUATION ROUTES ====================

@app.post("/evaluate-visit", response_model=EvaluateVisitResponse)
def evaluate_visit_route(req: EvaluateVisitRequest):
    profile = get_mother_profile(req.mother_id)
    age = req.age if req.age is not None else int(profile.get("age", 25))
    max_history = int(os.getenv("MAX_HISTORY_VISITS", "5"))
    past_visits = get_mother_visits(req.mother_id, limit=max_history)

    combined = evaluate_full_risk(
        age=age,
        vitals=req.vitals,
        symptoms=req.symptoms,
        past_visits=past_visits,
    )

    ai_explanation = generate_bilingual_explanation(
        age=age,
        vitals=req.vitals,
        symptoms=req.symptoms,
        combined_risk=combined,
    )

    audio_b64 = synthesize_hindi_speech(ai_explanation["hindi_text"])
    visit_id = f"vis-{uuid.uuid4().hex[:10]}"

    visit_doc = {
        "visit_id": visit_id,
        "mother_id": req.mother_id,
        "asha_id": req.asha_id,
        "age": age,
        "gestational_age_weeks": req.gestational_age_weeks or profile.get("gestationalWeek", 24),
        "vitals": req.vitals.model_dump(),
        "symptoms": req.symptoms,
        "risk_level": combined.final_risk_level,
        "frontend_risk_level": combined.frontend_risk_level,
        "urgency_score": combined.urgency_score,
        "risk_factors": combined.clinical_output.triggered_flags,
        "ai_explainability": combined.ai_explainability,
        "trend_summary": combined.trend_output.trend_summary,
        "english_summary": ai_explanation["english_summary"],
        "hindi_text": ai_explanation["hindi_text"],
        "action_items_en": ai_explanation["action_items_en"],
        "action_items_hi": ai_explanation["action_items_hi"],
        "audio_base64": audio_b64,
        "timestamp": req.timestamp.isoformat(),
    }

    save_result = save_visit_and_update_mother(visit_doc)

    return EvaluateVisitResponse(
        visit_id=visit_id,
        mother_id=req.mother_id,
        risk_level=combined.final_risk_level,
        frontend_risk_level=combined.frontend_risk_level,
        urgency_score=combined.urgency_score,
        risk_factors=combined.clinical_output.triggered_flags,
        ai_explainability=combined.ai_explainability,
        trend_summary=combined.trend_output.trend_summary,
        english_summary=ai_explanation["english_summary"],
        hindi_text=ai_explanation["hindi_text"],
        action_items_en=ai_explanation["action_items_en"],
        action_items_hi=ai_explanation["action_items_hi"],
        audio_base64=audio_b64,
        saved_to_firestore=save_result["saved_to_firestore"],
        mother_record=save_result["mother_record"],
    )


@app.post("/tts", response_model=TTSResponse)
def tts_route(req: TTSRequest):
    audio_b64 = synthesize_hindi_speech(req.text)
    return TTSResponse(audio_base64=audio_b64, mime_type="audio/mp3")


@app.get("/mother-summary/{mother_id}", response_model=MotherSummaryResponse)
def mother_summary_route(mother_id: str):
    visits = get_mother_visits(mother_id, limit=5)
    summary = summarize_mother_history(mother_id, visits)
    latest_risk = visits[0].get("frontend_risk_level") if visits else None
    return MotherSummaryResponse(
        mother_id=mother_id,
        visits_analyzed=len(visits),
        latest_risk_level=latest_risk,
        summary_en=summary["summary_en"],
        summary_hi=summary["summary_hi"],
        visits=visits,
    )


# ==================== 108 EMERGENCY SOS DISPATCH ROUTES ====================

@app.post("/sos-dispatch", response_model=SosDispatchResponse)
def create_sos_route(req: SosDispatchRequest):
    return create_sos_dispatch(req.model_dump())


@app.get("/sos-dispatches", response_model=List[SosDispatchResponse])
def list_sos_route():
    return list_sos_dispatches()
