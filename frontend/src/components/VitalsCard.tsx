'use strict';
import React from 'react';

interface VitalsCardProps {
  title: string;
  hindiTitle?: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  statusText: string;
  statusType?: 'success' | 'warning' | 'error' | 'info';
  icon: string;
  tagline?: string;
}

export const VitalsCard: React.FC<VitalsCardProps> = ({
  title,
  hindiTitle,
  value,
  unit,
  subtitle,
  statusText,
  statusType = 'success',
  icon,
  tagline,
}) => {
  const getBadgeStyle = () => {
    switch (statusType) {
      case 'error':
        return 'bg-error-container text-on-error-container';
      case 'warning':
        return 'bg-tertiary-fixed/50 text-on-tertiary-fixed-variant';
      case 'info':
        return 'bg-surface-container-high text-on-surface';
      default:
        return 'bg-secondary-container/40 text-secondary';
    }
  };

  const getIconColor = () => {
    switch (statusType) {
      case 'error':
        return 'text-error';
      case 'warning':
        return 'text-tertiary';
      default:
        return 'text-secondary';
    }
  };

  return (
    <div className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant/20 hover:shadow-md transition-shadow flex flex-col justify-between">
      {/* Top Title and Icon */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs uppercase font-bold text-on-surface-variant tracking-wider">
            {title}
          </span>
          {hindiTitle && (
            <p className="text-[11px] text-on-surface-variant/80 font-medium">{hindiTitle}</p>
          )}
        </div>
        <div
          className={`w-9 h-9 rounded-full bg-secondary-container/40 ${getIconColor()} flex items-center justify-center`}
        >
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
      </div>

      {/* Metric Value */}
      <div className="my-3">
        <div className="text-2xl lg:text-3xl font-extrabold text-on-surface tracking-tight">
          {value}{' '}
          {unit && <span className="text-sm font-semibold text-on-surface-variant">{unit}</span>}
        </div>
        {subtitle && (
          <span className="text-xs font-semibold text-secondary block mt-0.5">
            {subtitle}
          </span>
        )}
      </div>

      {/* Status Pill */}
      <div>
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${getBadgeStyle()}`}
        >
          <span className="material-symbols-outlined text-[14px]">
            {statusType === 'error' ? 'error' : statusType === 'warning' ? 'warning' : 'check_circle'}
          </span>
          <span>{statusText}</span>
        </div>
        {tagline && (
          <p className="text-[11px] text-on-surface-variant mt-1.5">{tagline}</p>
        )}
      </div>
    </div>
  );
};

