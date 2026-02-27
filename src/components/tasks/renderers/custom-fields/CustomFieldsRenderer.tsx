'use client';

import { FieldType, type TemplateField } from '@/types/checklist';
import { TextFieldRenderer } from './fields/TextFieldRenderer';
import { NumberFieldRenderer } from './fields/NumberFieldRenderer';
import { TemperatureFieldRenderer } from './fields/TemperatureFieldRenderer';
import { YesNoFieldRenderer } from './fields/YesNoFieldRenderer';
import { SelectFieldRenderer } from './fields/SelectFieldRenderer';
import { PhotoFieldRenderer } from './fields/PhotoFieldRenderer';
import { DateFieldRenderer } from './fields/DateFieldRenderer';
import { TimeFieldRenderer } from './fields/TimeFieldRenderer';
import { PassFailFieldRenderer } from './fields/PassFailFieldRenderer';
import { RepeatableRecordRenderer } from './RepeatableRecordRenderer';

interface CustomFieldsRendererProps {
  fields: TemplateField[]; // top-level fields (parent_field_id IS NULL)
  allFields: TemplateField[]; // all fields including sub-fields
  values: Record<string, any>;
  onChange: (fieldName: string, value: any) => void;
  records: Record<string, any>[];
  onAddRecord: () => void;
  onUpdateRecord: (index: number, fieldName: string, value: any) => void;
  onRemoveRecord: (index: number) => void;
  managers?: Array<{ id: string; full_name: string; email: string }>;
  disabled?: boolean;
}

export function CustomFieldsRenderer({
  fields,
  allFields,
  values,
  onChange,
  records,
  onAddRecord,
  onUpdateRecord,
  onRemoveRecord,
  managers,
  disabled,
}: CustomFieldsRendererProps) {
  const sortedFields = [...fields].sort((a, b) => a.field_order - b.field_order);

  return (
    <div className="space-y-5">
      {sortedFields.map((field) => {
        // Render section label if present
        const sectionHeader = field.section_label ? (
          <h3 key={`section-${field.id}`} className="text-base font-semibold text-theme-primary pt-2 pb-1 border-b border-theme mb-3">
            {field.section_label}
          </h3>
        ) : null;

        let fieldElement: React.ReactNode;

        if (field.field_type === FieldType.REPEATABLE_RECORD) {
          const subFields = allFields.filter((f) => f.parent_field_id === field.id);
          fieldElement = (
            <RepeatableRecordRenderer
              key={field.id}
              field={field}
              subFields={subFields}
              records={records}
              onAddRecord={onAddRecord}
              onUpdateRecord={onUpdateRecord}
              onRemoveRecord={onRemoveRecord}
              disabled={disabled}
            />
          );
        } else if (field.field_type === FieldType.YES_NO) {
          // YES_NO fields need access to action value, manager selection for the action layer
          fieldElement = (
            <YesNoFieldRenderer
              field={field}
              value={values[field.field_name] ?? null}
              onChange={(v) => onChange(field.field_name, v)}
              actionValue={values[field.field_name + '__action'] || ''}
              onActionChange={(v) => onChange(field.field_name + '__action', v)}
              managers={managers}
              selectedManagerIds={values[field.field_name + '__notify_managers'] || []}
              onManagerSelect={(ids) => onChange(field.field_name + '__notify_managers', ids)}
              disabled={disabled}
            />
          );
        } else {
          fieldElement = renderField(field, values[field.field_name], (v) => onChange(field.field_name, v), disabled);
        }

        return (
          <div key={field.id}>
            {sectionHeader}
            {fieldElement}
          </div>
        );
      })}
    </div>
  );
}

function renderField(
  field: TemplateField,
  value: any,
  onChange: (value: any) => void,
  disabled?: boolean
) {
  switch (field.field_type) {
    case FieldType.TEXT:
      return <TextFieldRenderer field={field} value={value || ''} onChange={onChange} disabled={disabled} />;
    case FieldType.NUMBER:
      return <NumberFieldRenderer field={field} value={value ?? null} onChange={onChange} disabled={disabled} />;
    case FieldType.TEMPERATURE:
      return <TemperatureFieldRenderer field={field} value={value ?? null} onChange={onChange} disabled={disabled} />;
    case FieldType.YES_NO:
      // Handled in main render loop (needs action props) — fallback for safety
      return <YesNoFieldRenderer field={field} value={value ?? null} onChange={onChange} disabled={disabled} />;
    case FieldType.SELECT:
      return <SelectFieldRenderer field={field} value={value ?? null} onChange={onChange} disabled={disabled} />;
    case FieldType.PHOTO:
      return <PhotoFieldRenderer field={field} value={value ?? null} onChange={onChange} disabled={disabled} />;
    case FieldType.DATE:
      return <DateFieldRenderer field={field} value={value || ''} onChange={onChange} disabled={disabled} />;
    case FieldType.TIME:
      return <TimeFieldRenderer field={field} value={value || ''} onChange={onChange} disabled={disabled} />;
    case FieldType.PASS_FAIL:
      return <PassFailFieldRenderer field={field} value={value ?? null} onChange={onChange} disabled={disabled} />;
    default:
      return <TextFieldRenderer field={field} value={value || ''} onChange={onChange} disabled={disabled} />;
  }
}
