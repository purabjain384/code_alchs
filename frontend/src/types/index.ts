export type RiskLevel = 'HIGH' | 'MODERATE' | 'LOW';

export type UserRole = 'supervisor' | 'asha' | 'mother';

export interface MotherRecord {
  id: string; // e.g. "MR-1024"
  name: string;
  hindiName?: string;
  age: number;
  gravidaPara: string; // e.g. "G2P1"
  village: string;
  ward: string;
  phcSector: string;
  gestationalWeek: number;
  trimester: 1 | 2 | 3;
  edd: string; // Expected Date of Delivery
  riskLevel: RiskLevel;
  riskReason?: string;
  bloodPressure: string; // e.g. "148/96 mmHg"
  hemoglobin: number; // in g/dL
  weight: number; // in kg
  weightGain?: string; // e.g. "+8.5 kg"
  fetalHeartRate: number; // in bpm
  flags: string[];
  lastVisitDate: string;
  nextDueDate: string;
  isOverdue?: boolean;
  overdueText?: string;
  assignedAsha: {
    name: string;
    phone: string;
    id: string;
  };
  doctorNotes?: string;
  avatarUrl: string;
}

export interface AshaWorker {
  id: string;
  name: string;
  hindiName?: string;
  phone: string;
  assignedVillage: string;
  ward: string;
  phcCenter: string;
  mothersCount: number;
  highRiskCount: number;
  completedVisitsToday: number;
  totalVisitsToday: number;
  avatarUrl: string;
  status: 'ONLINE' | 'OFFLINE' | 'SYNCING';
}

export interface DailyCareTask {
  id: string;
  title: string;
  hindiTitle: string;
  description: string;
  hindiDescription?: string;
  timeSlot: string;
  completed: boolean;
  category: 'MEDICATION' | 'CHECKUP' | 'NUTRITION' | 'EXERCISE';
  icon: string;
  badgeText?: string;
}

export interface VillageCaseload {
  name: string;
  totalMothers: number;
  highRisk: number;
  percentage: number;
}

