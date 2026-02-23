'use client';

import type { TemplateField } from '@/types/checklist';

interface YesNoFieldRendererProps {
  field: TemplateField;
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function YesNoFieldRenderer({ field, value, onChange, disabled }: YesNoFieldRendererProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-theme-primary mb-2">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.help_text && (
        <p className="text-xs text-theme-tertiary mb-2">{field.help_text}</p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange('yes')}
          disabled={disabled}
          className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-all disabled:opacity-50 ${
            value === 'yes'
              ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              : 'border-theme bg-theme-surface text-theme-secondary hover:border-emerald-500/50'
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange('no')}
          disabled={disabled}
          className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-all disabled:opacity-50 ${
            value === 'no'
              ? 'border-red-500 bg-red-500/15 text-red-600 dark:text-red-400'
              : 'border-theme bg-theme-surface text-theme-secondary hover:border-red-500/50'
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
}
