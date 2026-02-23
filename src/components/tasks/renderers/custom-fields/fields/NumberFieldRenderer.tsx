'use client';

import type { TemplateField } from '@/types/checklist';

interface NumberFieldRendererProps {
  field: TemplateField;
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
}

export function NumberFieldRenderer({ field, value, onChange, disabled }: NumberFieldRendererProps) {
  const isWarning = field.warn_threshold != null && value != null && value >= field.warn_threshold;
  const isFailed = field.fail_threshold != null && value != null && value >= field.fail_threshold;

  return (
    <div>
      <label className="block text-sm font-medium text-theme-primary mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.help_text && (
        <p className="text-xs text-theme-tertiary mb-1">{field.help_text}</p>
      )}
      <div className="relative">
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === '' ? null : parseFloat(v));
          }}
          disabled={disabled}
          min={field.min_value ?? undefined}
          max={field.max_value ?? undefined}
          step="any"
          placeholder={field.placeholder || 'Enter number...'}
          className={`w-full px-3 py-2 bg-theme-surface border rounded-lg text-theme-primary placeholder-theme-tertiary focus:outline-none transition-colors text-sm disabled:opacity-50 ${
            isFailed
              ? 'border-red-500 focus:border-red-500'
              : isWarning
                ? 'border-amber-500 focus:border-amber-500'
                : 'border-theme focus:border-[#D37E91]'
          } ${field.unit ? 'pr-14' : ''}`}
        />
        {field.unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-theme-tertiary bg-theme-muted px-2 py-0.5 rounded">
            {field.unit}
          </span>
        )}
      </div>
      {field.min_value != null && field.max_value != null && (
        <p className="text-xs text-theme-tertiary mt-1">
          Range: {field.min_value} – {field.max_value}{field.unit ? ` ${field.unit}` : ''}
        </p>
      )}
    </div>
  );
}
