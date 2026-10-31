"""
Longitudinal Blood Pressure Trend Analysis (No ML)
Detects monotonic rise or steep positive slope over the last 3-4 visits.
"""
from typing import List, Dict, Any, Optional
import numpy as np
from scipy.stats import linregress

def check_bp_trend(
    visit_history: List[Dict[str, Any]],
    min_visits: int = 3
) -> Dict[str, Any]:
    """
    Analyzes historical visits to identify adverse rising trends in blood pressure.

    Parameters
    ----------
    visit_history : List[Dict[str, Any]]
        Chronological (oldest first, newest last) list of dictionaries,
        each containing 'systolic' and 'diastolic' readings.
    min_visits : int
        Minimum number of visits required to establish a valid trend.

    Returns
    -------
    Dict[str, Any]
        {
            'trend_flag': Optional[str],
            'systolic_slope': Optional[float],
            'diastolic_slope': Optional[float],
            'visits_checked': int
        }
    """
    if not visit_history or len(visit_history) < min_visits:
        return {
            "trend_flag": None,
            "systolic_slope": None,
            "diastolic_slope": None,
            "visits_checked": len(visit_history) if visit_history else 0
        }

    # Inspect the most recent N visits
    recent = visit_history[-min_visits:]
    try:
        sys_vals = [float(v["systolic"]) for v in recent]
        dia_vals = [float(v["diastolic"]) for v in recent]
    except (KeyError, ValueError, TypeError):
        return {
            "trend_flag": None,
            "systolic_slope": None,
            "diastolic_slope": None,
            "visits_checked": 0
        }

    # Monotonic rise check (each visit is strictly higher than previous)
    sys_mono = all(sys_vals[i] > sys_vals[i - 1] for i in range(1, len(sys_vals)))
    dia_mono = all(dia_vals[i] > dia_vals[i - 1] for i in range(1, len(dia_vals)))

    # Linear slope calculation (mmHg per visit)
    x = np.arange(len(recent))
    sys_slope = linregress(x, sys_vals).slope
    dia_slope = linregress(x, dia_vals).slope

    flag = None
    if sys_mono or dia_mono:
        flag = f"bp_rising_{min_visits}_visits"

    return {
        "trend_flag": flag,
        "systolic_slope": round(float(sys_slope), 2),
        "diastolic_slope": round(float(dia_slope), 2),
        "visits_checked": min_visits
    }

