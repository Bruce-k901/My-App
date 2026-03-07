"use client";

import React from 'react';
import { LIKELIHOOD_OPTIONS, SEVERITY_OPTIONS, getRiskLevel } from '@/lib/fire-ra/constants';

interface FireRARiskRatingProps {
  likelihood: number;
  severity: number;
  onLikelihoodChange: (value: number) => void;
  onSeverityChange: (value: number) => void;
  compact?: boolean;
}

export default function FireRARiskRating({
  likelihood,
  severity,
  onLikelihoodChange,
  onSeverityChange,
  compact = false,
}: FireRARiskRatingProps) {
  const score = likelihood > 0 && severity > 0 ? likelihood * severity : 0;
  const riskInfo = score > 0 ? getRiskLevel(score) : null;

  return (
    <div className={`flex items-center gap-2 ${compact ? '' : 'flex-wrap'}`}>
      <div className={compact ? 'flex-1 min-w-[100px]' : 'w-36'}>
        <label className="block text-xs text-gray-600 dark:text-theme-tertiary mb-1">Likelihood</label>
        <select
          value={likelihood}
          onChange={(e) => onLikelihoodChange(parseInt(e.target.value))}
          className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-2 py-1.5 text-theme-primary text-sm"
        >
          <option value={0}>Select...</option>
          {LIKELIHOOD_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className={compact ? 'flex-1 min-w-[100px]' : 'w-36'}>
        <label className="block text-xs text-gray-600 dark:text-theme-tertiary mb-1">Severity</label>
        <select
          value={severity}
          onChange={(e) => onSeverityChange(parseInt(e.target.value))}
          className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-2 py-1.5 text-theme-primary text-sm"
        >
          <option value={0}>Select...</option>
          {SEVERITY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className={compact ? 'min-w-[80px]' : 'w-28'}>
        <label className="block text-xs text-gray-600 dark:text-theme-tertiary mb-1">Risk</label>
        {riskInfo ? (
          <div
            className={`px-2 py-1.5 rounded-lg border text-center text-sm font-semibold ${riskInfo.color}`}
            title={riskInfo.description}
          >
            {score} - {riskInfo.level}
          </div>
        ) : (
          <div className="px-2 py-1.5 rounded-lg border border-gray-200 dark:border-neutral-600 text-center text-sm text-gray-400 dark:text-neutral-500">
            -
          </div>
        )}
      </div>
    </div>
  );
}
