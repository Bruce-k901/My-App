"use client";

import React, { useState } from 'react';
import { Plus, Sparkles } from '@/components/ui/icons';
import type { ChecklistFieldData, ChecklistOption } from '@/types/fire-ra';

interface FireRAChecklistFieldProps {
  label: string;
  data: ChecklistFieldData;
  onChange: (updated: ChecklistFieldData) => void;
  onAIAssist?: () => void;
  aiLoading?: boolean;
  placeholder?: string;
}

export default function FireRAChecklistField({
  label,
  data,
  onChange,
  onAIAssist,
  aiLoading = false,
  placeholder = 'Add custom item...',
}: FireRAChecklistFieldProps) {
  const [customInput, setCustomInput] = useState('');

  const toggleOption = (id: string) => {
    onChange({
      ...data,
      checklist: data.checklist.map(o =>
        o.id === id ? { ...o, checked: !o.checked } : o
      ),
    });
  };

  const removeOption = (id: string) => {
    onChange({
      ...data,
      checklist: data.checklist.filter(o => o.id !== id),
    });
  };

  const addCustom = () => {
    const text = customInput.trim();
    if (!text) return;
    // Avoid duplicates
    if (data.checklist.some(o => o.label.toLowerCase() === text.toLowerCase())) return;
    const newOption: ChecklistOption = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      label: text,
      checked: true,
      isCustom: true,
      aiSuggested: false,
    };
    onChange({
      ...data,
      checklist: [...data.checklist, newOption],
    });
    setCustomInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustom();
    }
  };

  // Sort: checked first, then unchecked, preserving original order within each group
  const checked = data.checklist.filter(o => o.checked);
  const unchecked = data.checklist.filter(o => !o.checked);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs text-gray-600 dark:text-theme-tertiary">{label}</label>
        {onAIAssist && (
          <button
            type="button"
            onClick={onAIAssist}
            disabled={aiLoading}
            className="text-[#8A2B2B] hover:text-[#6E2222] disabled:opacity-50 disabled:animate-pulse"
            title="AI Suggest"
          >
            <Sparkles size={14} />
          </button>
        )}
      </div>

      {/* Checkbox list */}
      <div className="max-h-52 overflow-y-auto space-y-0.5 rounded-lg border border-gray-200 dark:border-neutral-600 bg-theme-surface p-2">
        {/* Checked items */}
        {checked.map(option => (
          <ChecklistRow
            key={option.id}
            option={option}
            onToggle={() => toggleOption(option.id)}
            onRemove={option.isCustom || option.aiSuggested ? () => removeOption(option.id) : undefined}
          />
        ))}

        {/* Divider if both groups have items */}
        {checked.length > 0 && unchecked.length > 0 && (
          <div className="border-t border-gray-100 dark:border-neutral-700 my-1" />
        )}

        {/* Unchecked items */}
        {unchecked.map(option => (
          <ChecklistRow
            key={option.id}
            option={option}
            onToggle={() => toggleOption(option.id)}
            onRemove={option.isCustom || option.aiSuggested ? () => removeOption(option.id) : undefined}
          />
        ))}

        {data.checklist.length === 0 && (
          <p className="text-xs text-theme-tertiary italic py-2 text-center">No options available</p>
        )}
      </div>

      {/* Add custom item */}
      <div className="flex items-center gap-1.5 mt-1.5">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-2.5 py-1.5 text-sm text-theme-primary placeholder:text-theme-tertiary"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!customInput.trim()}
          className="p-1.5 rounded-lg bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 disabled:opacity-30 transition-colors"
          title="Add custom item"
        >
          <Plus size={14} className="text-theme-primary" />
        </button>
      </div>

      {/* Notes */}
      {data.notes !== undefined && (
        <textarea
          value={data.notes}
          onChange={(e) => onChange({ ...data, notes: e.target.value })}
          placeholder="Additional notes..."
          className="w-full mt-1.5 bg-theme-surface border border-gray-200 dark:border-neutral-600 rounded-lg px-2.5 py-1.5 text-sm text-theme-primary placeholder:text-theme-tertiary resize-none"
          rows={1}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Checkbox row sub-component
// ---------------------------------------------------------------------------

function ChecklistRow({
  option,
  onToggle,
  onRemove,
}: {
  option: ChecklistOption;
  onToggle: () => void;
  onRemove?: () => void;
}) {
  return (
    <label
      className={`flex items-start gap-2 px-1.5 py-1 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors group ${
        option.aiSuggested && !option.isCustom ? 'border-l-2 border-amber-400 dark:border-amber-500/50 pl-2' : ''
      }`}
    >
      <input
        type="checkbox"
        checked={option.checked}
        onChange={onToggle}
        className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 dark:border-neutral-500 text-[#8A2B2B] focus:ring-[#8A2B2B] shrink-0"
      />
      <span className={`text-xs leading-snug flex-1 ${option.checked ? 'text-theme-primary' : 'text-theme-secondary'}`}>
        {option.label}
        {option.isCustom && (
          <span className="ml-1 text-[10px] text-theme-tertiary">(custom)</span>
        )}
        {option.aiSuggested && !option.isCustom && (
          <span className="ml-1 text-[10px] text-amber-600 dark:text-amber-400">AI</span>
        )}
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 text-xs shrink-0 transition-opacity"
          title="Remove"
        >
          x
        </button>
      )}
    </label>
  );
}
