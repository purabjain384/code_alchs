export type RiskLevel = 'HIGH' | 'MODERATE' | 'LOW' | 'UNASSESSED';

export type NavTab = 'dashboard' | 'new-form' | 'history' | 'result';

export interface AuthUser {
  uid: string;
  phone: string;
  name: string;
  age: number;
  gestational_week?: number | null;
  mother_id: string;
}

export interface ModelMeta {
  model_version: string;
  model_name: string;
  features: string[];
  cv_recall_high: number;
  cv_macro_f1: number;
  cv_accuracy: number;
  test_recall_high: number;
  test_macro_f1: number;
  test_accuracy: number;
  trained_at: string;
}

export interface MotherRecord {
  id: string;
  name: string;
  age: number;
  phone: string;
  gestationalWeek?: number | null;
  trimester?: number | null;
  riskLevel: RiskLevel;
  riskReason: string;
  flags: string[];
  topFactors: string[];
  probabilities: Record<string, number>;
  trendFlag?: string | null;
  systolicSlope?: number | null;
  diastolicSlope?: number | null;
  bloodPressure?: string | null;
  systolicBP?: number | null;
  diastolicBP?: number | null;
  bloodSugar?: number | null;
  bodyTemp?: number | null;
  heartRate?: number | null;
  hemoglobin?: number | null;
  weight?: number | null;
  visitCount: number;
  lastVisitDate?: string | null;
  aiExplainability: string[];
  aiHindiAdvisory: string;
  aiEnglishSummary: string;
  audioBase64: string;
  urgencyScore: number;
  modelVersion: string;
}

export interface VisitRecord {
  visit_id: string;
  mother_id: string;
  mother_name: string;
  age: number;
  gestational_age_weeks?: number | null;
  vitals: {
    systolic: number;
    diastolic: number;
    blood_sugar_mmol: number;
    body_temp_f: number;
    heart_rate: number;
    hemoglobin?: number | null;
    weight_kg?: number | null;
    fetal_heart_rate?: number | null;
    fetal_movement?: string | null;
    remarks?: string;
  };
  symptoms: string[];
  risk_level: 'low' | 'mid' | 'high';
  frontend_risk_level: 'LOW' | 'MODERATE' | 'HIGH';
  risk_rank: number;
  urgency_score: number;
  probabilities: {
    low: number;
    mid: number;
    high: number;
  };
  top_factors: string[];
  rule_flags: string[];
  trend_flag?: string | null;
  systolic_slope?: number | null;
  diastolic_slope?: number | null;
  model_version: string;
  risk_factors: string[];
  ai_explainability: string[];
  trend_summary: string;
  english_summary: string;
  hindi_text: string;
  action_items_en: string[];
  action_items_hi: string[];
  audio_base64: string;
  timestamp: string;
}

export interface EvaluateVisitApiResponse extends VisitRecord {
  saved_to_firestore: boolean;
  mother_record?: MotherRecord;
}

export interface MotherSummaryApiResponse {
  mother_id: string;
  mother_name: string;
  visits_analyzed: number;
  latest_risk_level?: string | null;
  summary_en: string;
  summary_hi: string;
  visits: VisitRecord[];
}
