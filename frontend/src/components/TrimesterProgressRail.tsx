'use strict';
import React from 'react';

interface TrimesterProgressRailProps {
  currentWeek?: number;
  eddDate?: string;
  daysRemaining?: number;
  lastCheckupDate?: string;
  nextCheckupDate?: string;
}

export const TrimesterProgressRail: React.FC<TrimesterProgressRailProps> = ({
  currentWeek = 28,
  eddDate = '23 January 2027',
  daysRemaining = 84,
  lastCheckupDate = '24 October 2026',
  nextCheckupDate = '5 November 2026',
}) => {
  // 40 weeks total
  const overallPercentage = Math.round((currentWeek / 40) * 100);

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-outline-variant/30 p-5 md:p-6 flex flex-col gap-5">
      {/* Top Header & EDD Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs uppercase font-bold text-secondary tracking-widest">
            माहवारी चक्र एवं अनुमानित प्रसव तिथि
          </span>
          <h2 className="text-xl font-bold text-primary-container tracking-tight">
            गर्भावस्था प्रगति (Pregnancy Progress Tracker)
          </h2>
        </div>

        <div className="flex items-center gap-3 bg-secondary-container/30 px-4 py-2 rounded-xl text-on-secondary-fixed-variant border border-secondary-container/50">
          <span className="material-symbols-outlined text-[26px] text-secondary">
            calendar_month
          </span>
          <div className="flex flex-col text-left">
            <span className="text-[10px] uppercase font-bold text-secondary">
              प्रसव की अपेक्षित तिथि (EDD)
            </span>
            <span className="text-sm font-bold text-on-surface">
              {eddDate} <span className="text-secondary">({daysRemaining} दिन शेष)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Visual Multi-segment Progress Bar */}
      <div className="flex flex-col gap-2 pt-1">
        <div className="flex items-center justify-between text-xs font-bold text-on-surface">
          <span className="flex items-center gap-1.5 text-secondary">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
            सप्ताह {currentWeek} (Week {currentWeek} Active)
          </span>
          <span className="text-on-surface-variant font-medium">
            तीसरी तिमाही (Third Trimester) • {overallPercentage}% पूर्ण
          </span>
        </div>

        {/* 3-Part Bar */}
        <div className="w-full h-3.5 bg-surface-container rounded-full overflow-hidden flex p-0.5 shadow-inner">
          {/* Trimester 1 (Weeks 1-12 = 30%) */}
          <div
            className="h-full bg-secondary rounded-l-full relative transition-all"
            style={{ width: '30%' }}
            title="Trimester 1: Completed"
          />
          <div className="w-0.5 h-full bg-surface-container-lowest" />

          {/* Trimester 2 (Weeks 13-26 = 35%) */}
          <div
            className="h-full bg-secondary relative transition-all"
            style={{ width: '35%' }}
            title="Trimester 2: Completed"
          />
          <div className="w-0.5 h-full bg-surface-container-lowest" />

          {/* Trimester 3 (Weeks 27-40 = 35%) */}
          <div className="h-full bg-surface-container relative flex-1">
            <div
              className="h-full bg-tertiary-fixed rounded-r-full shadow-xs"
              style={{ width: `${Math.max(10, ((currentWeek - 26) / 14) * 100)}%` }}
              title={`Trimester 3: Active Week ${currentWeek}`}
            />
          </div>
        </div>

        {/* Checkpoint Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-lg bg-surface-container-low flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] text-on-surface-variant">तिमाही 1 (Trimester 1)</span>
              <span className="text-xs font-bold text-on-surface">सप्ताह 1 - 12</span>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-bold text-secondary bg-secondary-container/50 px-2 py-0.5 rounded-full">
              <span className="material-symbols-outlined text-[13px]">check_circle</span> संपन्न ✓
            </span>
          </div>

          <div className="p-3 rounded-lg bg-surface-container-low flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] text-on-surface-variant">तिमाही 2 (Trimester 2)</span>
              <span className="text-xs font-bold text-on-surface">सप्ताह 13 - 26</span>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-bold text-secondary bg-secondary-container/50 px-2 py-0.5 rounded-full">
              <span className="material-symbols-outlined text-[13px]">check_circle</span> संपन्न ✓
            </span>
          </div>

          <div className="p-3 rounded-lg bg-tertiary-fixed/30 border border-tertiary-container/30 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-on-tertiary-fixed">तिमाही 3 (Trimester 3)</span>
              <span className="text-xs font-bold text-on-surface">सप्ताह 27 - 40 • चालू</span>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-bold text-primary-container bg-surface-container-lowest px-2 py-0.5 rounded-full shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" /> वर्तमान (W{currentWeek})
            </span>
          </div>
        </div>
      </div>

      {/* Checkup Schedule Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-low/70 p-4 rounded-xl border border-outline-variant/15">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-surface-container-lowest flex items-center justify-center text-secondary shadow-xs">
            <span className="material-symbols-outlined text-[18px]">event_repeat</span>
          </div>
          <div>
            <span className="text-[11px] text-on-surface-variant font-medium">
              पिछली जाँच (Last Checkup)
            </span>
            <p className="text-xs font-bold text-on-surface">
              {lastCheckupDate} <span className="text-secondary">(सामान्य स्थिति)</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-[18px]">notification_important</span>
          </div>
          <div>
            <span className="text-[11px] text-secondary font-bold">
              आगामी जाँच (Next Scheduled Visit)
            </span>
            <p className="text-xs font-bold text-on-surface">
              {nextCheckupDate} <span className="text-secondary font-normal">(12 दिनों में)</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

