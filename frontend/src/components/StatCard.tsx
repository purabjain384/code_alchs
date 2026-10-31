'use strict';
import React from 'react';

export interface StatCardProps {
  title: string;
  bilingualTitle?: string;
  value: string | number;
  subValue?: string;
  trend?: {
    text: string;
    positive?: boolean;
    neutral?: boolean;
    icon?: string;
  };
  icon: string;
  accentColor?: 'primary' | 'secondary' | 'error' | 'tertiary';
  leftBorderColor?: string;
  badge?: {
    text: string;
    variant: 'error' | 'secondary' | 'tertiary' | 'primary';
  };
  footerLeft?: string;
  footerRight?: string;
  tags?: Array<{
    label: string;
    color?: string;
  }>;
  progressRing?: {
    percentage: number;
    label?: string;
  };
  className?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  bilingualTitle,
  value,
  subValue,
  trend,
  icon,
  accentColor = 'secondary',
  leftBorderColor,
  badge,
  footerLeft,
  footerRight,
  tags,
  progressRing,
  className = '',
  onClick,
}) => {
  const getIconContainerStyle = () => {
    switch (accentColor) {
      case 'error':
        return 'bg-error-container/60 text-error';
      case 'tertiary':
        return 'bg-tertiary-fixed text-on-tertiary-fixed';
      case 'primary':
        return 'bg-surface-container-high text-primary-container';
      default:
        return 'bg-secondary-container/50 text-secondary';
    }
  };

  const getValueColor = () => {
    if (accentColor === 'error') return 'text-error';
    if (accentColor === 'secondary') return 'text-secondary';
    return 'text-primary-container';
  };

  return (
    <div
      onClick={onClick}
      className={`bg-surface-container-lowest p-5 rounded-xl shadow-xs border border-outline-variant/20 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {leftBorderColor && (
        <div
          className={`absolute left-0 top-0 bottom-0 w-1.5 ${leftBorderColor}`}
        />
      )}

      {/* Top row: Title + Icon */}
      <div className={`flex items-start justify-between ${leftBorderColor ? 'pl-1' : ''}`}>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs uppercase tracking-wider text-on-surface-variant font-bold">
              {title}
            </span>
            {badge && (
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  badge.variant === 'error'
                    ? 'bg-error-container text-on-error-container'
                    : badge.variant === 'secondary'
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'bg-tertiary-fixed text-on-tertiary-fixed'
                }`}
              >
                {badge.text}
              </span>
            )}
          </div>
          {bilingualTitle && (
            <p className="text-[11px] text-on-surface-variant/80 font-medium">
              {bilingualTitle}
            </p>
          )}

          {/* Numeric Value & Trend */}
          <div className="flex items-baseline gap-2 pt-1">
            <span className={`text-3xl font-extrabold tracking-tight ${getValueColor()}`}>
              {value}
            </span>
            {subValue && (
              <span className="text-sm font-semibold text-on-surface-variant">
                {subValue}
              </span>
            )}
            {trend && (
              <span
                className={`text-xs font-bold flex items-center gap-0.5 ${
                  trend.positive
                    ? 'text-secondary'
                    : trend.neutral
                    ? 'text-tertiary'
                    : 'text-error'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">
                  {trend.icon || (trend.positive ? 'trending_up' : 'trending_down')}
                </span>
                {trend.text}
              </span>
            )}
          </div>
        </div>

        {/* Right Icon or Progress Ring */}
        {progressRing ? (
          <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-surface-container-highest"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
              />
              <path
                className="text-secondary"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeDasharray={`${progressRing.percentage}, 100`}
                strokeLinecap="round"
                strokeWidth="3.5"
              />
            </svg>
            <span className="absolute text-[11px] font-bold text-on-surface">
              {progressRing.percentage}%
            </span>
          </div>
        ) : (
          <div
            className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 shadow-xs ${getIconContainerStyle()}`}
          >
            <span className="material-symbols-outlined text-[24px]">{icon}</span>
          </div>
        )}
      </div>

      {/* Tags row (e.g. Pre-eclampsia 28, Sev Anemia 34) */}
      {tags && tags.length > 0 && (
        <div className="mt-3 pt-1 flex items-center gap-1.5 flex-wrap">
          {tags.map((tag, idx) => (
            <span
              key={idx}
              className={`px-2 py-0.5 rounded text-[11px] font-bold bg-surface-container-low ${
                tag.color || 'text-error'
              }`}
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {/* Bottom info footer */}
      {(footerLeft || footerRight) && (
        <div className="mt-4 pt-2.5 -mx-5 -mb-5 px-5 pb-2.5 bg-surface-container-low/60 flex items-center justify-between text-xs text-on-surface-variant font-medium border-t border-outline-variant/15">
          <span>{footerLeft}</span>
          {footerRight && (
            <span className="font-bold text-secondary">{footerRight}</span>
          )}
        </div>
      )}
    </div>
  );
};

