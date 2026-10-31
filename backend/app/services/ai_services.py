import base64
import json
import logging
import os
from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from app.models.schemas import (
    CombinedRiskOutput,
    PastVisitSummary,
    ScanVitalsResponse,
    VitalsInput,
)

logger = logging.getLogger(__name__)

# Minimal valid MP3 frame in base64 used as a safe offline fallback when credentials are not present
FALLBACK_MP3_BASE64 = (
    "//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA"
    "gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA"
    "gICAgICAgICAgICAgICAgICAgICAgICAgICAgICA//uQZAAAAAAA"
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
)


class GeminiBilingualOutput(BaseModel):
    """Structured JSON schema enforced on Gemini 3.8 Flash output."""

    explanation_en: str
    explanation_hi: str
    next_step_en: str
    next_step_hi: str


class GeminiHistorySummaryOutput(BaseModel):
    """Structured JSON schema for the 3-line visit history summary."""

    summary_en: str
    summary_hi: str


def _get_gemini_model() -> str:
    """Return the active Gemini model ID (defaults to gemini-3.8-flash)."""
    return os.getenv("GEMINI_MODEL", "gemini-3.8-flash").strip() or "gemini-3.8-flash"


def _get_gemini_tts_model() -> str:
    """Return the active Gemini TTS / Audio model ID (defaults to gemini-3.8-flash)."""
    return os.getenv("GEMINI_TTS_MODEL", _get_gemini_model()).strip() or "gemini-3.8-flash"


def _build_deterministic_fallback(
    matched_protocols: List[Dict[str, Any]],
) -> Dict[str, str]:
    """Build a reliable bilingual explanation directly from mohfw_protocols.json."""
    primary = matched_protocols[0]
    if len(matched_protocols) > 1:
        secondary = matched_protocols[1]
        explanation_en = f"{primary['clinical_reason_en']} Additionally, {secondary['clinical_reason_en'].lower()}"
        explanation_hi = f"{primary['clinical_reason_hi']} साथ ही, {secondary['clinical_reason_hi']}"
    else:
        explanation_en = primary["clinical_reason_en"]
        explanation_hi = primary["clinical_reason_hi"]

    return {
        "explanation_en": explanation_en,
        "explanation_hi": explanation_hi,
        "next_step_en": primary["next_step_en"],
        "next_step_hi": primary["next_step_hi"],
    }


def generate_bilingual_clinical_script(
    vitals: VitalsInput,
    gestational_weeks: Optional[int],
    risk_output: CombinedRiskOutput,
    matched_protocols: List[Dict[str, Any]],
) -> Dict[str, str]:
    """
    Call Gemini 3.8 Flash (`google-genai`) with the structured risk assessment and
    matched MoHFW protocols to produce plain-English and conversational plain-Hindi
    explanations and next steps.
    NOTE: Never sends mother's name, phone, or mother_id.
    """
    use_mock = os.getenv("USE_MOCK_AI", "false").lower() == "true"
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    model_id = _get_gemini_model()

    if use_mock or not api_key or api_key == "your_gemini_api_key_here":
        logger.info("Using deterministic MoHFW bilingual protocol text (GEMINI_API_KEY not active or mock mode).")
        return _build_deterministic_fallback(matched_protocols)

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)

        sanitized_context = {
            "gestational_weeks": gestational_weeks,
            "vitals": {
                "systolic_mmhg": vitals.systolic,
                "diastolic_mmhg": vitals.diastolic,
                "blood_sugar_mmol_l": vitals.blood_sugar_mmol,
                "body_temp_f": vitals.body_temp_f,
                "heart_rate_bpm": vitals.heart_rate,
            },
            "risk_level": risk_output.risk_level,
            "top_factors": risk_output.top_factors,
            "rule_flags": risk_output.rule_flags,
            "trend_flag": risk_output.trend_flag,
            "bp_trend": risk_output.bp_trend,
            "official_mohfw_protocols": [
                {
                    "condition_name": p["condition_name"],
                    "clinical_reason_en": p["clinical_reason_en"],
                    "next_step_en": p["next_step_en"],
                    "action_steps_en": p["action_steps_en"],
                }
                for p in matched_protocols
            ],
        }

        system_instruction = (
            "You are a clinical decision-support assistant for frontline rural ASHA health workers in India. "
            "Based ONLY on the provided vitals, risk flags, and official MoHFW protocols, generate a JSON object with: "
            "1. 'explanation_en': One clear sentence in English explaining the clinical reason for the risk level. "
            "2. 'explanation_hi': One simple, conversational sentence in Devanagari Hindi explaining the clinical reason WITHOUT medical jargon. "
            "3. 'next_step_en': One clear sentence in English stating the exact action step from the provided MoHFW protocols. "
            "4. 'next_step_hi': One simple, conversational sentence in Devanagari Hindi telling the ASHA worker the exact action step to take right now. "
            "Never invent medications or procedures outside the provided MoHFW protocols."
        )

        response = client.models.generate_content(
            model=model_id,
            contents=json.dumps(sanitized_context, ensure_ascii=False),
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=GeminiBilingualOutput,
                temperature=0.1,
            ),
        )

        parsed = json.loads(response.text)
        return {
            "explanation_en": parsed["explanation_en"].strip(),
            "explanation_hi": parsed["explanation_hi"].strip(),
            "next_step_en": parsed["next_step_en"].strip(),
            "next_step_hi": parsed["next_step_hi"].strip(),
        }
    except Exception as exc:
        logger.warning(
            "Gemini (%s) call failed (%s). Falling back to static MoHFW Hindi/English protocol.",
            model_id,
            exc,
        )
        return _build_deterministic_fallback(matched_protocols)


def synthesize_hindi_audio_base64(hindi_text: str) -> str:
    """
    Convert the plain-Hindi clinical script into base64-encoded audio:
    1. Primary: Uses Gemini 3.8 Flash (`GEMINI_TTS_MODEL`, default `gemini-3.8-flash`) native audio output
       modality via `google-genai` when `GEMINI_API_KEY` is configured.
    2. Secondary: Falls back to Google Cloud Text-to-Speech (`hi-IN-Neural2-A`) if configured.
    3. Offline Fallback: Returns a valid minimal MP3 base64 string for local dev/testing.
    """
    use_mock = os.getenv("USE_MOCK_AI", "false").lower() == "true"
    if use_mock:
        return FALLBACK_MP3_BASE64

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    tts_model_id = _get_gemini_tts_model()

    # 1. Try Gemini 3.8 Flash Native Audio / TTS Generation first
    if api_key and api_key != "your_gemini_api_key_here":
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=tts_model_id,
                contents=f"Read the following Hindi guidance aloud clearly and warmly for an ASHA health worker: {hindi_text}",
                config=types.GenerateContentConfig(
                    response_modalities=["AUDIO"],
                    speech_config=types.SpeechConfig(
                        voice_config=types.VoiceConfig(
                            prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                voice_name="Kore"
                            )
                        )
                    ),
                ),
            )
            for candidate in getattr(response, "candidates", []) or []:
                content = getattr(candidate, "content", None)
                for part in getattr(content, "parts", []) or []:
                    inline_data = getattr(part, "inline_data", None)
                    if inline_data and getattr(inline_data, "data", None):
                        raw_bytes = inline_data.data
                        if isinstance(raw_bytes, bytes):
                            return base64.b64encode(raw_bytes).decode("utf-8")
                        if isinstance(raw_bytes, str):
                            return raw_bytes
        except Exception as exc:
            logger.warning(
                "Gemini (%s) audio synthesis skipped/failed (%s). Trying Google Cloud TTS fallback.",
                tts_model_id,
                exc,
            )

    # 2. Secondary Fallback: Google Cloud Text-to-Speech (`hi-IN-Neural2-A`)
    try:
        from google.cloud import texttospeech

        client = texttospeech.TextToSpeechClient()
        synthesis_input = texttospeech.SynthesisInput(text=hindi_text)
        voice = texttospeech.VoiceSelectionParams(
            language_code="hi-IN",
            name="hi-IN-Neural2-A",
        )
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=0.95,
        )
        response = client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config,
        )
        return base64.b64encode(response.audio_content).decode("utf-8")
    except Exception as exc:
        logger.warning(
            "Cloud TTS unavailable (%s). Returning valid fallback base64 MP3.",
            exc,
        )
        return FALLBACK_MP3_BASE64


def extract_vitals_from_bp_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> ScanVitalsResponse:
    """
    Improvement #4: Pass the uploaded blood pressure monitor image bytes to Gemini 3.8 Flash
    with a strict system instruction. If the image is blurry or not a BP monitor, returns
    safe fallback integers with `is_valid_device=False` and a clear `confidence_note` instead of crashing.
    """
    use_mock = os.getenv("USE_MOCK_AI", "false").lower() == "true"
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    model_id = _get_gemini_model()

    if use_mock or not api_key or api_key == "your_gemini_api_key_here":
        logger.info("Using mock OCR vitals response (GEMINI_API_KEY not active or mock mode).")
        return ScanVitalsResponse(sys=136, dia=86, hr=82, is_valid_device=True, confidence_note=None)

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        system_instruction = (
            "You are a precision medical device OCR engine. Read the digital blood pressure monitor screen in the image "
            "and extract the integer values for Systolic BP (sys), Diastolic BP (dia), and Pulse/Heart Rate (hr). "
            "If the image is clearly a readable BP monitor, set is_valid_device=true and confidence_note=null. "
            "If the image is blurry or not a BP monitor, set is_valid_device=false, set sys=120, dia=80, hr=75 as placeholders, "
            "and explain why in confidence_note."
        )

        image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
        response = client.models.generate_content(
            model=model_id,
            contents=[image_part, "Extract sys, dia, hr, is_valid_device, and confidence_note from this image."],
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=ScanVitalsResponse,
                temperature=0.0,
            ),
        )

        data = json.loads(response.text)
        return ScanVitalsResponse(
            sys=int(data.get("sys", 120)),
            dia=int(data.get("dia", 80)),
            hr=int(data.get("hr", 75)),
            is_valid_device=bool(data.get("is_valid_device", True)),
            confidence_note=data.get("confidence_note"),
        )
    except Exception as exc:
        logger.warning("Vision OCR fallback triggered on %s (%s).", model_id, exc)
        return ScanVitalsResponse(
            sys=136,
            dia=86,
            hr=82,
            is_valid_device=False,
            confidence_note="Could not clearly read BP monitor screen; please verify numbers manually.",
        )


def generate_mother_history_summary(
    visits: List[PastVisitSummary],
    bp_trend: str,
) -> Dict[str, str]:
    """
    Improvement #5: Generate a 3-line bilingual summary of the mother's recent visits
    (up to last 5 visits) for the Mother Detail / Supervisor Dashboard view using Gemini 3.8 Flash.
    Never sends mother's name, phone, or ID.
    """
    if not visits:
        return {
            "summary_en": "No antenatal visits recorded yet for this mother.",
            "summary_hi": "इस माँ की अभी तक कोई जांच दर्ज नहीं की गई है।",
        }

    recent = visits[-5:]
    first_v = recent[0].vitals
    last_v = recent[-1].vitals

    fallback_en = (
        f"Across {len(recent)} recorded visit(s), BP moved from {first_v.systolic}/{first_v.diastolic} "
        f"to {last_v.systolic}/{last_v.diastolic} mmHg (overall {bp_trend} trend). "
        f"Latest blood sugar is {last_v.blood_sugar_mmol} mmol/L and heart rate is {last_v.heart_rate} bpm."
    )
    fallback_hi = (
        f"पिछली {len(recent)} जांचों में माँ का बीपी {first_v.systolic}/{first_v.diastolic} से "
        f"{last_v.systolic}/{last_v.diastolic} mmHg रहा है ({'बढ़ता हुआ' if bp_trend == 'rising' else 'स्थिर'} रुझान)। "
        f"ताजा ब्लड शुगर {last_v.blood_sugar_mmol} mmol/L और धड़कन {last_v.heart_rate} bpm है।"
    )

    use_mock = os.getenv("USE_MOCK_AI", "false").lower() == "true"
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    model_id = _get_gemini_model()
    if use_mock or not api_key or api_key == "your_gemini_api_key_here":
        return {"summary_en": fallback_en, "summary_hi": fallback_hi}

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        history_payload = [
            {
                "visit_at": v.visit_at,
                "gestational_weeks": v.gestational_weeks,
                "systolic": v.vitals.systolic,
                "diastolic": v.vitals.diastolic,
                "blood_sugar_mmol": v.vitals.blood_sugar_mmol,
                "body_temp_f": v.vitals.body_temp_f,
                "heart_rate": v.vitals.heart_rate,
            }
            for v in recent
        ]
        response = client.models.generate_content(
            model=model_id,
            contents=json.dumps({"bp_trend": bp_trend, "last_visits": history_payload}),
            config=types.GenerateContentConfig(
                system_instruction=(
                    "Summarize this mother's last antenatal visits in 2-3 concise sentences in English (summary_en) "
                    "and simple Devanagari Hindi (summary_hi) for a PHC supervisor and ASHA worker. Focus on BP and sugar progression."
                ),
                response_mime_type="application/json",
                response_schema=GeminiHistorySummaryOutput,
                temperature=0.1,
            ),
        )
        parsed = json.loads(response.text)
        return {
            "summary_en": parsed["summary_en"].strip(),
            "summary_hi": parsed["summary_hi"].strip(),
        }
    except Exception as exc:
        logger.warning("Gemini (%s) history summary fallback (%s).", model_id, exc)
        return {"summary_en": fallback_en, "summary_hi": fallback_hi}
