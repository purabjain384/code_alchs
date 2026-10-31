import base64
import json
import logging
import os
from typing import Any, Dict, List

from app.models.schemas import CombinedRiskOutput, VitalsInput

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
GEMINI_TTS_MODEL = os.getenv("GEMINI_TTS_MODEL", "gemini-3.8-flash")
USE_MOCK_AI = os.getenv("USE_MOCK_AI", "true").lower() == "true"

# Valid silent MP3 frame for offline/test mode
MOCK_MP3_BASE64 = (
    "//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA"
    "gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA"
)


def _get_genai_client():
    if USE_MOCK_AI or not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
        return None
    try:
        from google import genai
        return genai.Client(api_key=GEMINI_API_KEY)
    except Exception as exc:
        logger.warning("Could not initialize google-genai client: %s", exc)
        return None


def generate_bilingual_explanation(
    age: int,
    vitals: VitalsInput,
    symptoms: List[str],
    combined_risk: CombinedRiskOutput,
) -> Dict[str, Any]:
    """
    Uses gemini-3.8-flash to synthesize a bilingual (English + Simple Hindi) explanation
    grounded strictly in the matched MoHFW protocols and multi-visit trajectory analysis.
    """
    protocols = combined_risk.clinical_output.matched_protocols
    action_items_en = [p["action_en"] for p in protocols]
    action_items_hi = [p["action_hi"] for p in protocols]

    client = _get_genai_client()
    if client is not None:
        try:
            from google.genai import types
            prompt = f"""
You are a Clinical Decision Support AI assisting a rural Indian ASHA health worker under National Health Mission (MoHFW) guidelines.
Analyze this pregnant mother's ANC checkup:
- Age: {age} years
- Vitals: BP {vitals.systolic}/{vitals.diastolic} mmHg, Hemoglobin {vitals.hemoglobin} g/dL, Weight {vitals.weight_kg} kg, Fetal Heart Rate {vitals.fetal_heart_rate} bpm, Fetal Movement {vitals.fetal_movement}, Blood Sugar {vitals.blood_sugar_mmol} mmol/L, Body Temp {vitals.body_temp_f} °F, Maternal Heart Rate {vitals.heart_rate} bpm
- Symptoms: {', '.join(symptoms) if symptoms else 'None'}
- Final Triage Risk Level: {combined_risk.frontend_risk_level} (Urgency: {combined_risk.urgency_score})
- Triggered Clinical Flags: {combined_risk.clinical_output.triggered_flags}
- Multi-Visit Trajectory: {combined_risk.trend_output.trend_summary}
- Official MoHFW Protocols to follow: {json.dumps(protocols, ensure_ascii=False)}

Return ONLY valid JSON with keys:
- "english_summary": 2-3 concise sentences for the ASHA worker and PHC doctor explaining the risk and trajectory.
- "hindi_text": 2-3 warm, clear sentences in simple conversational Hindi (Devanagari script) to be spoken aloud to the mother and ASHA worker.
- "action_items_en": array of 2-3 specific English action items.
- "action_items_hi": array of 2-3 specific Hindi action items.
"""
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2,
                ),
            )
            parsed = json.loads(response.text)
            return {
                "english_summary": parsed.get("english_summary", ""),
                "hindi_text": parsed.get("hindi_text", ""),
                "action_items_en": parsed.get("action_items_en", action_items_en),
                "action_items_hi": parsed.get("action_items_hi", action_items_hi),
            }
        except Exception as exc:
            logger.warning("Gemini 3.8 Flash explanation fallback triggered: %s", exc)

    # Grounded deterministic fallback
    flags_str = ", ".join(combined_risk.clinical_output.triggered_flags) or "normal vitals"
    english_summary = (
        f"Triage Level: {combined_risk.frontend_risk_level} (Urgency {int(combined_risk.urgency_score * 100)}%). "
        f"Key clinical findings: {flags_str}. {combined_risk.trend_output.trend_summary} "
        f"{action_items_en[0]}"
    )
    hindi_text = (
        f"नमस्ते बहनजी, आज की जांच में आपका ब्लड प्रेशर {vitals.systolic}/{vitals.diastolic} और हीमोग्लोबिन {vitals.hemoglobin or 11.0} ग्राम है। "
        f"{' '.join(action_items_hi[:2])}"
    )
    return {
        "english_summary": english_summary,
        "hindi_text": hindi_text,
        "action_items_en": action_items_en,
        "action_items_hi": action_items_hi,
    }


def synthesize_hindi_speech(hindi_text: str) -> str:
    """
    Synthesizes Hindi audio (base64 MP3) using gemini-3.8-flash Native Audio output,
    with fallback to Google Cloud TTS (hi-IN-Neural2-A) and offline mock MP3 frame.
    """
    client = _get_genai_client()
    if client is not None:
        try:
            from google.genai import types
            response = client.models.generate_content(
                model=GEMINI_TTS_MODEL,
                contents=f"Read this maternal health advisory warmly and clearly in Hindi: {hindi_text}",
                config=types.GenerateContentConfig(
                    response_modalities=["AUDIO"],
                ),
            )
            for candidate in getattr(response, "candidates", []):
                for part in getattr(candidate.content, "parts", []):
                    inline_data = getattr(part, "inline_data", None)
                    if inline_data and getattr(inline_data, "data", None):
                        raw_bytes = inline_data.data
                        if isinstance(raw_bytes, bytes):
                            return base64.b64encode(raw_bytes).decode("utf-8")
                        if isinstance(raw_bytes, str):
                            return raw_bytes
        except Exception as exc:
            logger.warning("Gemini 3.8 Flash native TTS fallback to Cloud TTS: %s", exc)

        try:
            from google.cloud import texttospeech
            tts_client = texttospeech.TextToSpeechClient()
            synthesis_input = texttospeech.SynthesisInput(text=hindi_text)
            voice = texttospeech.VoiceSelectionParams(
                language_code="hi-IN",
                name="hi-IN-Neural2-A",
            )
            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3,
                speaking_rate=0.95,
            )
            tts_response = tts_client.synthesize_speech(
                input=synthesis_input, voice=voice, audio_config=audio_config
            )
            return base64.b64encode(tts_response.audio_content).decode("utf-8")
        except Exception as exc:
            logger.warning("Cloud TTS fallback to mock audio frame: %s", exc)

    return MOCK_MP3_BASE64


def summarize_mother_history(mother_id: str, visits: List[Dict[str, Any]]) -> Dict[str, str]:
    """
    Generates a 3-line bilingual progression summary across the mother's last up to 5 visits.
    """
    if not visits:
        return {
            "summary_en": f"No clinical ANC visits recorded yet for mother {mother_id}.",
            "summary_hi": f"माता {mother_id} के लिए अभी तक कोई जांच दर्ज नहीं की गई है।",
        }

    client = _get_genai_client()
    if client is not None:
        try:
            from google.genai import types
            prompt = f"""
Summarize the last {len(visits)} antenatal checkups for Mother ID {mother_id} in exactly 3 concise lines in English and 3 lines in Hindi.
Visits (newest first): {json.dumps(visits, default=str, ensure_ascii=False)}
Return ONLY JSON with keys "summary_en" and "summary_hi".
"""
            res = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2,
                ),
            )
            parsed = json.loads(res.text)
            return {
                "summary_en": parsed.get("summary_en", ""),
                "summary_hi": parsed.get("summary_hi", ""),
            }
        except Exception as exc:
            logger.warning("Gemini history summary fallback: %s", exc)

    latest = visits[0]
    oldest = visits[-1]
    l_v = latest.get("vitals", {})
    o_v = oldest.get("vitals", {})
    summary_en = (
        f"1. Analyzed {len(visits)} recorded ANC visit(s) for Mother {mother_id}; latest triage status is {str(latest.get('frontend_risk_level', latest.get('risk_level', 'LOW'))).upper()}.\n"
        f"2. Blood pressure progressed from {o_v.get('systolic', 120)}/{o_v.get('diastolic', 80)} mmHg to {l_v.get('systolic', 120)}/{l_v.get('diastolic', 80)} mmHg (Hb: {l_v.get('hemoglobin', 11.0)} g/dL, Sugar: {l_v.get('blood_sugar_mmol', 5.2)} mmol/L).\n"
        f"3. Trajectory Assessment: {latest.get('trend_summary', 'Baseline visit recorded.')}"
    )
    summary_hi = (
        f"1. माता {mother_id} की कुल {len(visits)} जांचों का विश्लेषण किया गया; वर्तमान जोखिम स्तर '{str(latest.get('frontend_risk_level', 'LOW')).upper()}' है।\n"
        f"2. ब्लड प्रेशर {o_v.get('systolic', 120)}/{o_v.get('diastolic', 80)} से बदलकर {l_v.get('systolic', 120)}/{l_v.get('diastolic', 80)} mmHg और हीमोग्लोबिन {l_v.get('hemoglobin', 11.0)} g/dL रहा।\n"
        f"3. सलाह: {latest.get('hindi_text', 'नियमित जांच और आयरन-कैल्शियम की गोलियां जारी रखें।')}"
    )
    return {"summary_en": summary_en, "summary_hi": summary_hi}
