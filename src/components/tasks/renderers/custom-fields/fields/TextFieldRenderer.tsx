'use client';

import type { TemplateField } from '@/types/checklist';

interface TextFieldRendererProps {
  field: TemplateField;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TextFieldRenderer({ field, value, onChange, disabled }: TextFieldRendererProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-theme-primary mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.help_text && (
        <p className="text-xs text-theme-tertiary mb-1">{field.help_text}</p>
      )}
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={field.placeholder || 'Enter text...'}
        className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary placeholder-theme-tertiary focus:outline-none focus:border-[#D37E91] transition-colors text-sm disabled:opacity-50"
      />
    </div>
  );
}
