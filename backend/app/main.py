import asyncio
from datetime import datetime, timezone
import logging
from typing import Optional
from dotenv import load_dotenv
from fastapi import FastAPI, File, Header, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.services.ai_services import (
    FALLBACK_MP3_BASE64,
    extract_vitals_from_bp_image,
    generate_bilingual_clinical_script,
    generate_mother_history_summary,
    synthesize_hindi_audio_base64,
)
from app.services.db import (
    fetch_mother_visit_history,
    resolve_request_with_mother_profile,
    save_visit_and_update_mother,
)
from app.services.risk_engine import evaluate_visit_risk, evaluate_visit_trend, get_protocol_entries
from app.models.schemas import (
    ClassProbabilities,
    EvaluateVisitRequest,
    EvaluateVisitResponse,
    HealthResponse,
    MotherHistorySummaryResponse,
    ScanVitalsResponse,
    TTSRequest,
    TTSResponse,
    VisitResultRecord,
)

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Maternal Health Risk & ASHA Co-Pilot Microservice",
    description="Orchestrates the 3-layer ML/Rules/Overall-Trend Risk Engine, MoHFW Clinical RAG Store, Gemini 2.5 Flash, Google Cloud TTS, and Firestore.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check() -> HealthResponse:
    """
    Validate that the Cloud Run deployment is active before the Flutter app connects.
    """
    return HealthResponse(status="active")


@app.post("/evaluate-visit", response_model=EvaluateVisitResponse, tags=["Clinical Pipeline"])
async def evaluate_visit(
    payload: EvaluateVisitRequest,
    mock: bool = Query(
        default=False,
        description="Set ?mock=true to return an instant hardcoded response for Flutter UI testing.",
    ),
    authorization: Optional[str] = Header(
        default=None,
        description="Optional Firebase Bearer token (non-blocking for MVP hackathon demo).",
    ),
) -> EvaluateVisitResponse:
    """
    Core Pipeline:
    1. Auto-lookup missing `age`, `gestational_weeks`, `asha_uid`, `phc_id` from `mothers/{motherId}` & fetch visit history concurrently.
    2. Evaluate 6 fixed UCI features in `risk_engine.py` (Random Forest + Hard Rules + Overall Multi-Visit Trend).
    3. Retrieve official MoHFW intervention protocols from `mohfw_protocols.json`.
    4. Generate bilingual English & plain-Hindi explanation + next steps via Gemini 2.5 Flash.
    5. Concurrently synthesize plain-Hindi speech (`hi-IN-Neural2-A`) AND batch-write `visits/{visitId}` + `mothers/{motherId}` in Firestore.
    """
    now_iso = datetime.now(timezone.utc).isoformat()

    if mock:
        mock_explanation_hi = "माँ का बीपी सामान्य से अधिक (142/92) है, जो उच्च रक्तचाप का संकेत है।"
        mock_next_step_hi = "माँ को 20 मिनट बाईं करवट आराम कराकर दोबारा बीपी जांचें और 24 घंटे के अंदर पीएचसी डॉक्टर को दिखाएं।"
        mock_hindi_text = f"{mock_explanation_hi} {mock_next_step_hi}"
        mock_result = VisitResultRecord(
            risk_level="high",
            risk_rank=3,
            probabilities=ClassProbabilities(low=0.05, mid=0.21, high=0.74),
            top_factors=["systolic BP", "blood sugar"],
            rule_flags=["bp_above_140_90"],
            trend_flag="bp_rising_3_visits",
            explanation_en="Blood pressure is above 140/90 mmHg with an upward trend across visits.",
            explanation_hi=mock_explanation_hi,
            next_step_en="Recheck BP after 20 minutes of rest on her left side and refer to the PHC Medical Officer within 24 hours.",
            next_step_hi=mock_next_step_hi,
            model_version="rf-v1",
            scored_at=now_iso,
        )
        return EvaluateVisitResponse(
            visit_id="visit_mock_001",
            mother_id=payload.mother_id,
            risk_level="high",
            risk_rank=3,
            urgency_score=0.74,
            reasons=[
                "Hypertension / Preeclampsia Risk",
                "Consistent Rising Blood Pressure Trend Across Visits",
            ],
            hindi_text=mock_hindi_text,
            audio_base64=FALLBACK_MP3_BASE64,
            result=mock_result,
        )

    # Step 1 (Improvements #2 & #6): Resolve mother profile & past visit history concurrently
    if len(payload.past_visits) > 0:
        enriched_payload = await asyncio.to_thread(resolve_request_with_mother_profile, payload)
        past_visits = enriched_payload.past_visits
    else:
        enriched_payload, past_visits = await asyncio.gather(
            asyncio.to_thread(resolve_request_with_mother_profile, payload),
            asyncio.to_thread(fetch_mother_visit_history, payload.mother_id),
        )

    # Step 2: Run the 3-part Risk Engine (ML + Clinical Red Flags + Overall Multi-Visit Trend)
    risk_output = evaluate_visit_risk(
        age=enriched_payload.age or 25,
        current_vitals=enriched_payload.current_vitals,
        past_visits=past_visits,
    )

    # Step 3: Retrieve exact MoHFW protocol entries from mohfw_protocols.json
    matched_protocols = get_protocol_entries(risk_output.matched_protocol_keys)

    # Step 4: Generate plain-Hindi and English explanation + next steps via Gemini 2.5 Flash
    bilingual_script = await asyncio.to_thread(
        generate_bilingual_clinical_script,
        enriched_payload.current_vitals,
        enriched_payload.gestational_weeks,
        risk_output,
        matched_protocols,
    )

    hindi_text = f"{bilingual_script['explanation_hi']} {bilingual_script['next_step_hi']}".strip()

    result_record = VisitResultRecord(
        risk_level=risk_output.risk_level,
        risk_rank=risk_output.risk_rank,
        probabilities=risk_output.probabilities,
        top_factors=risk_output.top_factors,
        rule_flags=risk_output.rule_flags,
        trend_flag=risk_output.trend_flag,
        explanation_en=bilingual_script["explanation_en"],
        explanation_hi=bilingual_script["explanation_hi"],
        next_step_en=bilingual_script["next_step_en"],
        next_step_hi=bilingual_script["next_step_hi"],
        model_version=risk_output.model_version,
        scored_at=now_iso,
    )

    # Step 5 & 6 (Improvement #6): Run Cloud TTS synthesis and Firestore batch write in parallel!
    audio_base64, visit_id = await asyncio.gather(
        asyncio.to_thread(synthesize_hindi_audio_base64, hindi_text),
        asyncio.to_thread(
            save_visit_and_update_mother,
            enriched_payload,
            result_record,
            risk_output.bp_trend,
            risk_output.urgency_score,
        ),
    )

    return EvaluateVisitResponse(
        visit_id=visit_id,
        mother_id=enriched_payload.mother_id,
        risk_level=risk_output.risk_level,
        risk_rank=risk_output.risk_rank,
        urgency_score=risk_output.urgency_score,
        reasons=risk_output.reasons,
        hindi_text=hindi_text,
        audio_base64=audio_base64,
        result=result_record,
    )


@app.post("/scan-vitals", response_model=ScanVitalsResponse, tags=["Vision OCR"])
async def scan_vitals(
    file: UploadFile = File(..., description="Uploaded photo of a digital blood pressure monitor"),
    authorization: Optional[str] = Header(
        default=None,
        description="Optional Firebase Bearer token (non-blocking for MVP hackathon demo).",
    ),
) -> ScanVitalsResponse:
    """
    Improvement #4: Extract systolic (`sys`), diastolic (`dia`), and pulse (`hr`) readings from an uploaded
    image of a digital blood pressure monitor using Gemini 2.5 Flash Vision OCR.
    """
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded image file is empty.")

    mime_type = file.content_type or "image/jpeg"
    return await asyncio.to_thread(
        extract_vitals_from_bp_image,
        image_bytes,
        mime_type,
    )


@app.post("/tts", response_model=TTSResponse, tags=["Voice Synthesis"])
async def generate_tts_on_demand(
    payload: TTSRequest,
) -> TTSResponse:
    """
    Improvement #3: On-demand Hindi audio synthesis (`hi-IN-Neural2-A`) so historical visits
    opened from Firestore can replay their `explanation_hi + next_step_hi` without storing
    large audio blobs in Firestore.
    """
    audio_base64 = await asyncio.to_thread(synthesize_hindi_audio_base64, payload.hindi_text)
    return TTSResponse(hindi_text=payload.hindi_text, audio_base64=audio_base64)


@app.get(
    "/mother-summary/{mother_id}",
    response_model=MotherHistorySummaryResponse,
    tags=["Supervisor & Mother History"],
)
async def get_mother_visit_history_summary(
    mother_id: str,
) -> MotherHistorySummaryResponse:
    """
    Improvement #5: Fetch the mother's visit history from Firestore (normal query, no vector search)
    and generate a 3-line bilingual progression summary + BP chart series for her detail page.
    """
    visits = await asyncio.to_thread(fetch_mother_visit_history, mother_id)
    if not visits:
        return MotherHistorySummaryResponse(
            mother_id=mother_id,
            total_visits_analyzed=0,
            bp_trend="stable",
            summary_en="No antenatal visits recorded yet for this mother.",
            summary_hi="इस माँ की अभी तक कोई जांच दर्ज नहीं की गई है।",
            recent_bp_series=[],
        )

    _, _, bp_trend = evaluate_visit_trend(
        current_vitals=visits[-1].vitals,
        past_visits=visits[:-1],
    )
    summary_dict = await asyncio.to_thread(
        generate_mother_history_summary,
        visits,
        bp_trend,
    )
    recent_bp_series = [
        {
            "visit_at": v.visit_at,
            "gestational_weeks": v.gestational_weeks,
            "systolic": v.vitals.systolic,
            "diastolic": v.vitals.diastolic,
        }
        for v in visits[-5:]
    ]
    return MotherHistorySummaryResponse(
        mother_id=mother_id,
        total_visits_analyzed=len(visits),
        bp_trend=bp_trend,
        summary_en=summary_dict["summary_en"],
        summary_hi=summary_dict["summary_hi"],
        recent_bp_series=recent_bp_series,
    )

