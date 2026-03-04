"use client";

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2, Sparkles } from '@/components/ui/icons';
import FireRARiskRating from './FireRARiskRating';
import { getRiskLevel, PRIORITY_OPTIONS } from '@/lib/fire-ra/constants';
import { computeItemRiskScore } from '@/lib/fire-ra/utils';
import type { FireRAItem, FireRAAIField } from '@/types/fire-ra';

interface FireRAItemCardProps {
  item: FireRAItem;
  onChange: (updated: FireRAItem) => void;
  onDelete: () => void;
  onAIAssist?: (field: FireRAAIField) => void;
  aiLoading?: Record<string, boolean>;
  canDelete?: boolean;
}

export default function FireRAItemCard({
  item,
  onChange,
  onDelete,
  onAIAssist,
  aiLoading = {},
  canDelete = true,
}: FireRAItemCardProps) {
  const [expanded, setExpanded] = useState(false);

  const score = computeItemRiskScore(item);
  const riskInfo = score > 0 ? getRiskLevel(score) : null;

  const update = (partial: Partial<FireRAItem>) => {
    onChange({ ...item, ...partial });
  };

  const aiLoadingKey = (field: string) => `${item.itemNumber}_${field}`;

  return (
    <div className="bg-gray-50 dark:bg-neutral-900/50 rounded-lg border border-gray-200 dark:border-neutral-600 overflow-hidden">
      {/* Collapsed Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-100 dark:hover:bg-neutral-800/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-xs font-mono text-gray-400 dark:text-neutral-500 shrink-0">
            {item.itemNumber}
          </span>
          <span className="text-sm text-theme-primary truncate">{item.itemName}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {riskInfo && (
            <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${riskInfo.color}`}>
              {riskInfo.level}
            </span>
          )}
          {item.finding && (
            <span className="w-2 h-2 rounded-full bg-green-500" title="Finding recorded" />
          )}
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="p-4 pt-0 space-y-4 border-t border-gray-200 dark:border-neutral-600">
          {/* Finding */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs text-gray-600 dark:text-theme-tertiary">Finding</label>
              {onAIAssist && (
                <button
                  type="button"
                  onClick={() => onAIAssist('finding')}
                  disabled={aiLoading[aiLoadingKey('finding')]}
                  className="text-[#8A2B2B] hover:text-[#6E2222] disabled:opacity-50 disabled:animate-pulse"
                  title="AI Assist"
                >
                  <Sparkles size={14} />
                </button>
              )}
            </div>
            <textarea
              value={item.finding}
              onChange={(e) => update({ finding: e.target.value, findingAiGenerated: false })}
              className={`w-full bg-theme-surface border rounded-lg px-3 py-2 text-theme-primary text-sm ${
                item.findingAiGenerated
                  ? 'border-dashed border-amber-400 dark:border-amber-500/50'
                  : 'border-gray-200 dark:border-neutral-600'
              }`}
              rows={3}
              placeholder="Describe what you observed..."
            />
          </div>

          {/* Existing Controls */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs text-gray-600 dark:text-theme-tertiary">Existing Controls</label>
              {onAIAssist && (
                <button
                  type="button"
                  onClick={() => onAIAssist('existing_controls')}
                  disabled={aiLoading[aiLoadingKey('existing_controls')]}
                  className="text-[#8A2B2B] hover:text-[#6E2222] disabled:opacity-50 disabled:animate-pulse"
                  title="AI Assist"
                >
                  <Sparkles size={14} />
                </button>
              )}
            </div>
            <textarea
              value={item.existingControls}
              onChange={(e) => update({ existingControls: e.target.value, existingControlsAiGenerated: false })}
              className={`w-full bg-theme-surface border rounded-lg px-3 py-2 text-theme-primary text-sm ${
                item.existingControlsAiGenerated
                  ? 'border-dashed border-amber-400 dark:border-amber-500/50'
                  : 'border-gray-200 dark:border-neutral-600'
              }`}
              rows={2}
              placeholder="What controls are already in place..."
            />
          </div>

          {/* Risk Rating */}
          <div className="p-3 bg-red-50/50 dark:bg-red-500/5 border border-red-200/50 dark:border-red-500/20 rounded-lg">
            <h4 className="text-xs font-semibold text-red-700 dark:text-red-400 mb-2">Risk Rating</h4>
            <FireRARiskRating
              likelihood={item.likelihood}
              severity={item.severity}
              onLikelihoodChange={(v) => update({ likelihood: v })}
              onSeverityChange={(v) => update({ severity: v })}
              compact
            />
          </div>

          {/* Action Required */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs text-gray-600 dark:text-theme-tertiary">Action Required</label>
              {onAIAssist && (
                <button
                  type="button"
                  onClick={() => onAIAssist('action_required')}
                  disabled={aiLoading[aiLoadingKey('action_required')]}
                  className="text-[#8A2B2B] hover:text-[#6E2222] disabled:opacity-50 disabled:animate-pulse"
                  title="AI Suggest Actions"
                >
                  <Sparkles size={14} />
                </button>
              )}
            </div>
            <textarea
              value={item.actionRequired}
              onChange={(e) => update({ actionRequired: e.target.value, actionRequiredAiGenerated: false })}
              className={`w-full bg-theme-surface border rounded-lg px-3 py-2 text-theme-primary text-sm ${
                item.actionRequiredAiGenerated
                  ? 'border-dashed border-amber-400 dark:border-amber-500/50'
                  : 'border-gray-200 dark:border-neutral-600'
              }`}
              rows={2}
              placeholder="What needs to be done..."
            />
          </div>

          {/* Priority, Target Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 dark:text-theme-tertiary mb-1">Priority</label>
              <select
                value={item.priority}
                onChange={(e) => update({ priority: e.target.value as any })}
                className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-2 py-1.5 text-theme-primary text-sm"
              >
                <option value="">Select...</option>
                {PRIORITY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-theme-tertiary mb-1">Target Date</label>
              <input
                type="date"
                value={item.targetDate}
                onChange={(e) => update({ targetDate: e.target.value })}
                className="w-full bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-2 py-1.5 text-theme-primary text-sm"
              />
            </div>
          </div>

          {/* Delete */}
          {canDelete && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onDelete}
                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-xs flex items-center gap-1"
              >
                <Trash2 size={14} />
                Remove Item
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
