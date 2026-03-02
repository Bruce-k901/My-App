'use client';

import type { TemplateField } from '@/types/checklist';

interface TemperatureFieldRendererProps {
  field: TemplateField;
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
}

export function TemperatureFieldRenderer({ field, value, onChange, disabled }: TemperatureFieldRendererProps) {
  const outOfRange =
    value != null &&
    ((field.min_value != null && value < field.min_value) ||
      (field.max_value != null && value > field.max_value));

  const isWarning = !outOfRange && field.warn_threshold != null && value != null && value >= field.warn_threshold;
  const isFailed = outOfRange || (field.fail_threshold != null && value != null && value >= field.fail_threshold);

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
          step="0.1"
          placeholder={field.placeholder || 'Temperature...'}
          className={`w-full px-3 py-2 pr-12 bg-theme-surface border rounded-lg text-theme-primary placeholder-theme-tertiary focus:outline-none transition-colors text-sm disabled:opacity-50 ${
            isFailed
              ? 'border-red-500 focus:border-red-500'
              : isWarning
                ? 'border-amber-500 focus:border-amber-500'
                : 'border-theme focus:border-[#D37E91]'
          }`}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-theme-tertiary bg-theme-muted px-2 py-0.5 rounded">
          °C
        </span>
      </div>
      {isFailed && (
        <p className="text-xs text-red-500 mt-1">
          {outOfRange
            ? `Out of range${field.min_value != null && field.max_value != null
                ? ` (expected ${field.min_value}°C – ${field.max_value}°C)`
                : ''}`
            : `Exceeds fail threshold (${field.fail_threshold}°C)`}
        </p>
      )}
      {isWarning && !isFailed && (
        <p className="text-xs text-amber-500 mt-1">
          Warning: approaching threshold ({field.warn_threshold}°C)
        </p>
      )}
    </div>
  );
}
