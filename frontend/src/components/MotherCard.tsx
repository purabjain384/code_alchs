'use client';

import React from 'react';
import Image from 'next/image';
import { MotherRecord } from '@/types';
import { RiskBadge } from './RiskBadge';

interface MotherCardProps {
  mother: MotherRecord;
  onStartAssessment?: (mother: MotherRecord) => void;
  onViewProfile?: (mother: MotherRecord) => void;
  onReferral?: (mother: MotherRecord) => void;
}

export const MotherCard: React.FC<MotherCardProps> = ({
  mother,
  onStartAssessment,
  onViewProfile,
  onReferral,
}) => {
  const getBorderColor = () => {
    if (mother.riskLevel === 'HIGH') return 'w-2 bg-error';
    if (mother.riskLevel === 'MODERATE') return 'w-2 bg-tertiary-container';
    return 'w-2 bg-secondary';
  };

  return (
    <article className="p-5 rounded-xl bg-surface-container-lowest shadow-xs border border-outline-variant/20 hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
      {/* Left accent strip */}
      <div className={`absolute left-0 top-0 bottom-0 ${getBorderColor()}`} />

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pl-1">
        {/* Left Information with Avatar */}
        <div className="flex items-start gap-4">
          <div className="relative w-14 h-14 rounded-full overflow-hidden shrink-0 shadow-xs ring-2 ring-outline-variant/30">
            <Image
              src={mother.avatarUrl}
              alt={mother.name}
              fill
              sizes="56px"
              unoptimized
              className="object-cover"
            />
            {mother.riskLevel === 'HIGH' && (
              <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-error flex items-center justify-center text-[10px] text-on-error font-bold ring-1 ring-white">
                !
              </span>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-surface-container-high text-on-surface">
                {mother.id}
              </span>
              <h3 className="text-base font-bold text-on-surface">
                {mother.name}{' '}
                {mother.hindiName && (
                  <span className="text-xs font-normal text-on-surface-variant">
                    ({mother.hindiName})
                  </span>
                )}
              </h3>
              <span className="text-xs font-bold text-secondary bg-secondary-container/50 px-2 py-0.5 rounded-full">
                Week {mother.gestationalWeek} (T{mother.trimester})
              </span>
            </div>

            {/* Risk banner or flags */}
            {mother.riskLevel === 'HIGH' ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-error-container text-on-error-container text-xs font-bold">
                <span className="material-symbols-outlined text-[16px] text-error">
                  warning
                </span>
                <span>HIGH RISK: {mother.riskReason || mother.flags.join(', ')}</span>
              </div>
            ) : mother.riskLevel === 'MODERATE' ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-tertiary-fixed/40 text-on-tertiary-fixed-variant text-xs font-bold">
                <span className="material-symbols-outlined text-[16px] text-tertiary">
                  medication
                </span>
                <span>Follow-up: {mother.riskReason || mother.flags.join(', ')}</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container text-on-surface text-xs font-semibold">
                <span className="material-symbols-outlined text-[16px] text-secondary">
                  monitor_heart
                </span>
                <span>Routine Gestational Check & Vitals Log</span>
              </div>
            )}

            {/* Location & Details */}
            <p className="text-xs text-on-surface-variant flex items-center gap-1 pt-0.5">
              <span className="material-symbols-outlined text-[15px] text-on-surface-variant">
                location_on
              </span>
              <span>{mother.ward}, {mother.village}</span>
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-on-surface-variant pt-1 font-medium">
              <span>
                Last Visit: <strong className="text-on-surface">{mother.lastVisitDate}</strong>
              </span>
              <span className={mother.isOverdue ? 'text-error font-bold flex items-center gap-1' : 'text-secondary font-bold'}>
                {mother.isOverdue && (
                  <span className="material-symbols-outlined text-[14px]">alarm</span>
                )}
                Due: {mother.nextDueDate} {mother.overdueText && `(${mother.overdueText})`}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Phone Call Action */}
        <div className="shrink-0 flex sm:flex-col items-center sm:items-end gap-2">
          <a
            href={`tel:${mother.assignedAsha.phone.replace(/[^0-9]/g, '')}`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container-highest text-xs font-bold transition-colors"
          >
            <span className="material-symbols-outlined text-secondary text-[16px]">call</span>
            <span>Call: {mother.assignedAsha.phone}</span>
          </a>
          <span className="text-[11px] text-on-surface-variant font-medium">
            ASHA: {mother.assignedAsha.name}
          </span>
        </div>
      </div>

      {/* Action Buttons Toolbar */}
      <div className="mt-4 pt-3 flex flex-wrap items-center gap-2 bg-surface-container-low -mx-5 -mb-5 px-5 py-2.5 rounded-b-xl border-t border-outline-variant/15">
        <button
          type="button"
          onClick={() => onStartAssessment && onStartAssessment(mother)}
          className="flex-1 min-w-[180px] flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-secondary text-on-secondary text-xs font-bold hover:bg-secondary/90 shadow-xs transition-all active:scale-98"
        >
          <span className="material-symbols-outlined text-[18px]">medical_services</span>
          <span>Start ANC-{mother.trimester} Assessment</span>
        </button>

        <button
          type="button"
          onClick={() => onViewProfile && onViewProfile(mother)}
          className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container text-xs font-bold transition-all shadow-xs"
        >
          <span className="material-symbols-outlined text-[16px]">person</span>
          <span>Clinical Profile</span>
        </button>

        <button
          type="button"
          onClick={() => onReferral && onReferral(mother)}
          className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-error-container text-on-error-container hover:bg-error hover:text-on-error text-xs font-bold transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">ambulance</span>
          <span>PHC Referral</span>
        </button>
      </div>
    </article>
  );
};

