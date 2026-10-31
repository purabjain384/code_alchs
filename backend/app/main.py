import os
import uuid
from typing import Any, Dict, List

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from app.models.schemas import (  # noqa: E402
    AuthUserResponse,
    EvaluateVisitRequest,
    EvaluateVisitResponse,
    MotherCreateRequest,
    MotherRecordResponse,
    MotherSummaryResponse,
    SendOtpRequest,
    SendOtpResponse,
    TTSRequest,
    TTSResponse,
    VerifyOtpRequest,
    VisitRecordResponse,
)
from app.services.ai_services import (  # noqa: E402
    GEMINI_MODEL,
    GEMINI_TTS_MODEL,
    generate_bilingual_explanation,
    summarize_mother_history,
    synthesize_hindi_speech,
)
from app.services.db import (  # noqa: E402
    create_mother,
    create_phone_otp,
    get_mother,
    get_mother_profile,
    get_mother_visits,
    list_all_visits,
    list_mothers,
    save_visit_and_update_mother,
    update_visit_audio,
    verify_phone_otp_and_upsert_user,
)
from app.services.risk_engine import evaluate_full_risk, get_model_metadata  # noqa: E402

app = FastAPI(
    title="MatruRaksha AI — Maternal Risk Triage API",
    version="3.0.0",
    description="Project1 3-Layer RiskEngine (ML + Clinical Rules + SciPy Trend) + Gemini 3.8 Flash + Firestore",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def warmup_services():
    try:
        from app.services.db import get_firestore_client
        get_firestore_client()
        get_model_metadata()
    except Exception:
        pass


@app.get("/health")
def health_check():
    meta = get_model_metadata()
    return {
        "status": "healthy",
        "gemini_model": GEMINI_MODEL,
        "tts_model": GEMINI_TTS_MODEL,
        "ml_model_version": meta.get("model_version", "rf-v1"),
        "mothers_count": len(list_mothers()),
        "visits_count": len(list_all_visits()),
    }


@app.get("/model-meta")
def model_meta_route() -> Dict[str, Any]:
    return get_model_metadata()


# ==================== AUTHENTICATION ROUTES ====================

@app.post("/auth/send-otp", response_model=SendOtpResponse)
def send_otp_route(req: SendOtpRequest):
    otp = create_phone_otp(req.phone)
    return SendOtpResponse(
        phone=req.phone.strip(),
        otp_sent=True,
        demo_otp_hint=otp,
        message=f"Verification code generated for {req.phone.strip()}: {otp}",
    )


@app.post("/auth/verify-otp", response_model=AuthUserResponse)
def verify_otp_route(req: VerifyOtpRequest):
    try:
        user = verify_phone_otp_and_upsert_user(
            phone=req.phone,
            otp=req.otp,
            name=req.name,
            age=req.age,
            gestational_week=req.gestational_week,
            firebase_id_token=req.firebase_id_token,
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
    return create_mother(req.model_dump())


@app.get("/mothers/{mother_id}", response_model=MotherRecordResponse)
def get_single_mother_route(mother_id: str):
    mother = get_mother(mother_id)
    if not mother:
        raise HTTPException(status_code=404, detail=f"Mother {mother_id} not found")
    return mother


# ==================== CLINICAL VISIT & ML EVALUATION ROUTES ====================

@app.get("/visits", response_model=List[VisitRecordResponse])
def get_all_visits_route(limit: int = 100, mother_id: str | None = None):
    return list_all_visits(limit=limit, mother_id=mother_id)


@app.post("/evaluate-visit", response_model=EvaluateVisitResponse)
def evaluate_visit_route(req: EvaluateVisitRequest):
    profile = get_mother_profile(req.mother_id)
    age = req.age
    past_visits = get_mother_visits(req.mother_id, limit=10)

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

    visit_id = f"vis-{uuid.uuid4().hex[:10]}"

    visit_doc = {
        "visit_id": visit_id,
        "mother_id": req.mother_id,
        "mother_name": profile.get("name", f"Mother {req.mother_id}"),
        "age": age,
        "gestational_age_weeks": req.gestational_age_weeks or profile.get("gestationalWeek"),
        "vitals": req.vitals.model_dump(),
        "symptoms": req.symptoms,
        "risk_level": combined.final_risk_level,
        "frontend_risk_level": combined.frontend_risk_level,
        "risk_rank": combined.risk_rank,
        "urgency_score": combined.urgency_score,
        "probabilities": combined.probabilities,
        "top_factors": combined.top_factors,
        "rule_flags": combined.rule_flags,
        "trend_flag": combined.trend_flag,
        "systolic_slope": combined.systolic_slope,
        "diastolic_slope": combined.diastolic_slope,
        "model_version": combined.model_version,
        "risk_factors": combined.rule_flags,
        "ai_explainability": combined.ai_explainability,
        "trend_summary": combined.trend_output.trend_summary,
        "english_summary": ai_explanation["english_summary"],
        "hindi_text": ai_explanation["hindi_text"],
        "action_items_en": ai_explanation["action_items_en"],
        "action_items_hi": ai_explanation["action_items_hi"],
        "audio_base64": "",
        "timestamp": req.timestamp.isoformat(),
    }

    save_result = save_visit_and_update_mother(visit_doc)

    return EvaluateVisitResponse(
        **visit_doc,
        saved_to_firestore=save_result["saved_to_firestore"],
        mother_record=save_result["mother_record"],
    )


@app.get("/mother-summary/{mother_id}", response_model=MotherSummaryResponse)
def mother_summary_route(mother_id: str):
    mother = get_mother(mother_id)
    visits = get_mother_visits(mother_id, limit=10)
    summary = summarize_mother_history(mother_id, visits)
    latest_risk = visits[0].get("frontend_risk_level") if visits else None
    return MotherSummaryResponse(
        mother_id=mother_id,
        mother_name=mother.get("name", mother_id) if mother else mother_id,
        visits_analyzed=len(visits),
        latest_risk_level=latest_risk,
        summary_en=summary["summary_en"],
        summary_hi=summary["summary_hi"],
        visits=visits,
    )


@app.post("/tts", response_model=TTSResponse)
def tts_route(req: TTSRequest):
    audio_b64 = synthesize_hindi_speech(req.text)
    return TTSResponse(audio_base64=audio_b64, mime_type="audio/mp3")
