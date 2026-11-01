export type Risk = 'LOW' | 'MODERATE' | 'HIGH';

export interface MockVisit {
  week: number;
  date: string;
  systolic: number;
  diastolic: number;
  sugar: number; // mmol/L
  hemoglobin: number; // g/dL
  weight: number; // kg
  fetalHr: number; // bpm
  heartRate: number;
  tempF: number;
  risk: Risk;
  symptoms: string[];
  notes: string;
  by: string;
}

export const MOCK_PATIENT = {
  name: 'Sunita Devi',
  age: 28,
  phone: '+91 98765 43210',
  currentWeek: 34,
  edd: '24 Nov 2026',
  risk: 'HIGH' as Risk,
  riskReason:
    'Blood pressure has risen at every checkup since week 28 and is now 152/96 with headache and blurred vision. Hemoglobin is also falling.',
  asha: 'Pooja Sharma',
  actions: [
    'Refer to district hospital for evaluation',
    'Repeat BP twice daily at home until seen',
    'Review hemoglobin and continue IFA',
  ],
};

export const MOCK_VISITS: MockVisit[] = [
  { week: 20, date: '28 Jul', systolic: 116, diastolic: 74, sugar: 5.2, hemoglobin: 11.4, weight: 54.0, fetalHr: 142, heartRate: 72, tempF: 98.4, risk: 'LOW', symptoms: [], notes: 'Booking visit. All normal.', by: 'Pooja Sharma (ASHA)' },
  { week: 24, date: '25 Aug', systolic: 120, diastolic: 78, sugar: 5.5, hemoglobin: 11.0, weight: 55.8, fetalHr: 144, heartRate: 76, tempF: 98.6, risk: 'LOW', symptoms: ['Evening fatigue'], notes: 'Fundal height matches dates.', by: 'Pooja Sharma (ASHA)' },
  { week: 28, date: '22 Sep', systolic: 128, diastolic: 82, sugar: 6.2, hemoglobin: 10.5, weight: 57.5, fetalHr: 140, heartRate: 80, tempF: 98.5, risk: 'MODERATE', symptoms: ['Ankle swelling'], notes: 'BP trending up. Advised less salt.', by: 'Pooja Sharma (ASHA)' },
  { week: 30, date: '06 Oct', systolic: 134, diastolic: 86, sugar: 6.8, hemoglobin: 10.1, weight: 58.8, fetalHr: 146, heartRate: 84, tempF: 98.7, risk: 'MODERATE', symptoms: ['Dizziness', 'Mild swelling'], notes: 'IFA increased to twice daily.', by: 'Sunita Verma (ANM)' },
  { week: 31, date: '13 Oct', systolic: 138, diastolic: 88, sugar: 7.1, hemoglobin: 9.8, weight: 59.8, fetalHr: 148, heartRate: 86, tempF: 98.6, risk: 'MODERATE', symptoms: ['Morning headache'], notes: 'Referred to PHC medical officer.', by: 'Pooja Sharma (ASHA)' },
  { week: 32, date: '20 Oct', systolic: 144, diastolic: 92, sugar: 7.5, hemoglobin: 9.6, weight: 60.7, fetalHr: 150, heartRate: 90, tempF: 98.9, risk: 'HIGH', symptoms: ['Headache', 'Visual floaters', 'Swelling'], notes: 'Hypertension confirmed. Started Labetalol 100mg.', by: 'Dr. Suresh Chandra (MO)' },
  { week: 33, date: '27 Oct', systolic: 148, diastolic: 94, sugar: 7.8, hemoglobin: 9.4, weight: 61.6, fetalHr: 154, heartRate: 92, tempF: 98.8, risk: 'HIGH', symptoms: ['Blurred vision', 'Puffy face'], notes: 'BP still high on medication.', by: 'Pooja Sharma (ASHA)' },
  { week: 34, date: '31 Oct', systolic: 152, diastolic: 96, sugar: 8.1, hemoglobin: 9.2, weight: 62.4, fetalHr: 158, heartRate: 96, tempF: 98.9, risk: 'HIGH', symptoms: ['Severe headache', 'Blurred vision', 'Swelling'], notes: 'Labetalol raised to 200mg. Hospital referral advised.', by: 'Dr. Suresh Chandra (MO)' },
];
