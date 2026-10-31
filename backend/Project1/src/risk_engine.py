"""
MatruRaksha Risk Engine
Combines:
1. Supervised Machine Learning Model (Random Forest / Logistic Regression / Gradient Boosting)
2. Clinical Red-Flag Rules (Always overrides model)
3. Longitudinal BP Trend Escalation
"""
import os
import json
from typing import Dict, List, Any, Optional
import numpy as np
import joblib

from .rules import check_rules
from .trend import check_bp_trend
from .schemas import VitalsInput, RiskResult

RISK_RANK: Dict[str, int] = {"low": 1, "mid": 2, "high": 3}
RANK_RISK: Dict[int, str] = {1: "low", 2: "mid", 3: "high"}
FEATURE_ORDER: List[str] = ["Age", "SystolicBP", "DiastolicBP", "BS", "BodyTemp", "HeartRate"]
LABEL_NAMES: List[str] = ["low", "mid", "high"]


def combine_risk(
    model_output: Dict[str, Any],
    rule_output: Dict[str, Any],
    trend_output: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Combines outputs from the three subsystems.
    Rules always win — the model cannot downgrade a clinical red-flag.
    A rising BP trend escalates risk to at least 'mid'.
    """
    model_rank = RISK_RANK.get(model_output["predicted_class"], 1)
    rule_rank = RISK_RANK.get(rule_output.get("rule_risk") or "", 0)

    # Trend escalation: rising BP escalates to at least 'mid' (rank 2)
    trend_rank = 2 if trend_output.get("trend_flag") else 0

    final_rank = max(model_rank, rule_rank, trend_rank)

    return {
        "risk_level": RANK_RISK[final_rank],
        "risk_rank": final_rank,
        "probabilities": model_output["probabilities"],
        "top_factors": model_output["top_factors"],
        "rule_flags": rule_output["rule_flags"],
        "trend_flag": trend_output.get("trend_flag"),
        "model_version": model_output["model_version"]
    }


class RiskEngine:
    """
    Stateful risk engine loader for FastAPI inference.
    """
    def __init__(self, model_path: Optional[str] = None, meta_path: Optional[str] = None):
        self.model = None
        self.meta = {}
        self.model_version = "rf-v1"

        if model_path and os.path.isfile(model_path):
            self.load_model(model_path, meta_path)

    def load_model(self, model_path: str, meta_path: Optional[str] = None) -> None:
        self.model = joblib.load(model_path)
        if meta_path and os.path.isfile(meta_path):
            with open(meta_path, "r", encoding="utf-8") as f:
                self.meta = json.load(f)
            self.model_version = f"{self.meta.get('model_key', 'rf')}-v1"

    def predict_single(
        self,
        vitals: VitalsInput,
        visit_history: Optional[List[Dict[str, Any]]] = None
    ) -> RiskResult:
        """
        Runs full assessment pipeline for a single antenatal visit.
        """
        raw_features = [
            vitals.age,
            vitals.systolic,
            vitals.diastolic,
            vitals.blood_sugar_mmol,
            vitals.body_temp_f,
            vitals.heart_rate
        ]
        X_arr = np.array([raw_features], dtype=np.float64)

        # 1. Model inference
        if self.model is not None:
            pred_idx = int(self.model.predict(X_arr)[0])
            probs = self.model.predict_proba(X_arr)[0]
            prob_dict = {LABEL_NAMES[i]: round(float(p), 4) for i, p in enumerate(probs)}

            # Top driving factors from feature importance
            if hasattr(self.model, "feature_importances_"):
                imp = self.model.feature_importances_
            elif hasattr(self.model, "named_steps") and hasattr(self.model.named_steps.get("clf"), "coef_"):
                imp = np.abs(self.model.named_steps["clf"].coef_[pred_idx])
            else:
                imp = np.ones(len(FEATURE_ORDER))
            top_factors = [FEATURE_ORDER[i] for i in np.argsort(imp)[::-1][:2]]
        else:
            # Fallback if model not yet trained: default to low risk baseline
            pred_idx = 0
            prob_dict = {"low": 1.0, "mid": 0.0, "high": 0.0}
            top_factors = ["SystolicBP", "BS"]

        model_output = {
            "predicted_class": LABEL_NAMES[pred_idx],
            "probabilities": prob_dict,
            "top_factors": top_factors,
            "model_version": self.model_version
        }

        # 2. Clinical rules check
        flags, rule_risk = check_rules(
            vitals.systolic,
            vitals.diastolic,
            vitals.blood_sugar_mmol,
            vitals.body_temp_f,
            vitals.heart_rate
        )
        rule_output = {"rule_flags": flags, "rule_risk": rule_risk}

        # 3. Longitudinal trend check
        trend_output = check_bp_trend(visit_history or [])

        # 4. Combiner logic
        result_dict = combine_risk(model_output, rule_output, trend_output)
        return RiskResult(**result_dict)

