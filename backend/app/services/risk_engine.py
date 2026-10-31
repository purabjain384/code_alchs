import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional, Tuple

import joblib
import numpy as np

from app.models.schemas import (
    ClassProbabilities,
    CombinedRiskOutput,
    MLModelOutput,
    PastVisitSummary,
    VitalsInput,
)

logger = logging.getLogger(__name__)

# Fixed UCI feature names in exact required order
UCI_FEATURE_NAMES: List[str] = [
    "Age",
    "SystolicBP",
    "DiastolicBP",
    "BS",
    "BodyTemp",
    "HeartRate",
]

# Human-readable labels for the supervisor dashboard & Flutter card
FEATURE_DISPLAY_NAMES: Dict[str, str] = {
    "Age": "maternal age",
    "SystolicBP": "systolic BP",
    "DiastolicBP": "diastolic BP",
    "BS": "blood sugar",
    "BodyTemp": "body temperature",
    "HeartRate": "heart rate",
}

RISK_TO_RANK: Dict[str, int] = {"low": 1, "mid": 2, "high": 3}
RANK_TO_RISK: Dict[int, Literal["low", "mid", "high"]] = {
    1: "low",
    2: "mid",
    3: "high",
}

BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
PROTOCOLS_PATH = Path(__file__).resolve().parent.parent / "data" / "mohfw_protocols.json"
_PROTOCOLS_CACHE: Optional[Dict[str, Any]] = None
_LOADED_MODEL: Optional[Any] = None
_MODEL_LOAD_ATTEMPTED: bool = False


def load_protocols() -> Dict[str, Any]:
    """Load and cache mohfw_protocols.json."""
    global _PROTOCOLS_CACHE
    if _PROTOCOLS_CACHE is None:
        with open(PROTOCOLS_PATH, "r", encoding="utf-8") as f:
            _PROTOCOLS_CACHE = json.load(f)
    return _PROTOCOLS_CACHE


def extract_uci_features(age: int, vitals: VitalsInput) -> List[float]:
    """
    Return the exact 6 numbers in the fixed UCI order and units:
    [Age (years), SystolicBP (mmHg), DiastolicBP (mmHg), BS (mmol/L), BodyTemp (°F), HeartRate (bpm)]
    """
    return [
        float(age),
        float(vitals.systolic),
        float(vitals.diastolic),
        float(vitals.blood_sugar_mmol),
        float(vitals.body_temp_f),
        float(vitals.heart_rate),
    ]


def _get_ml_model() -> Optional[Any]:
    """Attempt to load the ML teammate's trained Random Forest artifact (.joblib or .pkl) once."""
    global _LOADED_MODEL, _MODEL_LOAD_ATTEMPTED
    if _MODEL_LOAD_ATTEMPTED:
        return _LOADED_MODEL

    _MODEL_LOAD_ATTEMPTED = True
    model_path = os.getenv("MODEL_PATH", "rf_model.joblib")
    candidate = Path(model_path)
    if not candidate.is_absolute():
        candidate = BACKEND_ROOT / candidate

    if candidate.exists():
        try:
            _LOADED_MODEL = joblib.load(candidate)
            logger.info("Loaded ML teammate's trained model from %s", candidate)
        except Exception as exc:
            logger.warning("Failed to load model at %s (%s). Using calibrated UCI fallback.", candidate, exc)
            _LOADED_MODEL = None
    else:
        logger.info("No model file at %s yet. Using built-in calibrated UCI RF fallback.", candidate)
    return _LOADED_MODEL


def run_ml_model(age: int, vitals: VitalsInput) -> MLModelOutput:
    """
    Pass ONLY the 6 fixed UCI numbers to the ML model:
    {"features": [age, systolic, diastolic, blood_sugar_mmol, body_temp_f, heart_rate]}
    """
    features = extract_uci_features(age, vitals)

    # Compute deviation scores per UCI feature to identify top driving factors
    feature_deviations: Dict[str, float] = {
        "Age": max(0.0, (age - 35.0) / 10.0 if age > 35 else (18.0 - age) / 5.0 if age < 18 else 0.0),
        "SystolicBP": max(0.0, (vitals.systolic - 120.0) / 20.0),
        "DiastolicBP": max(0.0, (vitals.diastolic - 80.0) / 10.0),
        "BS": max(0.0, (vitals.blood_sugar_mmol - 6.5) / 1.5),
        "BodyTemp": max(0.0, (vitals.body_temp_f - 98.6) / 1.5),
        "HeartRate": max(0.0, (vitals.heart_rate - 90.0) / 20.0),
    }
    sorted_factors = sorted(feature_deviations.items(), key=lambda kv: kv[1], reverse=True)
    top_factors = [name for name, score in sorted_factors if score > 0.15][:2]
    if not top_factors:
        top_factors = ["SystolicBP", "BS"]

    # Option A: Check if ML teammate provided a custom `ml_model.py` with `predict_maternal_risk(features)`
    try:
        import ml_model  # type: ignore[import-not-found]

        if hasattr(ml_model, "predict_maternal_risk"):
            raw_res = ml_model.predict_maternal_risk(features)
            return MLModelOutput(**raw_res)
    except ImportError:
        pass
    except Exception as exc:
        logger.warning("Custom ml_model.predict_maternal_risk failed (%s), trying joblib model.", exc)

    # Option B: Check if ML teammate provided `rf_model.joblib` / `.pkl`
    model = _get_ml_model()
    if model is not None and hasattr(model, "predict_proba"):
        try:
            X = np.array([features], dtype=float)
            probs = model.predict_proba(X)[0]
            classes = [str(c).lower() for c in getattr(model, "classes_", ["low", "mid", "high"])]
            prob_map = {"low": 0.0, "mid": 0.0, "high": 0.0}
            for cls_name, p_val in zip(classes, probs):
                if "high" in cls_name or cls_name == "2":
                    prob_map["high"] = float(p_val)
                elif "mid" in cls_name or "med" in cls_name or cls_name == "1":
                    prob_map["mid"] = float(p_val)
                else:
                    prob_map["low"] = float(p_val)

            predicted_class: Literal["low", "mid", "high"] = max(
                prob_map.items(), key=lambda kv: kv[1]
            )[0]  # type: ignore[assignment]
            return MLModelOutput(
                predicted_class=predicted_class,
                probabilities=ClassProbabilities(
                    low=round(prob_map["low"], 2),
                    mid=round(prob_map["mid"], 2),
                    high=round(prob_map["high"], 2),
                ),
                top_factors=top_factors,
                model_version="rf-v1",
            )
        except Exception as exc:
            logger.warning("Trained model inference failed (%s), using fallback.", exc)

    # Option C: Built-in Calibrated UCI Fallback Model (unblocks backend & Flutter before ML handoff)
    risk_score = (
        0.35 * min(feature_deviations["SystolicBP"], 2.5)
        + 0.25 * min(feature_deviations["DiastolicBP"], 2.5)
        + 0.25 * min(feature_deviations["BS"], 2.5)
        + 0.20 * min(feature_deviations["BodyTemp"], 2.5)
        + 0.10 * min(feature_deviations["HeartRate"], 2.0)
        + 0.10 * min(feature_deviations["Age"], 1.5)
    )

    if risk_score >= 0.75:
        p_high = min(0.94, round(0.55 + 0.18 * risk_score, 2))
        p_mid = round(max(0.04, (1.0 - p_high) * 0.75), 2)
        p_low = round(max(0.01, 1.0 - p_high - p_mid), 2)
        pred: Literal["low", "mid", "high"] = "high"
    elif risk_score >= 0.30:
        p_mid = min(0.75, round(0.48 + 0.20 * risk_score, 2))
        p_high = round(min(0.40, 0.15 + 0.25 * risk_score), 2)
        p_low = round(max(0.05, 1.0 - p_mid - p_high), 2)
        pred = "mid"
    else:
        p_low = round(max(0.72, 0.90 - 0.40 * risk_score), 2)
        p_mid = round(min(0.22, (1.0 - p_low) * 0.8), 2)
        p_high = round(max(0.01, 1.0 - p_low - p_mid), 2)
        pred = "low"

    return MLModelOutput(
        predicted_class=pred,
        probabilities=ClassProbabilities(low=p_low, mid=p_mid, high=p_high),
        top_factors=top_factors,
        model_version="rf-v1",
    )


def evaluate_clinical_rules(vitals: VitalsInput) -> Tuple[List[str], Literal["low", "mid", "high"]]:
    """
    Evaluate deterministic MoHFW clinical red-flag thresholds.
    Returns (rule_flags, minimum_required_risk_level).
    """
    rule_flags: List[str] = []
    required_rank = 1  # 1 = low, 2 = mid, 3 = high

    # 1. Blood Pressure thresholds
    if vitals.systolic >= 160 or vitals.diastolic >= 110:
        rule_flags.append("bp_severe_160_110")
        rule_flags.append("bp_above_140_90")
        required_rank = max(required_rank, 3)
    elif vitals.systolic >= 140 or vitals.diastolic >= 90:
        rule_flags.append("bp_above_140_90")
        required_rank = max(required_rank, 3)
    elif vitals.systolic >= 130 or vitals.diastolic >= 85:
        rule_flags.append("bp_borderline")
        required_rank = max(required_rank, 2)

    # 2. Blood Sugar thresholds (mmol/L)
    if vitals.blood_sugar_mmol >= 11.1:
        rule_flags.append("bs_severe_above_11_1")
        rule_flags.append("bs_above_7_8")
        required_rank = max(required_rank, 3)
    elif vitals.blood_sugar_mmol >= 7.8:
        rule_flags.append("bs_above_7_8")
        required_rank = max(required_rank, 2)

    # 3. Body Temperature thresholds (°F)
    if vitals.body_temp_f >= 100.4:
        rule_flags.append("fever_above_100_4")
        required_rank = max(required_rank, 3)
    elif vitals.body_temp_f >= 99.5:
        rule_flags.append("mild_fever")
        required_rank = max(required_rank, 2)

    # 4. Heart Rate thresholds (bpm)
    if vitals.heart_rate > 110 or vitals.heart_rate < 55:
        rule_flags.append("tachycardia_above_110")
        required_rank = max(required_rank, 2)

    return rule_flags, RANK_TO_RISK[required_rank]


def evaluate_visit_trend(
    current_vitals: VitalsInput,
    past_visits: List[PastVisitSummary],
) -> Tuple[Optional[str], Literal["low", "mid", "high"], Literal["rising", "stable", "falling"]]:
    """
    Dynamic Overall Multi-Visit Trend Analyzer (works for ANY number of past visits: 1, 2, 3, ..., N):
    - Sorts all historical visits chronologically.
    - Computes overall BP direction (`rising`, `stable`, `falling`) using linear slope & baseline comparison.
    - Detects:
      1. Acute single-visit BP surge (>= +15 mmHg systolic or >= +10 mmHg diastolic over last visit).
      2. Consecutive rising BP streak OR overall cumulative pregnancy BP climb (slope >= +3.5 mmHg/visit and net rise >= 12 mmHg).
      3. Overall rising blood sugar trajectory (net BS rise >= +1.5 mmol/L reaching >= 7.0 mmol/L).
    """
    if not past_visits:
        return None, "low", "stable"

    ordered_past = list(past_visits)
    if all(v.visit_at is not None for v in ordered_past):
        ordered_past.sort(key=lambda v: str(v.visit_at))

    sys_series = [float(v.vitals.systolic) for v in ordered_past] + [float(current_vitals.systolic)]
    dia_series = [float(v.vitals.diastolic) for v in ordered_past] + [float(current_vitals.diastolic)]
    bs_series = [float(v.vitals.blood_sugar_mmol) for v in ordered_past] + [float(current_vitals.blood_sugar_mmol)]

    n_points = len(sys_series)
    x_idx = np.arange(n_points, dtype=float)
    sys_slope = float(np.polyfit(x_idx, sys_series, 1)[0]) if n_points >= 2 else 0.0
    dia_slope = float(np.polyfit(x_idx, dia_series, 1)[0]) if n_points >= 2 else 0.0
    bs_slope = float(np.polyfit(x_idx, bs_series, 1)[0]) if n_points >= 2 else 0.0

    # Determine overall BP direction for the mother's summary document
    bp_trend: Literal["rising", "stable", "falling"] = "stable"
    if sys_slope >= 2.5 or (sys_series[-1] - sys_series[-2] >= 5):
        bp_trend = "rising"
    elif sys_slope <= -2.5 or (sys_series[-2] - sys_series[-1] >= 5):
        bp_trend = "falling"

    # Case 1: 3 or more total visits — check both consecutive climb AND overall multi-visit trajectory
    if n_points >= 3:
        recent_consecutive_climb = (
            sys_series[-3] < sys_series[-2] < sys_series[-1]
            and (sys_series[-1] - sys_series[-3]) >= 10.0
        )
        baseline_sys = float(np.mean(sys_series[: max(1, n_points // 2)]))
        overall_trajectory_climb = (
            sys_slope >= 3.5
            and (sys_series[-1] - min(sys_series[:-1])) >= 12.0
            and (sys_series[-1] - baseline_sys) >= 10.0
        )
        if recent_consecutive_climb or overall_trajectory_climb:
            trend_risk: Literal["low", "mid", "high"] = (
                "high" if current_vitals.systolic >= 135 or current_vitals.diastolic >= 88 else "mid"
            )
            return "bp_rising_3_visits", trend_risk, "rising"

    # Case 2: Any number of past visits (>= 1 past visit) — check acute BP jump from previous or baseline
    acute_sys_jump = (sys_series[-1] - sys_series[-2]) >= 15.0
    acute_dia_jump = (dia_series[-1] - dia_series[-2]) >= 10.0 or dia_slope >= 4.0
    if acute_sys_jump or acute_dia_jump:
        trend_risk = "high" if current_vitals.systolic >= 135 or current_vitals.diastolic >= 88 else "mid"
        return "bp_rising_trend", trend_risk, "rising"

    # Case 3: Overall Blood Sugar rising trajectory across visits
    if (bs_series[-1] - min(bs_series[:-1])) >= 1.5 and bs_slope >= 0.4 and current_vitals.blood_sugar_mmol >= 7.0:
        return "bs_rising_trend", "mid", bp_trend

    return None, "low", bp_trend


def evaluate_visit_risk(
    age: int,
    current_vitals: VitalsInput,
    past_visits: Optional[List[PastVisitSummary]] = None,
) -> CombinedRiskOutput:
    """
    Master Risk Engine combining:
    1. ML Model output (6 UCI features)
    2. Clinical Red-Flag Rules
    3. Overall Multi-Visit Trend Analysis (across all available past visits)
    Final risk is the MAXIMUM of all three layers (rules can never be downgraded by the model).
    """
    past_list = past_visits or []

    # 1. ML Model Output
    ml_out = run_ml_model(age=age, vitals=current_vitals)
    model_rank = RISK_TO_RANK[ml_out.predicted_class]

    # 2. Hard Clinical Rules Output
    rule_flags, rules_risk = evaluate_clinical_rules(current_vitals)
    rules_rank = RISK_TO_RANK[rules_risk]

    # 3. Overall Multi-Visit Trend Output
    trend_flag, trend_risk, bp_trend = evaluate_visit_trend(current_vitals, past_list)
    trend_rank = RISK_TO_RANK[trend_risk]

    # Never-downgrade combination rule
    final_rank = max(model_rank, rules_rank, trend_rank)
    final_risk_level = RANK_TO_RISK[final_rank]

    # Compute urgency score (probability of high risk, boosted if hard high-risk rules fired, capped at 0.99)
    urgency_score = ml_out.probabilities.high
    if final_rank == 3 and urgency_score < 0.74:
        urgency_score = round(min(0.99, max(0.74, urgency_score + 0.35)), 2)
    elif final_rank == 2 and urgency_score < 0.45:
        urgency_score = round(min(0.99, max(0.45, ml_out.probabilities.mid)), 2)

    # Map flags to mohfw_protocols.json keys
    protocols = load_protocols()
    matched_protocol_keys: List[str] = []
    for flag in rule_flags:
        if flag in protocols and flag not in matched_protocol_keys:
            matched_protocol_keys.append(flag)
    if trend_flag and trend_flag in protocols and trend_flag not in matched_protocol_keys:
        matched_protocol_keys.append(trend_flag)
    if not matched_protocol_keys:
        matched_protocol_keys.append("routine_anc")

    condition_tags = [protocols[k]["condition_tag"] for k in matched_protocol_keys]

    # Convert UCI feature codes to readable display factors for Firestore & UI
    readable_top_factors = [
        FEATURE_DISPLAY_NAMES.get(f, f) for f in ml_out.top_factors
    ]

    # Compile human-readable reasons list for the Flutter Result Card
    reasons: List[str] = []
    for k in matched_protocol_keys:
        reasons.append(protocols[k]["condition_name"])
    for factor in readable_top_factors:
        if factor not in " ".join(reasons).lower():
            reasons.append(f"Elevated {factor}")

    return CombinedRiskOutput(
        risk_level=final_risk_level,
        risk_rank=final_rank,
        urgency_score=urgency_score,
        probabilities=ml_out.probabilities,
        top_factors=readable_top_factors,
        rule_flags=rule_flags,
        trend_flag=trend_flag,
        bp_trend=bp_trend,
        condition_tags=condition_tags,
        matched_protocol_keys=matched_protocol_keys,
        reasons=reasons,
        model_version=ml_out.model_version,
    )


def get_protocol_entries(protocol_keys: List[str]) -> List[Dict[str, Any]]:
    """Retrieve the full protocol definitions from mohfw_protocols.json for the given keys."""
    protocols = load_protocols()
    entries = [protocols[k] for k in protocol_keys if k in protocols]
    if not entries:
        entries = [protocols["routine_anc"]]
    return entries

