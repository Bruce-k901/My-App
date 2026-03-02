'use client';

import type { TemplateField } from '@/types/checklist';

interface SelectFieldRendererProps {
  field: TemplateField;
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function SelectFieldRenderer({ field, value, onChange, disabled }: SelectFieldRendererProps) {
  const options: string[] = Array.isArray(field.options?.choices)
    ? field.options.choices
    : Array.isArray(field.options)
      ? field.options as unknown as string[]
      : [];

  return (
    <div>
      <label className="block text-sm font-medium text-theme-primary mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.help_text && (
        <p className="text-xs text-theme-tertiary mb-1">{field.help_text}</p>
      )}
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary focus:outline-none focus:border-[#D37E91] transition-colors text-sm disabled:opacity-50"
      >
        <option value="">{field.placeholder || 'Select an option...'}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
