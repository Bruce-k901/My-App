'use client';

import { useState, useRef } from 'react';
import { Camera, X } from '@/components/ui/icons';
import type { TemplateField } from '@/types/checklist';

interface PhotoFieldRendererProps {
  field: TemplateField;
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

export function PhotoFieldRenderer({ field, value, onChange, disabled }: PhotoFieldRendererProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      onChange(file);
      const url = URL.createObjectURL(file);
      setPreview(url);
    }
  };

  const handleRemove = () => {
    onChange(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
      />
      {!value ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-theme rounded-lg text-sm text-theme-secondary hover:border-[#D37E91] hover:text-[#D37E91] transition-colors disabled:opacity-50"
        >
          <Camera className="w-5 h-5" />
          <span>Take or upload photo</span>
        </button>
      ) : (
        <div className="relative inline-block">
          {preview && (
            <img src={preview} alt="Preview" className="w-32 h-32 object-cover rounded-lg border border-theme" />
          )}
          {!preview && <div className="w-32 h-32 bg-theme-muted rounded-lg flex items-center justify-center text-xs text-theme-tertiary">{value.name}</div>}
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
