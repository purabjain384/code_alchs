"""
Clinical Red-Flag Rules (Deterministic, No ML)
Hard thresholds that always override the model.
These rules run both on-device (in Dart) and on the backend (in Python).
"""
from typing import List, Tuple, Optional

def check_rules(
    systolic: float,
    diastolic: float,
    blood_sugar: float,
    body_temp: float,
    heart_rate: float
) -> Tuple[List[str], Optional[str]]:
    """
    Evaluates vital signs against deterministic clinical red-flag thresholds.

    Parameters
    ----------
    systolic : float
        Systolic blood pressure (mmHg).
    diastolic : float
        Diastolic blood pressure (mmHg).
    blood_sugar : float
        Blood glucose concentration (mmol/L).
    body_temp : float
        Body temperature (°F).
    heart_rate : float
        Heart rate (bpm).

    Returns
    -------
    Tuple[List[str], Optional[str]]
        - rule_flags: list of triggered rule IDs
        - rule_risk: minimum risk escalation demanded by the fired rules ('high', 'mid', or None)
    """
    flags: List[str] = []
    risk_level: int = 0  # 0=none, 1=low, 2=mid, 3=high

    # 1. Severe Hypertension (Urgent referral)
    if systolic >= 160.0 or diastolic >= 110.0:
        flags.append("bp_above_160_110")
        risk_level = max(risk_level, 3)
    # 2. Mild / Moderate Hypertension
    elif systolic >= 140.0 or diastolic >= 90.0:
        flags.append("bp_above_140_90")
        risk_level = max(risk_level, 3)

    # 3. Hyperglycemia (Gestational diabetes / high blood sugar)
    # 11.1 mmol/L corresponds to ~200 mg/dL random plasma glucose
    if blood_sugar >= 11.1:
        flags.append("high_blood_sugar")
        risk_level = max(risk_level, 3)

    # 4. Fever (Potential sepsis or systemic infection)
    # 100.4 °F is standard clinical fever threshold (38.0 °C)
    if body_temp >= 100.4:
        flags.append("fever")
        risk_level = max(risk_level, 2)

    # 5. Abnormal Maternal Heart Rate (Bradycardia < 60 or Tachycardia > 100)
    if heart_rate < 60.0 or heart_rate > 100.0:
        flags.append("abnormal_heart_rate")
        risk_level = max(risk_level, 2)

    level_map = {0: None, 1: "low", 2: "mid", 3: "high"}
    return flags, level_map[risk_level]

