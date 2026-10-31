import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Literal

import joblib
import numpy as np

from app.models.schemas import (
    ClinicalRuleOutput,
    CombinedRiskOutput,
    MLRiskOutput,
    TrendAnalysisOutput,
    VitalsInput,
)

logger = logging.getLogger(__name__)

PROTOCOLS_PATH = Path(__file__).resolve().parent.parent / "data" / "mohfw_protocols.json"
with open(PROTOCOLS_PATH, "r", encoding="utf-8") as f:
    MOHFW_PROTOCOLS: Dict[str, dict] = json.load(f)

MODEL_PATH = os.getenv("MODEL_PATH", "rf_model.joblib")
_RF_MODEL = None

if os.path.exists(MODEL_PATH):
    try:
        _RF_MODEL = joblib.load(MODEL_PATH)
        logger.info("Loaded Random Forest model from %s", MODEL_PATH)
    except Exception as exc:
        logger.warning("Failed to load %s (%s). Using clinical heuristic fallback.", MODEL_PATH, exc)


def map_to_frontend_risk(level: Literal["low", "mid", "high"]) -> Literal["LOW", "MODERATE", "HIGH"]:
    if level == "high":
        return "HIGH"
    if level == "mid":
        return "MODERATE"
    return "LOW"


def predict_ml_risk(age: int, vitals: VitalsInput) -> MLRiskOutput:
    """
    Layer 1: 6-Feature UCI Maternal Health Risk ML Adapter
    Exact feature vector order: [Age, SystolicBP, DiastolicBP, BS, BodyTemp, HeartRate]
    """
    features = np.array(
        [[
            float(age),
            float(vitals.systolic),
            float(vitals.diastolic),
            float(vitals.blood_sugar_mmol),
            float(vitals.body_temp_f),
            float(vitals.heart_rate),
        ]],
        dtype=float,
    )

    if _RF_MODEL is not None:
        try:
            pred = _RF_MODEL.predict(features)[0]
            label_map = {0: "low", 1: "mid", 2: "high", "low risk": "low", "mid risk": "mid", "high risk": "high"}
            risk_level = label_map.get(str(pred).lower() if isinstance(pred, str) else pred, "mid")
            probs = {"low": 0.2, "mid": 0.3, "high": 0.5}
            if hasattr(_RF_MODEL, "predict_proba"):
                raw_probs = _RF_MODEL.predict_proba(features)[0]
                if len(raw_probs) == 3:
                    probs = {
                        "low": round(float(raw_probs[0]), 3),
                        "mid": round(float(raw_probs[1]), 3),
                        "high": round(float(raw_probs[2]), 3),
                    }
            return MLRiskOutput(risk_level=risk_level, probabilities=probs)
        except Exception as exc:
            logger.warning("RF model inference failed (%s), falling back to calibrated scorer.", exc)

    # Calibrated UCI-aligned fallback scorer when rf_model.joblib is not yet dropped in
    score = 0.0
    if vitals.systolic >= 140 or vitals.diastolic >= 90:
        score += 0.55
    elif vitals.systolic >= 130 or vitals.diastolic >= 85:
        score += 0.30

    if vitals.blood_sugar_mmol >= 7.8:
        score += 0.35
    elif vitals.blood_sugar_mmol >= 6.7:
        score += 0.20

    if vitals.body_temp_f >= 100.4:
        score += 0.35
    if vitals.heart_rate >= 100 or vitals.heart_rate < 60:
        score += 0.20
    if age < 19 or age >= 35:
        score += 0.15

    high_p = min(0.95, round(score, 2))
    if high_p >= 0.50:
        return MLRiskOutput(
            risk_level="high",
            probabilities={"low": round(max(0.02, 1.0 - high_p - 0.15), 2), "mid": 0.15, "high": high_p},
        )
    if high_p >= 0.25:
        return MLRiskOutput(
            risk_level="mid",
            probabilities={"low": 0.25, "mid": 0.55, "high": 0.20},
        )
    return MLRiskOutput(
        risk_level="low",
        probabilities={"low": 0.82, "mid": 0.13, "high": 0.05},
    )


def evaluate_clinical_rules(age: int, vitals: VitalsInput, symptoms: List[str]) -> ClinicalRuleOutput:
    """
    Layer 2: Deterministic MoHFW & NHM Clinical Red-Flag Rules
    """
    flags: List[str] = []
    protocols: List[dict] = []
    override_high = False
    override_mid = False

    if vitals.systolic >= 140 or vitals.diastolic >= 90:
        flags.append("severe_hypertension_bp")
        protocols.append(MOHFW_PROTOCOLS["severe_hypertension_bp"])
        override_high = True

    if vitals.blood_sugar_mmol >= 7.8:
        flags.append("severe_hyperglycemia_bs")
        protocols.append(MOHFW_PROTOCOLS["severe_hyperglycemia_bs"])
        override_high = True

    if vitals.body_temp_f >= 100.4:
        flags.append("maternal_fever_temp")
        protocols.append(MOHFW_PROTOCOLS["maternal_fever_temp"])
        override_high = True

    if vitals.heart_rate >= 100 or vitals.heart_rate < 60:
        flags.append("maternal_tachycardia_hr")
        protocols.append(MOHFW_PROTOCOLS["maternal_tachycardia_hr"])
        if vitals.heart_rate >= 110 or vitals.heart_rate < 55:
            override_high = True
        else:
            override_mid = True

    # NHM Hemoglobin (Anemia) checks
    if vitals.hemoglobin is not None:
        if vitals.hemoglobin < 9.0:
            flags.append("severe_anemia_hb")
            protocols.append(MOHFW_PROTOCOLS["severe_anemia_hb"])
            override_high = True
        elif vitals.hemoglobin < 11.0:
            flags.append("moderate_anemia_hb")
            protocols.append(MOHFW_PROTOCOLS["moderate_anemia_hb"])
            override_mid = True

    # NHM Fetal Heart Rate & Fetal Movement checks
    fhr_abnormal = vitals.fetal_heart_rate is not None and (
        vitals.fetal_heart_rate < 110 or vitals.fetal_heart_rate > 160
    )
    movement_abnormal = (vitals.fetal_movement or "Normal") in ("Reduced", "Absent")
    if fhr_abnormal or movement_abnormal:
        flags.append("fetal_distress_alert")
        protocols.append(MOHFW_PROTOCOLS["fetal_distress_alert"])
        override_high = True

    if age < 19 or age >= 35:
        flags.append("high_risk_maternal_age")
        protocols.append(MOHFW_PROTOCOLS["high_risk_maternal_age"])
        override_mid = True

    danger_symptoms = {"bleeding", "severe headache", "blurred vision", "convulsions", "swelling", "reduced fetal movement"}
    matched_symptoms = [s for s in symptoms if s.lower().strip() in danger_symptoms]
    if matched_symptoms:
        flags.append("danger_symptoms_reported")
        if "severe_hypertension_bp" not in flags:
            protocols.append(MOHFW_PROTOCOLS["severe_hypertension_bp"])
        override_high = True

    if not protocols:
        protocols.append(MOHFW_PROTOCOLS["routine_anc_care"])

    return ClinicalRuleOutput(
        triggered_flags=flags,
        override_to_high=override_high,
        override_to_mid=override_mid,
        matched_protocols=protocols,
    )


def evaluate_visit_trend(current_vitals: VitalsInput, past_visits: List[Dict[str, Any]]) -> TrendAnalysisOutput:
    """
    Layer 3: Dynamic Multi-Visit Longitudinal Trajectory Analyzer
    """
    if not past_visits:
        return TrendAnalysisOutput(
            trend_flags=[],
            trend_escalated=False,
            trend_summary="First recorded visit for this mother (baseline established).",
            delta_details={},
        )

    chronological = list(reversed(past_visits))
    oldest_vitals = chronological[0].get("vitals", {})
    prev_vitals = chronological[-1].get("vitals", {})

    base_sys = float(oldest_vitals.get("systolic", current_vitals.systolic))
    base_dia = float(oldest_vitals.get("diastolic", current_vitals.diastolic))
    base_bs = float(oldest_vitals.get("blood_sugar_mmol", current_vitals.blood_sugar_mmol))

    prev_sys = float(prev_vitals.get("systolic", current_vitals.systolic))
    prev_dia = float(prev_vitals.get("diastolic", current_vitals.diastolic))

    sys_delta_total = round(current_vitals.systolic - base_sys, 1)
    dia_delta_total = round(current_vitals.diastolic - base_dia, 1)
    bs_delta_total = round(current_vitals.blood_sugar_mmol - base_bs, 2)
    sys_delta_last = round(current_vitals.systolic - prev_sys, 1)
    dia_delta_last = round(current_vitals.diastolic - prev_dia, 1)

    trend_flags: List[str] = []
    escalated = False
    summaries: List[str] = []

    if sys_delta_total >= 15.0 or dia_delta_total >= 10.0 or sys_delta_last >= 15.0 or dia_delta_last >= 10.0:
        trend_flags.append("rising_bp_trend")
        escalated = True
        summaries.append(
            f"Rising BP trajectory detected (+{int(max(sys_delta_total, sys_delta_last))}/+{int(max(dia_delta_total, dia_delta_last))} mmHg across {len(past_visits) + 1} visits)."
        )

    if bs_delta_total >= 1.2:
        trend_flags.append("rising_glucose_trend")
        escalated = True
        summaries.append(f"Rising blood glucose trend (+{bs_delta_total} mmol/L over recent visits).")

    if not summaries:
        summaries.append(
            f"Vitals trajectory stable across {len(past_visits) + 1} visits (BP delta {sys_delta_last:+.0f}/{dia_delta_last:+.0f} mmHg vs previous visit)."
        )

    return TrendAnalysisOutput(
        trend_flags=trend_flags,
        trend_escalated=escalated,
        trend_summary=" ".join(summaries),
        delta_details={
            "sys_delta_total": sys_delta_total,
            "dia_delta_total": dia_delta_total,
            "bs_delta_total": bs_delta_total,
        },
    )


def build_explainability_badges(
    age: int,
    vitals: VitalsInput,
    clinical: ClinicalRuleOutput,
    trend: TrendAnalysisOutput,
    ml_out: MLRiskOutput,
) -> List[str]:
    badges: List[str] = []
    if vitals.systolic >= 140 or vitals.diastolic >= 90:
        badges.append(f"BP {vitals.systolic}/{vitals.diastolic} mmHg (Crossed 140/90 threshold)")
    elif vitals.systolic >= 130 or vitals.diastolic >= 85:
        badges.append(f"Borderline BP {vitals.systolic}/{vitals.diastolic} mmHg (Pre-hypertension)")

    if vitals.hemoglobin is not None:
        if vitals.hemoglobin < 9.0:
            badges.append(f"Hb {vitals.hemoglobin} g/dL (Severe Anemia < 9.0)")
        elif vitals.hemoglobin < 11.0:
            badges.append(f"Hb {vitals.hemoglobin} g/dL (Moderate Anemia < 11.0)")

    if vitals.blood_sugar_mmol >= 7.8:
        badges.append(f"Blood Sugar {vitals.blood_sugar_mmol} mmol/L (Hyperglycemia >= 7.8)")

    if vitals.body_temp_f >= 100.4:
        badges.append(f"Fever {vitals.body_temp_f} °F (Pyrexia >= 100.4 °F)")

    if vitals.fetal_heart_rate is not None and (vitals.fetal_heart_rate < 110 or vitals.fetal_heart_rate > 160):
        badges.append(f"Abnormal FHR {vitals.fetal_heart_rate} bpm (Normal 110-160)")

    if (vitals.fetal_movement or "Normal") in ("Reduced", "Absent"):
        badges.append(f"Fetal Movement: {vitals.fetal_movement}")

    if "rising_bp_trend" in trend.trend_flags:
        badges.append(trend.trend_summary)

    if age < 19 or age >= 35:
        badges.append(f"Maternal Age {age} yrs (High-risk age bracket)")

    if not badges:
        badges.append(f"All vitals normal (BP {vitals.systolic}/{vitals.diastolic}, Hb {vitals.hemoglobin or 11.5} g/dL)")
    return badges


def evaluate_full_risk(
    age: int,
    vitals: VitalsInput,
    symptoms: List[str],
    past_visits: List[Dict[str, Any]],
) -> CombinedRiskOutput:
    ml_out = predict_ml_risk(age, vitals)
    clinical_out = evaluate_clinical_rules(age, vitals, symptoms)
    trend_out = evaluate_visit_trend(vitals, past_visits)

    for tf in trend_out.trend_flags:
        if tf in MOHFW_PROTOCOLS and tf not in clinical_out.triggered_flags:
            clinical_out.triggered_flags.append(tf)
            clinical_out.matched_protocols.append(MOHFW_PROTOCOLS[tf])

    rank = {"low": 0, "mid": 1, "high": 2}
    inv_rank: Dict[int, Literal["low", "mid", "high"]] = {0: "low", 1: "mid", 2: "high"}
    current_rank = rank[ml_out.risk_level]

    if clinical_out.override_to_high:
        current_rank = 2
    elif clinical_out.override_to_mid:
        current_rank = max(current_rank, 1)

    if trend_out.trend_escalated:
        if "rising_bp_trend" in trend_out.trend_flags and (vitals.systolic >= 130 or vitals.diastolic >= 85):
            current_rank = 2
        else:
            current_rank = min(2, current_rank + 1)

    final_level = inv_rank[current_rank]
    frontend_level = map_to_frontend_risk(final_level)

    base_urgency = ml_out.probabilities.get("high", 0.2)
    if final_level == "high":
        urgency = min(0.99, round(max(0.78, base_urgency + 0.30), 2))
    elif final_level == "mid":
        urgency = min(0.75, round(max(0.45, base_urgency + 0.20), 2))
    else:
        urgency = min(0.35, round(max(0.12, base_urgency), 2))

    badges = build_explainability_badges(age, vitals, clinical_out, trend_out, ml_out)

    return CombinedRiskOutput(
        final_risk_level=final_level,
        frontend_risk_level=frontend_level,
        urgency_score=urgency,
        ml_output=ml_out,
        clinical_output=clinical_out,
        trend_output=trend_out,
        ai_explainability=badges,
    )
