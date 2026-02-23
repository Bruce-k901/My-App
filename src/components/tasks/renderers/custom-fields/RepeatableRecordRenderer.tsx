'use client';

import { Plus, Trash } from '@/components/ui/icons';
import { FieldType, type TemplateField } from '@/types/checklist';
import { TextFieldRenderer } from './fields/TextFieldRenderer';
import { NumberFieldRenderer } from './fields/NumberFieldRenderer';
import { TemperatureFieldRenderer } from './fields/TemperatureFieldRenderer';
import { YesNoFieldRenderer } from './fields/YesNoFieldRenderer';
import { SelectFieldRenderer } from './fields/SelectFieldRenderer';
import { DateFieldRenderer } from './fields/DateFieldRenderer';
import { TimeFieldRenderer } from './fields/TimeFieldRenderer';
import { PassFailFieldRenderer } from './fields/PassFailFieldRenderer';

interface RepeatableRecordRendererProps {
  field: TemplateField;
  subFields: TemplateField[];
  records: Record<string, any>[];
  onAddRecord: () => void;
  onUpdateRecord: (index: number, fieldName: string, value: any) => void;
  onRemoveRecord: (index: number) => void;
  disabled?: boolean;
}

function renderSubField(
  subField: TemplateField,
  value: any,
  onChange: (value: any) => void,
  disabled?: boolean
) {
  switch (subField.field_type) {
    case FieldType.TEXT:
      return <TextFieldRenderer field={subField} value={value || ''} onChange={onChange} disabled={disabled} />;
    case FieldType.NUMBER:
      return <NumberFieldRenderer field={subField} value={value ?? null} onChange={onChange} disabled={disabled} />;
    case FieldType.TEMPERATURE:
      return <TemperatureFieldRenderer field={subField} value={value ?? null} onChange={onChange} disabled={disabled} />;
    case FieldType.YES_NO:
      return <YesNoFieldRenderer field={subField} value={value ?? null} onChange={onChange} disabled={disabled} />;
    case FieldType.SELECT:
      return <SelectFieldRenderer field={subField} value={value ?? null} onChange={onChange} disabled={disabled} />;
    case FieldType.DATE:
      return <DateFieldRenderer field={subField} value={value || ''} onChange={onChange} disabled={disabled} />;
    case FieldType.TIME:
      return <TimeFieldRenderer field={subField} value={value || ''} onChange={onChange} disabled={disabled} />;
    case FieldType.PASS_FAIL:
      return <PassFailFieldRenderer field={subField} value={value ?? null} onChange={onChange} disabled={disabled} />;
    default:
      return <TextFieldRenderer field={subField} value={value || ''} onChange={onChange} disabled={disabled} />;
  }
}

export function RepeatableRecordRenderer({
  field,
  subFields,
  records,
  onAddRecord,
  onUpdateRecord,
  onRemoveRecord,
  disabled,
}: RepeatableRecordRendererProps) {
  const sortedSubFields = [...subFields].sort((a, b) => a.field_order - b.field_order);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-theme-primary">{field.label}</h3>
          {field.help_text && (
            <p className="text-xs text-theme-tertiary mt-0.5">{field.help_text}</p>
          )}
        </div>
        <span className="text-xs text-theme-tertiary bg-theme-muted px-2 py-0.5 rounded">
          {records.length} record{records.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-3">
        {records.map((record, recordIdx) => (
          <RecordCard
            key={recordIdx}
            index={recordIdx}
            record={record}
            subFields={sortedSubFields}
            onUpdate={(fieldName, value) => onUpdateRecord(recordIdx, fieldName, value)}
            onRemove={() => onRemoveRecord(recordIdx)}
            disabled={disabled}
            totalRecords={records.length}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={onAddRecord}
        disabled={disabled}
        className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-[#D37E91]/40 rounded-lg text-sm font-medium text-[#D37E91] hover:bg-[#D37E91]/5 hover:border-[#D37E91] transition-colors disabled:opacity-50"
      >
        <Plus className="w-4 h-4" />
        Add record
      </button>
    </div>
  );
}

function RecordCard({
  index,
  record,
  subFields,
  onUpdate,
  onRemove,
  disabled,
  totalRecords,
}: {
  index: number;
  record: Record<string, any>;
  subFields: TemplateField[];
  onUpdate: (fieldName: string, value: any) => void;
  onRemove: () => void;
  disabled?: boolean;
  totalRecords: number;
}) {
  return (
    <div className="border border-theme rounded-lg bg-theme-surface overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-theme-muted border-b border-theme">
        <span className="text-xs font-medium text-theme-secondary">
          Record {index + 1}
        </span>
        {totalRecords > 1 && (
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="p-1 text-theme-tertiary hover:text-red-500 transition-colors disabled:opacity-50"
          >
            <Trash className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="p-3 space-y-3">
        {subFields.map((subField) => (
          <div key={subField.id || subField.field_name}>
            {renderSubField(
              subField,
              record[subField.field_name],
              (value) => onUpdate(subField.field_name, value),
              disabled
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
