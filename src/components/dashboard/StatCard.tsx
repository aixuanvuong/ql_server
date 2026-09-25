// filepath: frontend/src/components/dashboard/StatCard.tsx
import React, { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: ReactNode;
  colorClass?: string;
  progressPercent?: number;
  extraBadge?: string;
  badgeColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit = '',
  subtitle,
  icon,
  colorClass = 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  progressPercent,
  extraBadge,
  badgeColor = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-lg flex flex-col justify-between relative overflow-hidden transition-colors">
      {/* Top row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-xl border flex items-center justify-center ${colorClass}`}>
          {icon}
        </div>
      </div>

      {/* Main value */}
      <div className="flex items-baseline gap-1.5 my-1">
        <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-mono">
          {value}
        </span>
        {unit && <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{unit}</span>}
        {extraBadge && (
          <span className={`ml-auto text-[11px] px-2 py-0.5 rounded-full font-mono font-medium ${badgeColor}`}>
            {extraBadge}
          </span>
        )}
      </div>

      {/* Progress Bar (if provided) */}
      {typeof progressPercent === 'number' && (
        <div className="w-full bg-slate-100 dark:bg-slate-950 h-2 rounded-full mt-3 overflow-hidden border border-slate-200 dark:border-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progressPercent > 85
                ? 'bg-rose-500'
                : progressPercent > 65
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
      )}

      {/* Subtitle */}
      {subtitle && (
        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 truncate font-mono">
          {subtitle}
        </div>
      )}
    </div>
  );
};
