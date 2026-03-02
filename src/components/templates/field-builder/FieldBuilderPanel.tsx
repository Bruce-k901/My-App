'use client';

import { useState } from 'react';
import { Plus } from '@/components/ui/icons';
import { FieldType, type TemplateField } from '@/types/checklist';
import { FieldCard } from './FieldCard';
import { FieldEditorModal } from './FieldEditorModal';

interface FieldBuilderPanelProps {
  fields: TemplateField[];
  onChange: (fields: TemplateField[]) => void;
}

let tempIdCounter = 0;
function tempId() {
  return `temp_${++tempIdCounter}_${Date.now()}`;
}

export function FieldBuilderPanel({ fields, onChange }: FieldBuilderPanelProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingField, setEditingField] = useState<TemplateField | null>(null);
  const [editingSubFields, setEditingSubFields] = useState<TemplateField[]>([]);

  // Separate top-level from sub-fields
  const topLevelFields = fields
    .filter((f) => !f.parent_field_id)
    .sort((a, b) => a.field_order - b.field_order);

  const getSubFields = (parentId: string) =>
    fields
      .filter((f) => f.parent_field_id === parentId)
      .sort((a, b) => a.field_order - b.field_order);

  const handleAddField = () => {
    setEditingField(null);
    setEditingSubFields([]);
    setIsEditorOpen(true);
  };

  const handleEditField = (field: TemplateField) => {
    setEditingField(field);
    if (field.field_type === FieldType.REPEATABLE_RECORD) {
      setEditingSubFields(getSubFields(field.id));
    } else {
      setEditingSubFields([]);
    }
    setIsEditorOpen(true);
  };

  const handleDeleteField = (fieldId: string) => {
    // Remove the field and any sub-fields
    onChange(fields.filter((f) => f.id !== fieldId && f.parent_field_id !== fieldId));
  };

  const handleMoveField = (fieldId: string, direction: 'up' | 'down') => {
    const sorted = [...topLevelFields];
    const idx = sorted.findIndex((f) => f.id === fieldId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    // Swap field_order values
    const updated = fields.map((f) => {
      if (f.id === sorted[idx].id) return { ...f, field_order: sorted[swapIdx].field_order };
      if (f.id === sorted[swapIdx].id) return { ...f, field_order: sorted[idx].field_order };
      return f;
    });
    onChange(updated);
  };

  const handleSaveField = (fieldData: Partial<TemplateField>, subFieldsData?: Partial<TemplateField>[]) => {
    if (editingField) {
      // Update existing field
      let updated = fields.map((f) =>
        f.id === editingField.id ? { ...f, ...fieldData } : f
      );

      // Update sub-fields for repeatable records
      if (fieldData.field_type === FieldType.REPEATABLE_RECORD && subFieldsData) {
        // Remove old sub-fields
        updated = updated.filter((f) => f.parent_field_id !== editingField.id);
        // Add new sub-fields
        const newSubFields = subFieldsData.map((sf, idx) => ({
          id: tempId(),
          template_id: editingField.template_id,
          field_name: sf.field_name || '',
          field_type: sf.field_type || FieldType.TEXT,
          label: sf.label || '',
          placeholder: sf.placeholder || null,
          required: sf.required || false,
          min_value: sf.min_value ?? null,
          max_value: sf.max_value ?? null,
          warn_threshold: sf.warn_threshold ?? null,
          fail_threshold: sf.fail_threshold ?? null,
          options: sf.options || null,
          field_order: idx,
          help_text: sf.help_text || null,
          unit: sf.unit || null,
          default_value: sf.default_value || null,
          parent_field_id: editingField.id,
          section_label: null,
          created_at: new Date().toISOString(),
        } as TemplateField));
        updated = [...updated, ...newSubFields];
      }
      onChange(updated);
    } else {
      // Add new field
      const nextOrder = topLevelFields.length > 0
        ? Math.max(...topLevelFields.map((f) => f.field_order)) + 1
        : 0;

      const newFieldId = tempId();
      const newField: TemplateField = {
        id: newFieldId,
        template_id: '', // will be set on save
        field_name: fieldData.field_name || '',
        field_type: fieldData.field_type || FieldType.TEXT,
        label: fieldData.label || '',
        placeholder: fieldData.placeholder || null,
        required: fieldData.required || false,
        min_value: fieldData.min_value ?? null,
        max_value: fieldData.max_value ?? null,
        warn_threshold: fieldData.warn_threshold ?? null,
        fail_threshold: fieldData.fail_threshold ?? null,
        options: fieldData.options || null,
        field_order: nextOrder,
        help_text: fieldData.help_text || null,
        unit: fieldData.unit || null,
        default_value: fieldData.default_value || null,
        parent_field_id: null,
        section_label: fieldData.section_label || null,
        created_at: new Date().toISOString(),
      };

      let updatedFields = [...fields, newField];

      // Add sub-fields for repeatable records
      if (fieldData.field_type === FieldType.REPEATABLE_RECORD && subFieldsData) {
        const newSubFields = subFieldsData.map((sf, idx) => ({
          id: tempId(),
          template_id: '',
          field_name: sf.field_name || '',
          field_type: sf.field_type || FieldType.TEXT,
          label: sf.label || '',
          placeholder: sf.placeholder || null,
          required: sf.required || false,
          min_value: sf.min_value ?? null,
          max_value: sf.max_value ?? null,
          warn_threshold: sf.warn_threshold ?? null,
          fail_threshold: sf.fail_threshold ?? null,
          options: sf.options || null,
          field_order: idx,
          help_text: sf.help_text || null,
          unit: sf.unit || null,
          default_value: sf.default_value || null,
          parent_field_id: newFieldId,
          section_label: null,
          created_at: new Date().toISOString(),
        } as TemplateField));
        updatedFields = [...updatedFields, ...newSubFields];
      }

      onChange(updatedFields);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-theme-primary">Custom Fields</h3>
          <p className="text-xs text-theme-tertiary mt-0.5">
            Design your check sheet by adding fields below
          </p>
        </div>
        <span className="text-xs text-theme-tertiary">
          {topLevelFields.length} field{topLevelFields.length !== 1 ? 's' : ''}
        </span>
      </div>

      {topLevelFields.length === 0 ? (
        <div className="border border-dashed border-theme rounded-lg p-6 text-center">
          <p className="text-sm text-theme-tertiary mb-3">No fields yet. Add your first field to get started.</p>
          <button
            type="button"
            onClick={handleAddField}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#D37E91] hover:bg-[#D37E91]/90 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add First Field
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {topLevelFields.map((field, idx) => (
              <FieldCard
                key={field.id}
                field={field}
                index={idx}
                total={topLevelFields.length}
                subFields={field.field_type === FieldType.REPEATABLE_RECORD ? getSubFields(field.id) : undefined}
                onEdit={() => handleEditField(field)}
                onDelete={() => handleDeleteField(field.id)}
                onMoveUp={() => handleMoveField(field.id, 'up')}
                onMoveDown={() => handleMoveField(field.id, 'down')}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleAddField}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-[#D37E91]/40 rounded-lg text-sm font-medium text-[#D37E91] hover:bg-[#D37E91]/5 hover:border-[#D37E91] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Field
          </button>
        </>
      )}

      <FieldEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveField}
        editingField={editingField}
        editingSubFields={editingSubFields}
      />
    </div>
  );
}
