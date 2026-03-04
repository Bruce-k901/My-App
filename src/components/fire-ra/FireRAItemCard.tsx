"use client";

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Trash2 } from '@/components/ui/icons';
import FireRARiskRating from './FireRARiskRating';
import FireRAChecklistField from './FireRAChecklistField';
import { getRiskLevel, PRIORITY_OPTIONS } from '@/lib/fire-ra/constants';
import { computeItemRiskScore, flattenChecklist } from '@/lib/fire-ra/utils';
import { createChecklistFieldData } from '@/lib/fire-ra/checklist-options';
import type { FireRAItem, FireRAAIField, PremisesType, ChecklistFieldData } from '@/types/fire-ra';

interface FireRAItemCardProps {
  item: FireRAItem;
  onChange: (updated: FireRAItem) => void;
  onDelete: () => void;
  onAIAssist?: (field: FireRAAIField) => void;
  aiLoading?: Record<string, boolean>;
  canDelete?: boolean;
  premisesType: PremisesType;
}

export default function FireRAItemCard({
  item,
  onChange,
  onDelete,
  onAIAssist,
  aiLoading = {},
  canDelete = true,
  premisesType,
}: FireRAItemCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Lazy-init checklists when card expands and checklists don't exist yet
  useEffect(() => {
    if (!expanded) return;
    if (item.findingChecklist && item.existingControlsChecklist && item.actionRequiredChecklist) return;

    const updates: Partial<FireRAItem> = {};

    if (!item.findingChecklist) {
      const data = createChecklistFieldData(item.itemNumber, 'finding', premisesType);
      // If old text exists, put it in notes for backward compat
      if (item.finding.trim()) data.notes = item.finding;
      updates.findingChecklist = data;
    }
    if (!item.existingControlsChecklist) {
      const data = createChecklistFieldData(item.itemNumber, 'existingControls', premisesType);
      if (item.existingControls.trim()) data.notes = item.existingControls;
      updates.existingControlsChecklist = data;
    }
    if (!item.actionRequiredChecklist) {
      const data = createChecklistFieldData(item.itemNumber, 'actionRequired', premisesType);
      if (item.actionRequired.trim()) data.notes = item.actionRequired;
      updates.actionRequiredChecklist = data;
    }

    if (Object.keys(updates).length > 0) {
      onChange({ ...item, ...updates });
    }
  }, [expanded]);  

  const score = computeItemRiskScore(item);
  const riskInfo = score > 0 ? getRiskLevel(score) : null;

  const update = (partial: Partial<FireRAItem>) => {
    onChange({ ...item, ...partial });
  };

  const handleChecklistChange = (
    stringField: 'finding' | 'existingControls' | 'actionRequired',
    checklistField: 'findingChecklist' | 'existingControlsChecklist' | 'actionRequiredChecklist',
    aiField: 'findingAiGenerated' | 'existingControlsAiGenerated' | 'actionRequiredAiGenerated',
    data: ChecklistFieldData
  ) => {
    const flat = flattenChecklist(data);
    const hasAI = data.checklist.some(o => o.checked && o.aiSuggested);
    update({
      [stringField]: flat,
      [aiField]: hasAI,
      [checklistField]: data,
    } as Partial<FireRAItem>);
  };

  const aiLoadingKey = (field: string) => `${item.itemNumber}_${field}`;

  // Determine "has content" for the green indicator
  const hasContent = item.finding.trim() !== '' ||
    (item.findingChecklist?.checklist.some(o => o.checked));

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
          <span className="text-sm text-theme-primary">{item.itemName}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {riskInfo && (
            <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${riskInfo.color}`}>
              {riskInfo.level}
            </span>
          )}
          {hasContent && (
            <span className="w-2 h-2 rounded-full bg-green-500" title="Finding recorded" />
          )}
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="p-4 pt-0 space-y-4 border-t border-gray-200 dark:border-neutral-600">
          {/* Finding Checklist */}
          {item.findingChecklist && (
            <FireRAChecklistField
              label="Finding"
              data={item.findingChecklist}
              onChange={(data) => handleChecklistChange('finding', 'findingChecklist', 'findingAiGenerated', data)}
              onAIAssist={onAIAssist ? () => onAIAssist('finding') : undefined}
              aiLoading={aiLoading[aiLoadingKey('finding')]}
              placeholder="Add custom finding..."
            />
          )}

          {/* Existing Controls Checklist */}
          {item.existingControlsChecklist && (
            <FireRAChecklistField
              label="Existing Controls"
              data={item.existingControlsChecklist}
              onChange={(data) => handleChecklistChange('existingControls', 'existingControlsChecklist', 'existingControlsAiGenerated', data)}
              onAIAssist={onAIAssist ? () => onAIAssist('existing_controls') : undefined}
              aiLoading={aiLoading[aiLoadingKey('existing_controls')]}
              placeholder="Add custom control..."
            />
          )}

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

          {/* Action Required Checklist */}
          {item.actionRequiredChecklist && (
            <FireRAChecklistField
              label="Action Required"
              data={item.actionRequiredChecklist}
              onChange={(data) => handleChecklistChange('actionRequired', 'actionRequiredChecklist', 'actionRequiredAiGenerated', data)}
              onAIAssist={onAIAssist ? () => onAIAssist('action_required') : undefined}
              aiLoading={aiLoading[aiLoadingKey('action_required')]}
              placeholder="Add custom action..."
            />
          )}

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
