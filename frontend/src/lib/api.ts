import {
  AuthUser,
  EvaluateVisitApiResponse,
  ModelMeta,
  MotherRecord,
  MotherSummaryApiResponse,
  VisitRecord,
} from '@/types';

const API_BASE = '/api/proxy';

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
      errText = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail || errText);
    } catch {
      // ignore
    }
    throw new Error(errText);
  }
  return res.json();
}

export async function sendPhoneOtp(phone: string): Promise<{
  phone: string;
  otp_sent: boolean;
  demo_otp_hint: string;
  message: string;
}> {
  return requestJson('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export async function verifyPhoneOtp(payload: {
  phone: string;
  otp: string;
  name?: string;
  age?: number;
  gestational_week?: number;
  firebase_id_token?: string;
}): Promise<AuthUser> {
  return requestJson('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchModelMeta(): Promise<ModelMeta> {
  return requestJson('/model-meta');
}

export async function fetchAllMothers(): Promise<MotherRecord[]> {
  return requestJson('/mothers');
}

export async function fetchSingleMother(motherId: string): Promise<MotherRecord> {
  return requestJson(`/mothers/${encodeURIComponent(motherId)}`);
}

export async function createNewMother(payload: {
  name: string;
  age: number;
  phone?: string;
  gestationalWeek?: number;
}): Promise<MotherRecord> {
  return requestJson('/mothers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchAllVisits(limit = 100, motherId?: string): Promise<VisitRecord[]> {
  const query = motherId
    ? `/visits?limit=${limit}&mother_id=${encodeURIComponent(motherId)}`
    : `/visits?limit=${limit}`;
  return requestJson(query);
}

export interface EvaluateVisitPayload {
  mother_id: string;
  age: number;
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
    remarks?: string;
  };
  symptoms: string[];
}

export async function evaluateAncVisit(
  payload: EvaluateVisitPayload
): Promise<EvaluateVisitApiResponse> {
  return requestJson('/evaluate-visit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchMotherHistorySummary(
  motherId: string
): Promise<MotherSummaryApiResponse> {
  return requestJson(`/mother-summary/${encodeURIComponent(motherId)}`);
}

export async function synthesizeSpeechApi(text: string): Promise<{
  audio_base64: string;
  mime_type: string;
}> {
  return requestJson('/tts', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

