from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class VitalsInput(BaseModel):
    """
    Antenatal visit vitals required by the MatruRaksha risk engine.
    Units must strictly match the training data:
    - Systolic & Diastolic: mmHg
    - Blood Sugar: mmol/L
    - Body Temperature: °F
    - Heart Rate: bpm
    """
    age: int = Field(..., ge=10, le=75, description="Mother's age in years")
    systolic: int = Field(..., ge=60, le=240, description="Systolic blood pressure (mmHg)")
    diastolic: int = Field(..., ge=30, le=160, description="Diastolic blood pressure (mmHg)")
    blood_sugar_mmol: float = Field(..., ge=2.0, le=35.0, description="Blood glucose level (mmol/L)")
    body_temp_f: float = Field(..., ge=92.0, le=108.0, description="Body temperature (°F)")
    heart_rate: int = Field(..., ge=30, le=220, description="Heart rate (bpm)")


class VisitRecord(BaseModel):
    """Minimal historical visit vitals for BP trend detection."""
    systolic: float
    diastolic: float
    visit_at: Optional[str] = None


class PredictionRequest(BaseModel):
    """Payload sent by mobile app or Cloud Function."""
    mother_id: Optional[str] = None
    asha_uid: Optional[str] = None
    gestational_weeks: Optional[int] = None
    vitals: VitalsInput
    visit_history: Optional[List[VisitRecord]] = Field(default_factory=list)


class ModelOutput(BaseModel):
    predicted_class: str
    risk_rank: int
    probabilities: Dict[str, float]
    top_factors: List[str]
    model_version: str


class RuleOutput(BaseModel):
    rule_flags: List[str]
    rule_risk: Optional[str] = None


class TrendOutput(BaseModel):
    trend_flag: Optional[str] = None
    systolic_slope: Optional[float] = None
    diastolic_slope: Optional[float] = None
    visits_checked: int = 0


class RiskResult(BaseModel):
    risk_level: str
    risk_rank: int
    probabilities: Dict[str, float]
    top_factors: List[str]
    rule_flags: List[str]
    trend_flag: Optional[str] = None
    model_version: str


class ExplanationPayload(BaseModel):
    explanation_hi: str
    next_step_hi: str
    explanation_en: str
    next_step_en: str


class PredictionResponse(BaseModel):
    status: str = "scored"
    mother_id: Optional[str] = None
    result: RiskResult
    explanation: Optional[ExplanationPayload] = None
    scored_at: str

