export type RiskLevel = 'HIGH' | 'MODERATE' | 'LOW';

export type UserRole = 'supervisor' | 'asha' | 'mother';

export interface AuthUser {
  uid: string;
  phone: string;
  name: string;
  role: UserRole;
  village: string;
  ward: string;
  mother_id?: string | null;
  asha_id?: string | null;
}

export interface DailyCareTask {
  id: string;
  title: string;
  hindiTitle: string;
  subtitle: string;
  timeLabel: string;
  completed: boolean;
  icon: string;
}

export interface MotherRecord {
  id: string;
  name: string;
  hindiName?: string;
  age: number;
  phone?: string;
  village: string;
  ward: string;
  gestationalWeek: number;
  trimester: 1 | 2 | 3;
  edd: string;
  riskLevel: RiskLevel;
  riskReason?: string;
  flags: string[];
  bloodPressure: string;
  hemoglobin: number;
  weight: number;
  fetalHeartRate: number;
  bloodSugar?: number;
  bodyTemp?: number;
  heartRate?: number;
  lastVisitDate: string;
  nextDueDate: string;
  isOverdue?: boolean;
  overdueText?: string;
  avatarUrl: string;
  assignedAsha: {
    id: string;
    name: string;
    phone: string;
    village: string;
    ward: string;
  };
  aiExplainability?: string[];
  aiHindiAdvisory?: string;
  aiEnglishSummary?: string;
  audioBase64?: string;
  urgencyScore?: number;
  dailyTasks?: DailyCareTask[];
}

export interface EvaluateVisitApiResponse {
  visit_id: string;
  mother_id: string;
  risk_level: 'low' | 'mid' | 'high';
  frontend_risk_level: RiskLevel;
  urgency_score: number;
  risk_factors: string[];
  ai_explainability: string[];
  trend_summary: string;
  english_summary: string;
  hindi_text: string;
  action_items_en: string[];
  action_items_hi: string[];
  audio_base64: string;
  saved_to_firestore: boolean;
  mother_record?: MotherRecord;
}

export interface MotherSummaryApiResponse {
  mother_id: string;
  visits_analyzed: number;
  latest_risk_level?: string | null;
  summary_en: string;
  summary_hi: string;
  visits: Array<{
    visit_id: string;
    timestamp: string;
    frontend_risk_level: RiskLevel;
    urgency_score: number;
    vitals: {
      systolic: number;
      diastolic: number;
      blood_sugar_mmol: number;
      body_temp_f: number;
      heart_rate: number;
      hemoglobin?: number;
      weight_kg?: number;
      fetal_heart_rate?: number;
      fetal_movement?: string;
    };
    english_summary: string;
    hindi_text: string;
    trend_summary: string;
  }>;
}

export interface SosDispatchRecord {
  dispatch_id: string;
  mother_id: string;
  mother_name: string;
  vehicle_no: string;
  pilot_name: string;
  pilot_phone: string;
  eta_minutes: number;
  target_facility: string;
  emergency_reason: string;
  created_at: string;
}
