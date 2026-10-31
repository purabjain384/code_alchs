'use strict';
import React from 'react';
import { RiskLevel } from '@/types';

interface RiskBadgeProps {
  level: RiskLevel;
  label?: string;
  className?: string;
  showDot?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  label,
  className = '',
  showDot = true,
}) => {
  if (level === 'HIGH') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container text-[11px] font-bold tracking-wide uppercase ${className}`}
      >
        {showDot && <span className="w-2 h-2 rounded-full bg-error animate-pulse" />}
        {label || 'High Risk / गंभीर'}
      </span>
    );
  }

  if (level === 'MODERATE') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-tertiary-fixed/40 text-on-tertiary-fixed-variant text-[11px] font-bold tracking-wide uppercase ${className}`}
      >
        {showDot && <span className="w-2 h-2 rounded-full bg-tertiary-container" />}
        {label || 'Moderate / मध्यम'}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary-container/40 text-on-secondary-container text-[11px] font-bold tracking-wide uppercase ${className}`}
    >
      {showDot && <span className="w-2 h-2 rounded-full bg-secondary" />}
      {label || 'Low Risk / सामान्य'}
    </span>
  );
};

