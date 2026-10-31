'use client';

import React, { useState } from 'react';
import { MotherRecord } from '@/types';

interface RecordAncVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  mother: MotherRecord;
  onSaved: (updatedMother: MotherRecord) => void;
}

export const RecordAncVisitModal: React.FC<RecordAncVisitModalProps> = ({
  isOpen,
  onClose,
  mother,
  onSaved,
}) => {
  const [systolic, setSystolic] = useState(
    mother.bloodPressure.split('/')[0]?.replace(/[^0-9]/g, '') || '120'
  );
  const [diastolic, setDiastolic] = useState(
    mother.bloodPressure.split('/')[1]?.replace(/[^0-9]/g, '') || '80'
  );
  const [hb, setHb] = useState(mother.hemoglobin.toString());
  const [weight, setWeight] = useState(mother.weight.toString());
  const [fhr, setFhr] = useState(mother.fetalHeartRate.toString());
  const [fetalMovement, setFetalMovement] = useState('Normal (10+ kicks/12h)');
  const [issuedIfa, setIssuedIfa] = useState(true);
  const [issuedCalcium, setIssuedCalcium] = useState(true);
  const [administeredTd, setAdministeredTd] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const sysNum = parseInt(systolic) || 120;
    const diaNum = parseInt(diastolic) || 80;
    const hbNum = parseFloat(hb) || 11.0;
    const weightNum = parseFloat(weight) || 60;
    const fhrNum = parseInt(fhr) || 140;

    let updatedRisk = mother.riskLevel;
    if (sysNum >= 140 || diaNum >= 90) {
      updatedRisk = 'HIGH';
    } else if (hbNum < 9.0) {
      updatedRisk = 'MODERATE';
    }

    const updatedMother: MotherRecord = {
      ...mother,
      bloodPressure: `${sysNum}/${diaNum} mmHg`,
      hemoglobin: hbNum,
      weight: weightNum,
      fetalHeartRate: fhrNum,
      riskLevel: updatedRisk,
      lastVisitDate: 'Today (ANC Visit)',
      isOverdue: false,
      overdueText: undefined,
      nextDueDate: '14 Nov 2026',
    };

    setIsSaved(true);
    setTimeout(() => {
      onSaved(updatedMother);
      setIsSaved(false);
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/70 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-2xl border border-secondary/30 overflow-hidden">
        {/* Header */}
        <div className="bg-secondary px-6 py-4 text-on-secondary flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[22px]">clinical_notes</span>
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Record ANC Visit / प्रसव पूर्व जाँच
              </h3>
              <p className="text-[11px] text-secondary-fixed">
                {mother.name} ({mother.id}) • Week {mother.gestationalWeek} (T{mother.trimester})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-secondary-fixed hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isSaved ? (
            <div className="text-center py-6 space-y-3 animate-in zoom-in-95">
              <div className="w-14 h-14 rounded-full bg-secondary-container text-secondary flex items-center justify-center mx-auto shadow-sm">
                <span className="material-symbols-outlined text-[32px]">task_alt</span>
              </div>
              <h4 className="text-lg font-bold text-primary-container">
                ANC Encounter Saved & Synchronized!
              </h4>
              <p className="text-xs text-on-surface-variant">
                Updated in Maternal Care OS ledger and added to PHC clinic queue.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Primary Vitals Grid */}
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3">
                <span className="font-bold text-primary-container block">
                  Vital Signs & Clinical Examination
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                      BP Sys (mmHg)
                    </label>
                    <input
                      type="number"
                      required
                      value={systolic}
                      onChange={(e) => setSystolic(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                      BP Dia (mmHg)
                    </label>
                    <input
                      type="number"
                      required
                      value={diastolic}
                      onChange={(e) => setDiastolic(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                      Hb (g/dL)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={hb}
                      onChange={(e) => setHb(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                      Fetal Heart Rate (bpm)
                    </label>
                    <input
                      type="number"
                      value={fhr}
                      onChange={(e) => setFhr(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 font-bold text-secondary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                      Fetal Movement Log
                    </label>
                    <select
                      value={fetalMovement}
                      onChange={(e) => setFetalMovement(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 font-medium"
                    >
                      <option value="Normal (10+ kicks/12h)">Normal (10+ kicks/12h)</option>
                      <option value="Slightly Reduced">Slightly Reduced</option>
                      <option value="Absent / Emergency">Absent / Emergency</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Interventions / Medications Delivered */}
              <div>
                <span className="font-bold text-on-surface block mb-2">
                  Interventions Administered / दवाइयाँ
                </span>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-low cursor-pointer hover:bg-surface-container">
                    <input
                      type="checkbox"
                      checked={issuedIfa}
                      onChange={(e) => setIssuedIfa(e.target.checked)}
                      className="rounded accent-secondary w-4 h-4"
                    />
                    <span className="font-semibold text-on-surface">
                      Issued 100 IFA Tablets (Iron & Folic Acid)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-low cursor-pointer hover:bg-surface-container">
                    <input
                      type="checkbox"
                      checked={issuedCalcium}
                      onChange={(e) => setIssuedCalcium(e.target.checked)}
                      className="rounded accent-secondary w-4 h-4"
                    />
                    <span className="font-semibold text-on-surface">
                      Issued Calcium & Vitamin D3 Tablets
                    </span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-low cursor-pointer hover:bg-surface-container">
                    <input
                      type="checkbox"
                      checked={administeredTd}
                      onChange={(e) => setAdministeredTd(e.target.checked)}
                      className="rounded accent-secondary w-4 h-4"
                    />
                    <span className="font-semibold text-on-surface">
                      Administered Td Booster Vaccine
                    </span>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                  Field Observations & Clinical Remarks
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Advised rest, salt reduction, and next checkup at PHC."
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface font-medium focus:outline-none focus:border-secondary"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-3 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-on-secondary font-bold hover:bg-secondary/90 transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  <span>Save Encounter</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

