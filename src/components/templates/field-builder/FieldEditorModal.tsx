'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash, AlertTriangle, Bell, FileText } from '@/components/ui/icons';
import { FieldType, type TemplateField } from '@/types/checklist';
import { FIELD_TYPE_CONFIG, BUILDER_FIELD_TYPES, RECORD_SUB_FIELD_TYPES, COMMON_UNITS } from './field-type-config';

interface YesNoOptionActions {
  logException?: boolean;
  requestAction?: boolean;
  requireAction?: boolean;
  message?: string;
}

interface YesNoOption {
  label: string;
  value: string;
  actions: YesNoOptionActions;
}

const DEFAULT_YES_NO_OPTIONS: YesNoOption[] = [
  { label: 'Yes', value: 'yes', actions: {} },
  { label: 'No', value: 'no', actions: {} },
];

interface FieldEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (field: Partial<TemplateField>, subFields?: Partial<TemplateField>[]) => void;
  editingField?: TemplateField | null;
  editingSubFields?: TemplateField[];
  isSubField?: boolean; // true when adding sub-fields inside a repeatable record
}

function generateFieldName(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'field';
}

export function FieldEditorModal({
  isOpen,
  onClose,
  onSave,
  editingField,
  editingSubFields,
  isSubField = false,
}: FieldEditorModalProps) {
  const [label, setLabel] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<FieldType>(FieldType.TEXT);
  const [required, setRequired] = useState(false);
  const [placeholder, setPlaceholder] = useState('');
  const [helpText, setHelpText] = useState('');
  const [unit, setUnit] = useState('');
  const [minValue, setMinValue] = useState<string>('');
  const [maxValue, setMaxValue] = useState<string>('');
  const [warnThreshold, setWarnThreshold] = useState<string>('');
  const [failThreshold, setFailThreshold] = useState<string>('');
  const [sectionLabel, setSectionLabel] = useState('');
  const [options, setOptions] = useState<string[]>(['']);
  const [yesNoOptions, setYesNoOptions] = useState<YesNoOption[]>(DEFAULT_YES_NO_OPTIONS);
  const [subFields, setSubFields] = useState<Array<{ label: string; fieldType: FieldType; unit: string; required: boolean }>>([]);

  const config = FIELD_TYPE_CONFIG[fieldType];
  const availableTypes = isSubField ? RECORD_SUB_FIELD_TYPES : BUILDER_FIELD_TYPES;

  useEffect(() => {
    if (editingField) {
      setLabel(editingField.label);
      setFieldName(editingField.field_name);
      setFieldType(editingField.field_type);
      setRequired(editingField.required);
      setPlaceholder(editingField.placeholder || '');
      setHelpText(editingField.help_text || '');
      setUnit(editingField.unit || '');
      setMinValue(editingField.min_value != null ? String(editingField.min_value) : '');
      setMaxValue(editingField.max_value != null ? String(editingField.max_value) : '');
      setWarnThreshold(editingField.warn_threshold != null ? String(editingField.warn_threshold) : '');
      setFailThreshold(editingField.fail_threshold != null ? String(editingField.fail_threshold) : '');
      setSectionLabel(editingField.section_label || '');
      if (editingField.options?.choices) {
        setOptions(editingField.options.choices);
      }
      if (editingField.options?.yes_no_options) {
        setYesNoOptions(editingField.options.yes_no_options);
      } else {
        setYesNoOptions(DEFAULT_YES_NO_OPTIONS);
      }
      if (editingSubFields && editingSubFields.length > 0) {
        setSubFields(editingSubFields.map(sf => ({
          label: sf.label,
          fieldType: sf.field_type,
          unit: sf.unit || '',
          required: sf.required,
        })));
      }
    } else {
      setLabel('');
      setFieldName('');
      setFieldType(FieldType.TEXT);
      setRequired(false);
      setPlaceholder('');
      setHelpText('');
      setUnit('');
      setMinValue('');
      setMaxValue('');
      setWarnThreshold('');
      setFailThreshold('');
      setSectionLabel('');
      setOptions(['']);
      setYesNoOptions(DEFAULT_YES_NO_OPTIONS);
      setSubFields([]);
    }
  }, [editingField, editingSubFields, isOpen]);

  const handleLabelChange = (newLabel: string) => {
    setLabel(newLabel);
    if (!editingField) {
      setFieldName(generateFieldName(newLabel));
    }
  };

  const handleSave = () => {
    if (!label.trim()) return;
    const name = fieldName || generateFieldName(label);

    const fieldData: Partial<TemplateField> = {
      ...(editingField ? { id: editingField.id } : {}),
      label: label.trim(),
      field_name: name,
      field_type: fieldType,
      required,
      placeholder: placeholder || null,
      help_text: helpText || null,
      unit: config?.hasUnit && unit ? unit : fieldType === FieldType.TEMPERATURE ? '°C' : null,
      min_value: config?.hasMinMax && minValue !== '' ? parseFloat(minValue) : null,
      max_value: config?.hasMinMax && maxValue !== '' ? parseFloat(maxValue) : null,
      warn_threshold: config?.hasThresholds && warnThreshold !== '' ? parseFloat(warnThreshold) : null,
      fail_threshold: config?.hasThresholds && failThreshold !== '' ? parseFloat(failThreshold) : null,
      section_label: sectionLabel || null,
      options: config?.hasOptions && options.filter(o => o.trim()).length > 0
        ? { choices: options.filter(o => o.trim()) }
        : fieldType === FieldType.YES_NO && yesNoOptions.some(o => o.actions.logException || o.actions.requestAction || o.actions.requireAction || o.actions.message)
        ? { yes_no_options: yesNoOptions }
        : null,
    };

    // For repeatable records, pass sub-field data
    if (fieldType === FieldType.REPEATABLE_RECORD && subFields.length > 0) {
      const subFieldData = subFields
        .filter(sf => sf.label.trim())
        .map((sf, idx) => ({
          label: sf.label.trim(),
          field_name: generateFieldName(sf.label),
          field_type: sf.fieldType,
          unit: sf.unit || null,
          required: sf.required,
          field_order: idx,
        }));
      onSave(fieldData, subFieldData as Partial<TemplateField>[]);
    } else {
      onSave(fieldData);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-white dark:bg-[#14161c] rounded-xl max-w-lg w-full max-h-[85vh] overflow-hidden border border-theme shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-theme flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-semibold text-theme-primary">
            {editingField ? 'Edit Field' : isSubField ? 'Add Column' : 'Add Field'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-theme-tertiary hover:text-theme-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Label */}
          <div>
            <label className="block text-sm font-medium text-theme-primary mb-1">Label *</label>
            <input
              type="text"
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="e.g. Croissant Flour"
              className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:border-[#D37E91]"
              autoFocus
            />
          </div>

          {/* Section header (top-level only) */}
          {!isSubField && (
            <div>
              <label className="block text-sm font-medium text-theme-primary mb-1">Section Header</label>
              <input
                type="text"
                value={sectionLabel}
                onChange={(e) => setSectionLabel(e.target.value)}
                placeholder="e.g. Ingredient Weights (shown above this field)"
                className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:border-[#D37E91]"
              />
              <p className="text-xs text-theme-tertiary mt-1">Optional heading displayed above this field</p>
            </div>
          )}

          {/* Field Type */}
          <div>
            <label className="block text-sm font-medium text-theme-primary mb-1">Field Type</label>
            <div className="grid grid-cols-2 gap-2">
              {availableTypes.filter((type) => FIELD_TYPE_CONFIG[type]).map((type) => {
                const c = FIELD_TYPE_CONFIG[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFieldType(type)}
                    className={`p-2 rounded-lg border text-left text-sm transition-all ${
                      fieldType === type
                        ? 'border-[#D37E91] bg-[#D37E91]/10 text-[#D37E91]'
                        : 'border-theme bg-theme-surface text-theme-secondary hover:border-[#D37E91]/50'
                    }`}
                  >
                    <span className="font-medium">{c.label}</span>
                    <p className="text-[11px] mt-0.5 opacity-70">{c.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Required toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="w-4 h-4 accent-[#D37E91]"
            />
            <span className="text-sm text-theme-primary">Required field</span>
          </label>

          {/* Unit (for number fields) */}
          {config?.hasUnit && (
            <div>
              <label className="block text-sm font-medium text-theme-primary mb-1">Unit</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="e.g. KG, Gm, ml"
                  className="flex-1 px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:border-[#D37E91]"
                />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {COMMON_UNITS.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnit(u)}
                    className={`px-2 py-0.5 rounded text-xs transition-colors ${
                      unit === u
                        ? 'bg-[#D37E91]/15 text-[#D37E91] border border-[#D37E91]/30'
                        : 'bg-theme-muted text-theme-tertiary hover:text-theme-primary border border-transparent'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Min/Max (for number/temperature) */}
          {config?.hasMinMax && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-1">Min Value</label>
                <input
                  type="number"
                  value={minValue}
                  onChange={(e) => setMinValue(e.target.value)}
                  step="any"
                  placeholder="Optional"
                  className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:border-[#D37E91]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-1">Max Value</label>
                <input
                  type="number"
                  value={maxValue}
                  onChange={(e) => setMaxValue(e.target.value)}
                  step="any"
                  placeholder="Optional"
                  className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:border-[#D37E91]"
                />
              </div>
            </div>
          )}

          {/* Warn/Fail Thresholds (for number/temperature) */}
          {config?.hasThresholds && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-1">Warn Threshold</label>
                <input
                  type="number"
                  value={warnThreshold}
                  onChange={(e) => setWarnThreshold(e.target.value)}
                  step="any"
                  placeholder="Optional"
                  className="w-full px-3 py-2 bg-theme-surface border border-amber-500/40 rounded-lg text-theme-primary text-sm focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-theme-tertiary mt-1">Amber warning at this value</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-1">Fail Threshold</label>
                <input
                  type="number"
                  value={failThreshold}
                  onChange={(e) => setFailThreshold(e.target.value)}
                  step="any"
                  placeholder="Optional"
                  className="w-full px-3 py-2 bg-theme-surface border border-red-500/40 rounded-lg text-theme-primary text-sm focus:outline-none focus:border-red-500"
                />
                <p className="text-[11px] text-theme-tertiary mt-1">Red alert at this value</p>
              </div>
            </div>
          )}

          {/* Options (for select) */}
          {config?.hasOptions && (
            <div>
              <label className="block text-sm font-medium text-theme-primary mb-1">Options</label>
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const updated = [...options];
                        updated[idx] = e.target.value;
                        setOptions(updated);
                      }}
                      placeholder={`Option ${idx + 1}`}
                      className="flex-1 px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:border-[#D37E91]"
                    />
                    {options.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setOptions(options.filter((_, i) => i !== idx))}
                        className="p-2 text-theme-tertiary hover:text-red-500 transition-colors"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setOptions([...options, ''])}
                  className="flex items-center gap-1 text-sm text-[#D37E91] hover:text-[#D37E91]/80 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add option
                </button>
              </div>
            </div>
          )}

          {/* Yes/No answer actions */}
          {fieldType === FieldType.YES_NO && (
            <div>
              <label className="block text-sm font-medium text-theme-primary mb-1">Answer Actions</label>
              <p className="text-xs text-theme-tertiary mb-3">Configure what happens when staff select each answer</p>
              <div className="space-y-3">
                {yesNoOptions.map((option, optIdx) => {
                  const hasActions = option.actions.logException || option.actions.requestAction || option.actions.requireAction;
                  const hasMessage = !!option.actions.message;

                  return (
                    <div
                      key={option.value}
                      className={`rounded-lg border p-3 ${
                        hasActions || hasMessage
                          ? 'border-amber-300/50 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/[0.04]'
                          : 'border-theme bg-theme-surface'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          option.value === 'yes'
                            ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400'
                        }`}>
                          If {option.label}
                        </span>
                        {hasActions && (
                          <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Flagged
                          </span>
                        )}
                      </div>

                      <div className="mb-2">
                        <label className="block text-xs text-theme-secondary mb-1">
                          Message shown to staff when they select &quot;{option.label}&quot;
                        </label>
                        <input
                          type="text"
                          value={option.actions.message || ''}
                          onChange={(e) => {
                            const updated = [...yesNoOptions];
                            updated[optIdx] = { ...updated[optIdx], actions: { ...updated[optIdx].actions, message: e.target.value } };
                            setYesNoOptions(updated);
                          }}
                          placeholder={option.value === 'no'
                            ? 'e.g. Follow the corrective action procedure'
                            : 'Leave blank if no message needed'
                          }
                          className="w-full px-3 py-1.5 rounded border border-theme bg-theme-surface text-theme-primary text-sm focus:outline-none focus:ring-1 focus:ring-[#D37E91] placeholder:text-theme-tertiary/60"
                        />
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                        <label className="flex items-center gap-1.5 cursor-pointer group" title="Flag this answer as an exception in compliance reports">
                          <input
                            type="checkbox"
                            checked={!!option.actions.logException}
                            onChange={() => {
                              const updated = [...yesNoOptions];
                              updated[optIdx] = { ...updated[optIdx], actions: { ...updated[optIdx].actions, logException: !option.actions.logException } };
                              setYesNoOptions(updated);
                            }}
                            className="w-3.5 h-3.5 rounded border-gray-300 accent-[#D37E91]"
                          />
                          <AlertTriangle className="w-3 h-3 text-theme-tertiary group-hover:text-amber-500" />
                          <span className="text-xs text-theme-secondary">Flag as exception</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer group" title="Send a notification to managers when this answer is selected">
                          <input
                            type="checkbox"
                            checked={!!option.actions.requestAction}
                            onChange={() => {
                              const updated = [...yesNoOptions];
                              updated[optIdx] = { ...updated[optIdx], actions: { ...updated[optIdx].actions, requestAction: !option.actions.requestAction } };
                              setYesNoOptions(updated);
                            }}
                            className="w-3.5 h-3.5 rounded border-gray-300 accent-[#D37E91]"
                          />
                          <Bell className="w-3 h-3 text-theme-tertiary group-hover:text-blue-500" />
                          <span className="text-xs text-theme-secondary">Notify manager</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer group" title="Staff must write what action they took before completing">
                          <input
                            type="checkbox"
                            checked={!!option.actions.requireAction}
                            onChange={() => {
                              const updated = [...yesNoOptions];
                              updated[optIdx] = { ...updated[optIdx], actions: { ...updated[optIdx].actions, requireAction: !option.actions.requireAction } };
                              setYesNoOptions(updated);
                            }}
                            className="w-3.5 h-3.5 rounded border-gray-300 accent-[#D37E91]"
                          />
                          <FileText className="w-3 h-3 text-theme-tertiary group-hover:text-purple-500" />
                          <span className="text-xs text-theme-secondary">Staff must document action</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sub-fields for repeatable record */}
          {config?.hasSubFields && (
            <div>
              <label className="block text-sm font-medium text-theme-primary mb-2">
                Columns (fields in each record)
              </label>
              <div className="space-y-2">
                {subFields.map((sf, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={sf.label}
                      onChange={(e) => {
                        const updated = [...subFields];
                        updated[idx] = { ...updated[idx], label: e.target.value };
                        setSubFields(updated);
                      }}
                      placeholder="Column label"
                      className="flex-1 px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:border-[#D37E91]"
                    />
                    <select
                      value={sf.fieldType}
                      onChange={(e) => {
                        const updated = [...subFields];
                        updated[idx] = { ...updated[idx], fieldType: e.target.value as FieldType };
                        setSubFields(updated);
                      }}
                      className="w-28 px-2 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:border-[#D37E91]"
                    >
                      {RECORD_SUB_FIELD_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {FIELD_TYPE_CONFIG[type]?.label || type}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={sf.unit}
                      onChange={(e) => {
                        const updated = [...subFields];
                        updated[idx] = { ...updated[idx], unit: e.target.value };
                        setSubFields(updated);
                      }}
                      placeholder="Unit"
                      className="w-16 px-2 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:border-[#D37E91]"
                    />
                    <label className="flex items-center gap-1 text-xs text-theme-tertiary">
                      <input
                        type="checkbox"
                        checked={sf.required}
                        onChange={(e) => {
                          const updated = [...subFields];
                          updated[idx] = { ...updated[idx], required: e.target.checked };
                          setSubFields(updated);
                        }}
                        className="w-3 h-3 accent-[#D37E91]"
                      />
                      Req
                    </label>
                    <button
                      type="button"
                      onClick={() => setSubFields(subFields.filter((_, i) => i !== idx))}
                      className="p-1 text-theme-tertiary hover:text-red-500 transition-colors"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setSubFields([...subFields, { label: '', fieldType: FieldType.TEXT, unit: '', required: false }])}
                  className="flex items-center gap-1 text-sm text-[#D37E91] hover:text-[#D37E91]/80 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add column
                </button>
              </div>
            </div>
          )}

          {/* Placeholder */}
          {!config?.hasSubFields && fieldType !== FieldType.YES_NO && fieldType !== FieldType.PASS_FAIL && fieldType !== FieldType.PHOTO && (
            <div>
              <label className="block text-sm font-medium text-theme-primary mb-1">Placeholder</label>
              <input
                type="text"
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
                placeholder="Optional placeholder text"
                className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:border-[#D37E91]"
              />
            </div>
          )}

          {/* Help text */}
          <div>
            <label className="block text-sm font-medium text-theme-primary mb-1">Help Text</label>
            <input
              type="text"
              value={helpText}
              onChange={(e) => setHelpText(e.target.value)}
              placeholder="Optional hint shown below the field"
              className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:border-[#D37E91]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-theme flex items-center justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border border-theme rounded-lg text-theme-secondary hover:bg-theme-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!label.trim()}
            className="px-4 py-2 text-sm bg-[#D37E91] hover:bg-[#D37E91]/90 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {editingField ? 'Update Field' : 'Add Field'}
          </button>
        </div>
      </div>
    </div>
  );
}
