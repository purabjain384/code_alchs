'use client';

import React, { useState, useEffect } from 'react';
import { EvaluateVisitApiResponse, MotherRecord } from '@/types';
import { useApp } from '@/context/AppContext';
import { RiskBadge } from './RiskBadge';
import { AudioAdvisoryPlayer } from './AudioAdvisoryPlayer';

interface RecordAncVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMother?: MotherRecord | null;
}

export const RecordAncVisitModal: React.FC<RecordAncVisitModalProps> = ({
  isOpen,
  onClose,
  initialMother,
}) => {
  const { mothers, recordVisit, currentUser } = useApp();

  const [selectedMotherId, setSelectedMotherId] = useState('');
  const [systolic, setSystolic] = useState('120');
  const [diastolic, setDiastolic] = useState('80');
  const [bloodSugar, setBloodSugar] = useState('5.4');
  const [bodyTemp, setBodyTemp] = useState('98.4');
  const [heartRate, setHeartRate] = useState('80');
  const [hb, setHb] = useState('11.0');
  const [weight, setWeight] = useState('58.0');
  const [fhr, setFhr] = useState('142');
  const [fetalMovement, setFetalMovement] = useState('Normal');
  const [issuedIfa, setIssuedIfa] = useState(true);
  const [issuedCalcium, setIssuedCalcium] = useState(true);
  const [administeredTd, setAdministeredTd] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [remarks, setRemarks] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [aiResult, setAiResult] = useState<EvaluateVisitApiResponse | null>(null);
  const [queuedOffline, setQueuedOffline] = useState(false);

  const selectedMother = mothers.find((m) => m.id === selectedMotherId) || initialMother || mothers[0];

  useEffect(() => {
    const target = initialMother || mothers[0];
    if (target) {
      setSelectedMotherId(target.id);
      const bpParts = (target.bloodPressure || '120/80').split('/');
      setSystolic(bpParts[0] || '120');
      setDiastolic(bpParts[1] || '80');
      setHb(String(target.hemoglobin ?? 11.0));
      setWeight(String(target.weight ?? 58.0));
      setFhr(String(target.fetalHeartRate ?? 142));
      setBloodSugar(String(target.bloodSugar ?? 5.4));
      setBodyTemp(String(target.bodyTemp ?? 98.4));
      setHeartRate(String(target.heartRate ?? 80));
    }
    setAiResult(null);
    setQueuedOffline(false);
  }, [initialMother, mothers, isOpen]);

  if (!isOpen) return null;

  const toggleSymptom = (sym: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMother) return;
    setIsSaving(true);
    try {
      const res = await recordVisit({
        mother_id: selectedMother.id,
        asha_id: currentUser?.asha_id || 'ASHA-704',
        age: selectedMother.age || 25,
        gestational_age_weeks: selectedMother.gestationalWeek || 24,
        vitals: {
          systolic: parseInt(systolic, 10) || 120,
          diastolic: parseInt(diastolic, 10) || 80,
          blood_sugar_mmol: parseFloat(bloodSugar) || 5.4,
          body_temp_f: parseFloat(bodyTemp) || 98.4,
          heart_rate: parseInt(heartRate, 10) || 80,
          hemoglobin: parseFloat(hb) || 11.0,
          weight_kg: parseFloat(weight) || 58.0,
          fetal_heart_rate: parseInt(fhr, 10) || 142,
          fetal_movement: fetalMovement,
          issued_ifa: issuedIfa,
          issued_calcium: issuedCalcium,
          administered_td: administeredTd,
          remarks,
        },
        symptoms: selectedSymptoms,
      });

      if (res.queuedOffline) {
        setQueuedOffline(true);
      } else if (res.response) {
        setAiResult(res.response);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setAiResult(null);
    setQueuedOffline(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/70 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="bg-secondary px-6 py-4 text-on-secondary flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[26px]">
              medical_services
            </span>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Record Clinical ANC Visit & 3-Layer AI Triage
              </h3>
              <p className="text-[11px] text-on-secondary/80">
                प्रसवपूर्व जांच लॉग • UCI 6-Feature ML + MoHFW Protocols + Gemini 3.8 Flash
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-full text-on-secondary/80 hover:text-white hover:bg-black/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {mothers.length === 0 && !initialMother ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-sm font-bold text-on-surface">
                No expectant mothers registered yet.
              </p>
              <p className="text-xs text-on-surface-variant">
                Please register a mother or import rows from your dataset first before recording an ANC visit.
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl bg-primary-container text-on-primary text-xs font-bold"
              >
                Close
              </button>
            </div>
          ) : queuedOffline ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[30px]">cloud_off</span>
              </div>
              <h4 className="text-lg font-extrabold text-primary-container">
                Saved to Offline Queue!
              </h4>
              <p className="text-xs text-on-surface-variant max-w-md mx-auto">
                Backend is currently unreachable. This ANC visit has been stored in localStorage and can be synced using the &ldquo;Sync Offline Queue&rdquo; button.
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2.5 rounded-xl bg-secondary text-on-secondary text-xs font-bold"
              >
                Done
              </button>
            </div>
          ) : aiResult ? (
            <div className="space-y-4 animate-in zoom-in-95">
              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase text-on-surface-variant">
                    AI Clinical Triage Result ({aiResult.mother_id})
                  </span>
                  <h4 className="text-lg font-extrabold text-primary-container mt-0.5">
                    Urgency Score: {Math.round(aiResult.urgency_score * 100)}%
                  </h4>
                </div>
                <RiskBadge level={aiResult.frontend_risk_level} />
              </div>

              {/* Explainability Badges */}
              <div className="flex flex-wrap gap-1.5">
                {aiResult.ai_explainability.map((flag, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-error-container/30 text-on-surface text-xs font-bold border border-outline-variant/30"
                  >
                    {flag}
                  </span>
                ))}
              </div>

              {/* English Summary & Action Items */}
              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 text-xs space-y-2">
                <strong className="text-primary-container block">
                  Clinical Summary & Trajectory:
                </strong>
                <p className="text-on-surface leading-relaxed">{aiResult.english_summary}</p>
                <ul className="list-disc pl-4 space-y-1 text-on-surface-variant font-medium">
                  {aiResult.action_items_en.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Playable Hindi Voice Advisory */}
              <AudioAdvisoryPlayer
                motherName={selectedMother?.name}
                hindiAdvisory={aiResult.hindi_text}
                englishTranslation={aiResult.english_summary}
                audioBase64={aiResult.audio_base64}
              />

              <button
                type="button"
                onClick={handleClose}
                className="w-full py-2.5 rounded-xl bg-primary-container text-on-primary text-xs font-bold shadow-md"
              >
                Close & Return to Dashboard
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Select Expectant Mother / गर्भवती महिला चुनें
                </label>
                <select
                  value={selectedMotherId}
                  onChange={(e) => setSelectedMotherId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface font-semibold"
                >
                  {mothers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.id}) • Age {m.age} • Week {m.gestationalWeek} (T{m.trimester})
                    </option>
                  ))}
                </select>
              </div>

              {/* Section 1: 6 UCI ML Vitals + NHM Vitals */}
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-secondary block">
                  1. Maternal Vitals (6 UCI ML Features + NHM Clinical Vitals)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                      Systolic BP (mmHg) *
                    </label>
                    <input
                      type="number"
                      required
                      value={systolic}
                      onChange={(e) => setSystolic(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-xs font-bold text-on-surface"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                      Diastolic BP (mmHg) *
                    </label>
                    <input
                      type="number"
                      required
                      value={diastolic}
                      onChange={(e) => setDiastolic(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-xs font-bold text-on-surface"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                      Blood Sugar (mmol/L or mg/dL) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={bloodSugar}
                      onChange={(e) => setBloodSugar(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-xs font-bold text-on-surface"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                      Body Temp (°F or °C) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={bodyTemp}
                      onChange={(e) => setBodyTemp(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-xs font-bold text-on-surface"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                      Maternal Heart Rate (bpm) *
                    </label>
                    <input
                      type="number"
                      required
                      value={heartRate}
                      onChange={(e) => setHeartRate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-xs font-bold text-on-surface"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                      Hemoglobin Hb (g/dL) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={hb}
                      onChange={(e) => setHb(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-xs font-bold text-on-surface"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                      Weight (kg) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-xs font-bold text-on-surface"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                      Fetal Heart Rate (bpm) *
                    </label>
                    <input
                      type="number"
                      required
                      value={fhr}
                      onChange={(e) => setFhr(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-xs font-bold text-on-surface"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Fetal Movement & Danger Symptoms */}
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                    2. Fetal Movement & Danger Symptoms (खतरे के लक्षण)
                  </span>
                  <select
                    value={fetalMovement}
                    onChange={(e) => setFetalMovement(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-xs font-semibold text-on-surface"
                  >
                    <option value="Normal">Fetal Movement: Normal (&gt;10 kicks)</option>
                    <option value="Reduced">Fetal Movement: Reduced (&lt;10 kicks)</option>
                    <option value="Absent">Fetal Movement: Absent (Emergency)</option>
                  </select>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    'severe headache',
                    'blurred vision',
                    'swelling',
                    'bleeding',
                    'convulsions',
                  ].map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => toggleSymptom(sym)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize border transition-all ${
                        selectedSymptoms.includes(sym)
                          ? 'bg-error text-on-error border-error'
                          : 'bg-surface-container-lowest text-on-surface border-outline-variant/40'
                      }`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 3: NHM Supplements */}
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-secondary block">
                  3. NHM Prophylaxis & Supplements Issued
                </span>
                <div className="flex flex-wrap gap-4 pt-1 text-xs font-semibold text-on-surface">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={issuedIfa}
                      onChange={(e) => setIssuedIfa(e.target.checked)}
                      className="w-4 h-4 accent-secondary rounded"
                    />
                    <span>IFA Tablets (30 Strip)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={issuedCalcium}
                      onChange={(e) => setIssuedCalcium(e.target.checked)}
                      className="w-4 h-4 accent-secondary rounded"
                    />
                    <span>Calcium 500mg</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={administeredTd}
                      onChange={(e) => setAdministeredTd(e.target.checked)}
                      className="w-4 h-4 accent-secondary rounded"
                    />
                    <span>Td Vaccine Dose</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Clinical Notes / ASHA Observation
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mild pedal edema noted, advised left-lateral rest..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-secondary hover:bg-secondary/90 text-on-secondary text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">psychology</span>
                  <span>{isSaving ? 'Running AI Triage...' : 'Evaluate & Save Visit'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
