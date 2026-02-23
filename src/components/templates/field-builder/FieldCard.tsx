'use client';

import { Pencil, Trash, ChevronUp, ChevronDown } from '@/components/ui/icons';
import { FieldType, type TemplateField } from '@/types/checklist';
import { FIELD_TYPE_CONFIG } from './field-type-config';

interface FieldCardProps {
  field: TemplateField;
  index: number;
  total: number;
  subFields?: TemplateField[];
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function FieldCard({ field, index, total, subFields, onEdit, onDelete, onMoveUp, onMoveDown }: FieldCardProps) {
  const config = FIELD_TYPE_CONFIG[field.field_type] || FIELD_TYPE_CONFIG[FieldType.TEXT];

  return (
    <div className="flex items-center gap-2 p-3 border border-theme rounded-lg bg-white dark:bg-white/[0.02] group hover:border-[#D37E91]/30 transition-colors">
      {/* Reorder buttons */}
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          className="p-0.5 text-theme-tertiary hover:text-theme-primary disabled:opacity-30 transition-colors"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="p-0.5 text-theme-tertiary hover:text-theme-primary disabled:opacity-30 transition-colors"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Field info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-theme-primary truncate">{field.label}</span>
          {field.required && (
            <span className="text-[10px] text-red-500 font-medium">Required</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#D37E91]/10 text-[#D37E91] font-medium">
            {config.label}
          </span>
          {field.unit && (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-theme-muted text-theme-tertiary">
              {field.unit}
            </span>
          )}
          {field.field_type === FieldType.REPEATABLE_RECORD && subFields && (
            <span className="text-[11px] text-theme-tertiary">
              {subFields.length} column{subFields.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={onEdit}
          className="p-1.5 text-theme-tertiary hover:text-[#D37E91] transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 text-theme-tertiary hover:text-red-500 transition-colors"
        >
          <Trash className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
