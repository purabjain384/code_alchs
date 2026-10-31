'use client';

import React, { useEffect, useState } from 'react';
import { MotherRecord, MotherSummaryApiResponse } from '@/types';
import { fetchMotherHistorySummary } from '@/lib/api';
import { RiskBadge } from './RiskBadge';
import { AudioAdvisoryPlayer } from './AudioAdvisoryPlayer';

interface MotherProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  mother: MotherRecord | null;
  onOpenAncModal?: (mother: MotherRecord) => void;
  onOpenSosModal?: (mother: MotherRecord) => void;
}

export const MotherProfileModal: React.FC<MotherProfileModalProps> = ({
  isOpen,
  onClose,
  mother,
  onOpenAncModal,
  onOpenSosModal,
}) => {
  const [summaryData, setSummaryData] = useState<MotherSummaryApiResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && mother) {
      setLoading(true);
      fetchMotherHistorySummary(mother.id)
        .then((res) => setSummaryData(res))
        .catch(() => setSummaryData(null))
        .finally(() => setLoading(false));
    }
  }, [isOpen, mother]);

  if (!isOpen || !mother) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/70 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-primary-container px-6 py-4 text-on-primary flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-white/15 text-xs font-bold">
                {mother.id}
              </span>
              <h3 className="font-bold text-lg">
                {mother.name} {mother.hindiName && `(${mother.hindiName})`}
              </h3>
            </div>
            <p className="text-xs text-primary-fixed/80 mt-0.5">
              Age {mother.age} yrs • Week {mother.gestationalWeek} (Trimester {mother.trimester}) • {mother.ward}, {mother.village}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-primary-fixed hover:text-white hover:bg-white/10"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Top Vitals Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
              <span className="text-[10px] font-bold uppercase text-on-surface-variant">Blood Pressure</span>
              <p className="text-base font-extrabold text-on-surface mt-0.5">{mother.bloodPressure} mmHg</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
              <span className="text-[10px] font-bold uppercase text-on-surface-variant">Hemoglobin & Weight</span>
              <p className="text-base font-extrabold text-on-surface mt-0.5">{mother.hemoglobin} g/dL • {mother.weight} kg</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
              <span className="text-[10px] font-bold uppercase text-on-surface-variant">Sugar & Temp</span>
              <p className="text-base font-extrabold text-on-surface mt-0.5">
                {mother.bloodSugar ?? 5.2} mmol/L • {mother.bodyTemp ?? 98.4} °F
              </p>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
              <span className="text-[10px] font-bold uppercase text-on-surface-variant">Heart Rate & FHR</span>
              <p className="text-base font-extrabold text-on-surface mt-0.5">
                HR {mother.heartRate ?? 78} • FHR {mother.fetalHeartRate} bpm
              </p>
            </div>
          </div>

          {/* Explainable AI Risk Flags */}
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-primary-container">
                3-Layer AI Risk Assessment & Explainability
              </span>
              <RiskBadge level={mother.riskLevel} />
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(mother.aiExplainability || [mother.riskReason || 'Routine ANC']).map((flag, i) => (
                <span
                  key={i}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-surface-container-lowest border border-outline-variant/30 text-on-surface"
                >
                  {flag}
                </span>
              ))}
            </div>
          </div>

          {/* 5-Visit Longitudinal Progression Summary (Gemini 3.8 Flash) */}
          <div className="p-4 rounded-xl bg-secondary-container/20 border border-secondary-container space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">timeline</span>
                Multi-Visit Progression Summary (Last {summaryData?.visits_analyzed ?? 0} Visits)
              </h4>
            </div>
            {loading ? (
              <p className="text-xs text-on-surface-variant animate-pulse">
                Loading longitudinal trajectory from Gemini 3.8 Flash...
              </p>
            ) : summaryData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-lg bg-surface-container-lowest text-xs space-y-1 whitespace-pre-line">
                  <strong className="text-primary-container block mb-1">English Progression Summary:</strong>
                  {summaryData.summary_en}
                </div>
                <div className="p-3 rounded-lg bg-surface-container-lowest text-xs space-y-1 whitespace-pre-line">
                  <strong className="text-secondary block mb-1">हिंदी प्रगति सारांश:</strong>
                  {summaryData.summary_hi}
                </div>
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant">No prior visit trajectory available.</p>
            )}
          </div>

          {/* Playable Hindi Voice Advisory */}
          <AudioAdvisoryPlayer
            motherName={mother.name}
            hindiAdvisory={
              mother.aiHindiAdvisory ||
              `नमस्ते ${mother.name}, आपका वर्तमान ब्लड प्रेशर ${mother.bloodPressure} और हीमोग्लोबिन ${mother.hemoglobin} ग्राम है।`
            }
            englishTranslation={
              mother.aiEnglishSummary ||
              `Current BP is ${mother.bloodPressure} mmHg and Hemoglobin is ${mother.hemoglobin} g/dL.`
            }
            audioBase64={mother.audioBase64}
          />

          {/* Historical Visit Log Table */}
          {summaryData && summaryData.visits.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                Recorded ANC Visit History ({summaryData.visits.length})
              </h4>
              <div className="overflow-x-auto border border-outline-variant/20 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-surface-container-low text-on-surface-variant">
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">BP</th>
                      <th className="py-2 px-3">Hb</th>
                      <th className="py-2 px-3">Sugar</th>
                      <th className="py-2 px-3">Temp / HR</th>
                      <th className="py-2 px-3">Triage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/15">
                    {summaryData.visits.map((v) => (
                      <tr key={v.visit_id}>
                        <td className="py-2 px-3 font-medium">
                          {new Date(v.timestamp).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-3 font-bold">
                          {v.vitals.systolic}/{v.vitals.diastolic}
                        </td>
                        <td className="py-2 px-3">{v.vitals.hemoglobin ?? '-'} g/dL</td>
                        <td className="py-2 px-3">{v.vitals.blood_sugar_mmol} mmol/L</td>
                        <td className="py-2 px-3">
                          {v.vitals.body_temp_f}°F / {v.vitals.heart_rate} bpm
                        </td>
                        <td className="py-2 px-3">
                          <RiskBadge level={v.frontend_risk_level} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 bg-surface-container-low border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {onOpenAncModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAncModal(mother);
                }}
                className="px-4 py-2 rounded-xl bg-secondary text-on-secondary text-xs font-bold shadow-xs"
              >
                + Record New ANC Visit
              </button>
            )}
            {onOpenSosModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSosModal(mother);
                }}
                className="px-4 py-2 rounded-xl bg-error text-on-error text-xs font-bold shadow-xs"
              >
                108 Emergency Referral
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

