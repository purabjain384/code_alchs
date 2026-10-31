import {
  AuthUser,
  DailyCareTask,
  EvaluateVisitApiResponse,
  MotherRecord,
  MotherSummaryApiResponse,
  SosDispatchRecord,
  UserRole,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    let errText = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      errText = data.detail || errText;
    } catch {
      // ignore
    }
    throw new Error(errText);
  }
  return res.json();
}

export async function sendPhoneOtp(phone: string): Promise<{ phone: string; otp_sent: boolean; demo_otp_hint: string; message: string }> {
  return requestJson('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export async function verifyPhoneOtp(payload: {
  phone: string;
  otp: string;
  firebase_id_token?: string;
  name?: string;
  role: UserRole;
  village?: string;
  ward?: string;
  mother_id?: string;
}): Promise<AuthUser> {
  return requestJson('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchAllMothers(): Promise<MotherRecord[]> {
  return requestJson('/mothers');
}

export async function createNewMother(payload: Partial<MotherRecord>): Promise<MotherRecord> {
  return requestJson('/mothers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function bulkImportDatasetMothers(records: Array<Record<string, unknown>>): Promise<MotherRecord[]> {
  return requestJson('/mothers/bulk-import', {
    method: 'POST',
    body: JSON.stringify(records),
  });
}

export async function updateMotherDailyTasks(motherId: string, tasks: DailyCareTask[]): Promise<MotherRecord> {
  return requestJson(`/mothers/${encodeURIComponent(motherId)}/tasks`, {
    method: 'PUT',
    body: JSON.stringify({ tasks }),
  });
}

export interface EvaluateVisitPayload {
  mother_id: string;
  asha_id: string;
  age?: number;
  gestational_age_weeks?: number;
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
    issued_ifa?: boolean;
    issued_calcium?: boolean;
    administered_td?: boolean;
    remarks?: string;
  };
  symptoms: string[];
}

export async function evaluateAncVisit(payload: EvaluateVisitPayload): Promise<EvaluateVisitApiResponse> {
  return requestJson('/evaluate-visit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function synthesizeHindiTts(text: string): Promise<{ audio_base64: string; mime_type: string }> {
  return requestJson('/tts', {
    method: 'POST',
    body: JSON.stringify({ text, language_code: 'hi-IN' }),
  });
}

export async function fetchMotherHistorySummary(motherId: string): Promise<MotherSummaryApiResponse> {
  return requestJson(`/mother-summary/${encodeURIComponent(motherId)}`);
}

export async function dispatchEmergencySos(payload: {
  mother_id: string;
  mother_name: string;
  village: string;
  ward: string;
  blood_pressure: string;
  emergency_reason: string;
  target_facility: string;
}): Promise<SosDispatchRecord> {
  return requestJson('/sos-dispatch', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchSosDispatches(): Promise<SosDispatchRecord[]> {
  return requestJson('/sos-dispatches');
}

