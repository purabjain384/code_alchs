import json
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List

from app.models.schemas import (
    ClinicalRuleOutput,
    CombinedRiskOutput,
    MLRiskOutput,
    TrendAnalysisOutput,
    VitalsInput,
)

logger = logging.getLogger(__name__)

# Locate Project1 package (either in backend/Project1 or ../Project1)
BACKEND_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_ROOT.parent

for candidate_root in [BACKEND_ROOT, REPO_ROOT]:
    if (candidate_root / "Project1" / "src").exists():
        if str(candidate_root) not in sys.path:
            sys.path.insert(0, str(candidate_root))
        break

from Project1.src.risk_engine import RiskEngine as Project1RiskEngine  # noqa: E402
from Project1.src.rules import check_rules as project1_check_rules  # noqa: E402
from Project1.src.schemas import VitalsInput as P1VitalsInput  # noqa: E402
from Project1.src.trend import check_bp_trend as project1_check_bp_trend  # noqa: E402

_ENGINE_INSTANCE: Project1RiskEngine | None = None
_META_DICT: Dict[str, Any] = {}

FRONTEND_MAP = {"low": "LOW", "mid": "MODERATE", "high": "HIGH"}

RULE_PROTOCOLS = {
    "bp_above_160_110": {
        "flag": "bp_above_160_110",
        "condition": "Hypertensive Crisis / Severe Pre-Eclampsia (BP >= 160/110 mmHg)",
        "action_en": "Immediate referral to First Referral Unit (FRU); administer antihypertensive & MgSO4 per MoHFW protocol.",
        "action_hi": "गंभीर उच्च रक्तचाप (BP >= 160/110): तुरंत जिला अस्पताल (FRU) ले जाएं।",
    },
    "bp_above_140_90": {
        "flag": "bp_above_140_90",
        "condition": "Pre-Eclampsia / Gestational Hypertension (BP >= 140/90 mmHg)",
        "action_en": "Refer to PHC Medical Officer within 24 hours; check urine protein and monitor for danger signs.",
        "action_hi": "उच्च रक्तचाप (BP >= 140/90): प्राथमिक स्वास्थ्य केंद्र (PHC) में डॉक्टर से तुरंत जांच कराएं।",
    },
    "high_blood_sugar": {
        "flag": "high_blood_sugar",
        "condition": "Gestational Hyperglycemia (Blood Sugar >= 11.1 mmol/L)",
        "action_en": "Refer for fasting OGTT and diabetic antenatal management at PHC/CHC.",
        "action_hi": "रक्त शर्करा अधिक है: खाली पेट शुगर जांच के लिए डॉक्टर से संपर्क करें और मीठे से परहेज करें।",
    },
    "fever": {
        "flag": "fever",
        "condition": "Maternal Pyrexia / Fever (Body Temp >= 100.4 °F)",
        "action_en": "Evaluate for maternal infection, malaria, or UTI; give paracetamol and refer to PHC.",
        "action_hi": "तेज बुखार (>= 100.4 °F): संक्रमण की जांच के लिए तुरंत नजदीकी स्वास्थ्य केंद्र जाएं।",
    },
    "abnormal_heart_rate": {
        "flag": "abnormal_heart_rate",
        "condition": "Abnormal Maternal Heart Rate (< 60 or > 100 bpm)",
        "action_en": "Assess hydration, anemia, and thyroid/cardiac status after 15 minutes of rest.",
        "action_hi": "हृदय गति असामान्य है: 15 मिनट आराम के बाद दोबारा जांच करें और डॉक्टर को दिखाएं।",
    },
    "severe_anemia_hb": {
        "flag": "severe_anemia_hb",
        "condition": "Severe Maternal Anemia (Hemoglobin < 7.0 g/dL)",
        "action_en": "Urgent referral to FRU for IV Iron Sucrose / transfusion evaluation.",
        "action_hi": "गंभीर एनीमिया (हीमोग्लोबिन < 7 g/dL): तुरंत FRU अस्पताल में भर्ती कराएं।",
    },
    "moderate_anemia_hb": {
        "flag": "moderate_anemia_hb",
        "condition": "Moderate Maternal Anemia (Hemoglobin 7.0 - 9.9 g/dL)",
        "action_en": "Prescribe therapeutic double-dose IFA (1 tablet twice daily) and iron-rich diet.",
        "action_hi": "मध्यम एनीमिया: दिन में दो बार आयरन (IFA) की गोली लें और हरी पत्तेदार सब्जियां खाएं।",
    },
}


def get_project1_engine() -> Project1RiskEngine:
    global _ENGINE_INSTANCE, _META_DICT
    if _ENGINE_INSTANCE is not None:
        return _ENGINE_INSTANCE

    for candidate in [
        BACKEND_ROOT / "Project1" / "models",
        REPO_ROOT / "Project1" / "models",
    ]:
        model_file = candidate / "model.joblib"
        meta_file = candidate / "meta.json"
        if model_file.exists() and meta_file.exists():
            _ENGINE_INSTANCE = Project1RiskEngine(
                model_path=str(model_file),
                meta_path=str(meta_file),
            )
            with open(meta_file, "r", encoding="utf-8") as f:
                _META_DICT = json.load(f)
            logger.info("Loaded Project1 RiskEngine from %s", candidate)
            return _ENGINE_INSTANCE

    raise FileNotFoundError(
        "Project1/models/model.joblib not found. Run `python Project1/scripts/train_and_export.py` first."
    )


def get_model_metadata() -> Dict[str, Any]:
    get_project1_engine()
    return _META_DICT


def evaluate_full_risk(
    age: int,
    vitals: VitalsInput,
    symptoms: List[str],
    past_visits: List[Dict[str, Any]],
) -> CombinedRiskOutput:
    engine = get_project1_engine()

    # Format past visits chronologically (oldest -> newest) for trend detection
    chronological_past = list(reversed(past_visits))
    p1_history: List[Dict[str, Any]] = []
    for pv in chronological_past:
        v_dict = pv.get("vitals", pv)
        if "systolic" in v_dict and "diastolic" in v_dict:
            p1_history.append({
                "systolic": float(v_dict["systolic"]),
                "diastolic": float(v_dict["diastolic"]),
            })

    # Include the current visit as the latest point for trend evaluation
    visits_with_current = p1_history + [
        {"systolic": float(vitals.systolic), "diastolic": float(vitals.diastolic)}
    ]

    p1_vitals = P1VitalsInput(
        age=age,
        systolic=vitals.systolic,
        diastolic=vitals.diastolic,
        blood_sugar_mmol=vitals.blood_sugar_mmol,
        body_temp_f=vitals.body_temp_f,
        heart_rate=vitals.heart_rate,
    )

    risk_result = engine.predict_single(
        vitals=p1_vitals,
        visit_history=visits_with_current,
    )
    trend_detail = project1_check_bp_trend(visits_with_current)

    rule_flags = list(risk_result.rule_flags)
    final_class = risk_result.risk_level  # "low" | "mid" | "high"
    risk_rank = int(risk_result.risk_rank)

    # NHM clinical protocols: check Hemoglobin if provided
    if vitals.hemoglobin is not None:
        if vitals.hemoglobin < 7.0:
            rule_flags.append("severe_anemia_hb")
            final_class = "high"
            risk_rank = 3
        elif vitals.hemoglobin < 10.0:
            rule_flags.append("moderate_anemia_hb")
            if final_class == "low":
                final_class = "mid"
                risk_rank = max(risk_rank, 2)

    danger_symptoms = {
        "severe headache", "blurred vision", "convulsions",
        "vaginal bleeding", "severe abdominal pain", "reduced fetal movement"
    }
    matched_symptoms = [s for s in symptoms if s.lower().strip() in danger_symptoms]
    if matched_symptoms:
        rule_flags.append(f"danger_symptoms: {', '.join(matched_symptoms)}")
        final_class = "high"
        risk_rank = 3

    matched_protocols = [
        RULE_PROTOCOLS[f] for f in rule_flags if f in RULE_PROTOCOLS
    ]
    if not matched_protocols:
        matched_protocols.append({
            "flag": "routine_anc",
            "condition": "Standard Antenatal Care",
            "action_en": "Continue routine antenatal checkups, daily iron/calcium supplementation, and hydration.",
            "action_hi": "नियमित प्रसवपूर्व जांच, आयरन-कैल्शियम की गोलियां और पौष्टिक आहार जारी रखें।",
        })

    sys_slope = trend_detail.get("systolic_slope")
    dia_slope = trend_detail.get("diastolic_slope")
    trend_flag = trend_detail.get("trend_flag")

    if trend_flag == "bp_rising_3_visits":
        trend_summary = (
            f"Rising BP trend detected across 3 visits "
            f"(Systolic slope: {sys_slope:+.1f} mmHg/visit, Diastolic slope: {dia_slope:+.1f} mmHg/visit)."
        )
    elif len(visits_with_current) >= 2:
        prev = visits_with_current[-2]
        d_sys = vitals.systolic - prev["systolic"]
        d_dia = vitals.diastolic - prev["diastolic"]
        trend_summary = (
            f"Compared to previous visit ({int(prev['systolic'])}/{int(prev['diastolic'])} mmHg), "
            f"BP changed by {d_sys:+.0f}/{d_dia:+.0f} mmHg."
        )
    else:
        trend_summary = "First recorded visit for this mother (baseline established)."

    probs = risk_result.probabilities
    top_factors = risk_result.top_factors
    model_version = _META_DICT.get("model_version", risk_result.model_version)

    urgency = round(
        min(0.99, max(0.10, probs.get("high", 0.0) * 0.9 + probs.get("mid", 0.0) * 0.45 + (0.25 if rule_flags else 0.0))),
        2,
    )
    if final_class == "high":
        urgency = max(urgency, 0.85)
    elif final_class == "mid":
        urgency = max(urgency, 0.50)

    explainability = [
        f"ML Classifier ({model_version}): {final_class.upper()} risk "
        f"(Low {int(probs.get('low', 0)*100)}%, Mid {int(probs.get('mid', 0)*100)}%, High {int(probs.get('high', 0)*100)}%) — "
        f"Top driving vitals: {', '.join(top_factors)}"
    ]
    if rule_flags:
        explainability.append(f"Clinical Rule Flags Triggered: {', '.join(rule_flags)}")
    if trend_flag:
        explainability.append(f"Longitudinal Trend Alert: {trend_summary}")

    return CombinedRiskOutput(
        final_risk_level=final_class,
        frontend_risk_level=FRONTEND_MAP[final_class],
        risk_rank=risk_rank,
        urgency_score=urgency,
        probabilities=probs,
        top_factors=top_factors,
        rule_flags=rule_flags,
        trend_flag=trend_flag,
        systolic_slope=sys_slope,
        diastolic_slope=dia_slope,
        model_version=model_version,
        ml_output=MLRiskOutput(
            risk_level=final_class,
            probabilities=probs,
            top_factors=top_factors,
            model_version=model_version,
        ),
        clinical_output=ClinicalRuleOutput(
            triggered_flags=rule_flags,
            override_to_high=(final_class == "high" and bool(rule_flags)),
            override_to_mid=(final_class == "mid" and bool(rule_flags)),
            matched_protocols=matched_protocols,
        ),
        trend_output=TrendAnalysisOutput(
            trend_flag=trend_flag,
            trend_flags=[trend_flag] if trend_flag else [],
            trend_escalated=bool(trend_flag),
            trend_summary=trend_summary,
            systolic_slope=sys_slope,
            diastolic_slope=dia_slope,
        ),
        ai_explainability=explainability,
    )
