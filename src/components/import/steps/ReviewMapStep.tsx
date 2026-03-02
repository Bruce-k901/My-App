'use client';

import { useState } from 'react';
import { CheckCircle, AlertTriangle, ChevronDown, ChevronRight, Plus, X, Trash2 } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import {
  CATEGORY_OPTIONS,
  FREQUENCY_OPTIONS,
  CATEGORY_LABEL,
  FREQUENCY_LABEL,
  type TrailTemplate,
  type TrailChecklistItem,
} from '@/lib/trail-import';

const EVIDENCE_TYPE_LABEL: Record<string, string> = {
  temperature: 'Temperature Logging',
  text_note: 'Text Notes',
  yes_no_checklist: 'Yes/No Checks',
  photo: 'Photo Evidence',
  pass_fail: 'Pass/Fail',
  custom_fields: 'Custom Form Builder',
};

// Feature options that map to Opsly evidence_types
const FEATURE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'temperature', label: 'Temperature Logs' },
  { value: 'photo', label: 'Photo Evidence' },
  { value: 'pass_fail', label: 'Pass/Fail' },
  { value: 'yes_no_checklist', label: 'Yes/No Checklist' },
  { value: 'text_note', label: 'Text/Checklist' },
];

// Custom form builder is mutually exclusive with legacy features
const CUSTOM_FIELDS_OPTION = { value: 'custom_fields', label: 'Custom Form Builder' };

interface ComplianceTemplate {
  id: string;
  slug: string;
  name: string;
}

interface ReviewMapStepProps {
  templates: TrailTemplate[];
  onTemplatesChange: (templates: TrailTemplate[]) => void;
  onNext: () => void;
  onBack: () => void;
  totalRows: number;
  dateRange: { earliest: string; latest: string } | null;
  siteName: string;
  warnings: string[];
  complianceTemplates?: ComplianceTemplate[];
}

export function ReviewMapStep({
  templates,
  onTemplatesChange,
  onNext,
  onBack,
  totalRows,
  dateRange,
  siteName,
  warnings,
  complianceTemplates = [],
}: ReviewMapStepProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkFrequency, setBulkFrequency] = useState('');

  const included = templates.filter(t => t.included);
  const totalChecklist = included.reduce((sum, t) => sum + t.checklistItems.length, 0);
  const totalFields = included.reduce((sum, t) => sum + t.detectedFields.fields.length, 0);

  const updateTemplate = (idx: number, updates: Partial<TrailTemplate>) => {
    const next = [...templates];
    next[idx] = { ...next[idx], ...updates };
    onTemplatesChange(next);
  };

  const toggleInclude = (idx: number) => {
    updateTemplate(idx, { included: !templates[idx].included });
  };

  const applyBulkCategory = () => {
    if (!bulkCategory) return;
    const next = templates.map(t => t.included ? { ...t, inferredCategory: bulkCategory } : t);
    onTemplatesChange(next);
    setBulkCategory('');
  };

  const applyBulkFrequency = () => {
    if (!bulkFrequency) return;
    const next = templates.map(t => t.included ? { ...t, inferredFrequency: bulkFrequency } : t);
    onTemplatesChange(next);
    setBulkFrequency('');
  };

  const confidenceIcon = (conf: 'high' | 'medium' | 'low') => {
    if (conf === 'high') return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
    if (conf === 'medium') return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
    return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
  };

  // Get active evidence types for a template (override or auto-detected)
  const getEvidenceTypes = (tmpl: TrailTemplate): string[] => {
    return tmpl.overrideEvidenceTypes || tmpl.detectedFields.evidenceTypes;
  };

  // Toggle an evidence type for a template
  const toggleFeature = (idx: number, featureValue: string) => {
    const tmpl = templates[idx];
    const current = getEvidenceTypes(tmpl);
    const isActive = current.includes(featureValue);

    // Custom fields is mutually exclusive with legacy features
    if (featureValue === 'custom_fields') {
      if (isActive) {
        // Turning off custom fields — restore detected evidence types or default
        const fallback = tmpl.detectedFields.evidenceTypes.length > 0
          ? tmpl.detectedFields.evidenceTypes
          : ['text_note'];
        updateTemplate(idx, { overrideEvidenceTypes: fallback });
      } else {
        // Turning on custom fields — replace all with just custom_fields
        updateTemplate(idx, { overrideEvidenceTypes: ['custom_fields'] });
      }
      return;
    }

    // Toggling a legacy feature — remove custom_fields if present
    const withoutCustom = current.filter(et => et !== 'custom_fields');
    const updated = isActive
      ? withoutCustom.filter(et => et !== featureValue)
      : [...withoutCustom, featureValue];
    // Ensure at least one evidence type
    if (updated.length === 0) return;
    updateTemplate(idx, { overrideEvidenceTypes: updated });
  };

  // Checklist item helpers
  const updateChecklistItem = (templateIdx: number, itemIdx: number, newText: string) => {
    const tmpl = templates[templateIdx];
    const items = [...tmpl.checklistItems];
    items[itemIdx] = { ...items[itemIdx], text: newText };
    updateTemplate(templateIdx, { checklistItems: items });
  };

  const removeChecklistItem = (templateIdx: number, itemIdx: number) => {
    const tmpl = templates[templateIdx];
    const items = tmpl.checklistItems.filter((_, i) => i !== itemIdx);
    updateTemplate(templateIdx, { checklistItems: items });
  };

  const addChecklistItem = (templateIdx: number) => {
    const tmpl = templates[templateIdx];
    const newItem: TrailChecklistItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : `item_${Date.now()}`,
      text: '',
      required: true,
    };
    updateTemplate(templateIdx, { checklistItems: [...tmpl.checklistItems, newItem] });
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 rounded-lg bg-theme-surface-elevated border border-theme">
          <p className="text-xs text-theme-tertiary">CSV Rows</p>
          <p className="text-lg font-semibold text-theme-primary">{totalRows.toLocaleString()}</p>
        </div>
        <div className="p-3 rounded-lg bg-theme-surface-elevated border border-theme">
          <p className="text-xs text-theme-tertiary">Unique Tasks</p>
          <p className="text-lg font-semibold text-theme-primary">{templates.length}</p>
        </div>
        <div className="p-3 rounded-lg bg-theme-surface-elevated border border-theme">
          <p className="text-xs text-theme-tertiary">Selected</p>
          <p className="text-lg font-semibold text-emerald-500">{included.length}</p>
        </div>
        <div className="p-3 rounded-lg bg-theme-surface-elevated border border-theme">
          <p className="text-xs text-theme-tertiary">Checklist Items</p>
          <p className="text-lg font-semibold text-theme-primary">{totalChecklist}</p>
        </div>
        <div className="p-3 rounded-lg bg-theme-surface-elevated border border-theme">
          <p className="text-xs text-theme-tertiary">Record Fields</p>
          <p className="text-lg font-semibold text-blue-500">{totalFields}</p>
        </div>
      </div>

      {dateRange && (
        <p className="text-xs text-theme-tertiary">
          Data from <strong>{dateRange.earliest}</strong> to <strong>{dateRange.latest}</strong>
          {siteName && <> &middot; Site: <strong>{siteName}</strong></>}
        </p>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-1">
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-500 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {w}
            </p>
          ))}
        </div>
      )}

      {/* Bulk actions */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-theme-surface-elevated border border-theme">
        <span className="text-xs text-theme-tertiary font-medium">Bulk:</span>
        <select
          value={bulkCategory}
          onChange={e => setBulkCategory(e.target.value)}
          className="text-xs px-2 py-1 rounded border border-theme bg-theme-surface text-theme-primary"
        >
          <option value="">Set category...</option>
          {CATEGORY_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {bulkCategory && (
          <Button size="sm" variant="ghost" onClick={applyBulkCategory} className="text-xs h-6">
            Apply
          </Button>
        )}
        <select
          value={bulkFrequency}
          onChange={e => setBulkFrequency(e.target.value)}
          className="text-xs px-2 py-1 rounded border border-theme bg-theme-surface text-theme-primary"
        >
          <option value="">Set frequency...</option>
          {FREQUENCY_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {bulkFrequency && (
          <Button size="sm" variant="ghost" onClick={applyBulkFrequency} className="text-xs h-6">
            Apply
          </Button>
        )}
      </div>

      {/* Template list */}
      <div className="space-y-1 max-h-[50vh] overflow-y-auto">
        {templates.map((tmpl, idx) => {
          const isExpanded = expandedIdx === idx;
          const activeEvidenceTypes = getEvidenceTypes(tmpl);

          return (
            <div
              key={idx}
              className={`rounded-lg border transition-colors ${
                tmpl.included
                  ? 'border-theme bg-theme-surface-elevated'
                  : 'border-theme/50 bg-theme-surface opacity-50'
              }`}
            >
              {/* Row header */}
              <div className="flex items-center gap-2 px-3 py-2">
                <input
                  type="checkbox"
                  checked={tmpl.included}
                  onChange={() => toggleInclude(idx)}
                  className="accent-checkly-dark dark:accent-checkly"
                />
                <button
                  onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                  className="flex-1 flex items-center gap-2 text-left min-w-0"
                >
                  {isExpanded
                    ? <ChevronDown className="w-4 h-4 text-theme-tertiary flex-shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-theme-tertiary flex-shrink-0" />
                  }
                  <span className="text-sm font-medium text-theme-primary truncate">{tmpl.name}</span>
                  {tmpl.isDuplicate && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 flex-shrink-0">
                      Exists
                    </span>
                  )}
                  {tmpl.matchedTemplateName && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 flex-shrink-0">
                      Compliance: {tmpl.matchedTemplateName}
                    </span>
                  )}
                  <span className="text-xs text-theme-tertiary flex-shrink-0">
                    {tmpl.instanceCount} instances
                  </span>
                </button>

                {/* Category dropdown */}
                <select
                  value={tmpl.inferredCategory}
                  onChange={e => updateTemplate(idx, { inferredCategory: e.target.value })}
                  disabled={!tmpl.included}
                  className="text-xs px-2 py-1 rounded border border-theme bg-theme-surface text-theme-primary w-[140px] flex-shrink-0"
                >
                  {CATEGORY_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>

                {/* Frequency dropdown */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {confidenceIcon(tmpl.frequencyConfidence)}
                  <select
                    value={tmpl.inferredFrequency}
                    onChange={e => updateTemplate(idx, { inferredFrequency: e.target.value })}
                    disabled={!tmpl.included}
                    className="text-xs px-2 py-1 rounded border border-theme bg-theme-surface text-theme-primary w-[120px]"
                  >
                    {FREQUENCY_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Checklist badge */}
                {tmpl.checklistItems.length > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-checkly-dark/10 dark:bg-checkly/10 text-checkly-dark dark:text-checkly flex-shrink-0">
                    {tmpl.checklistItems.length} items
                  </span>
                )}
                {/* Fields badge */}
                {tmpl.detectedFields.fields.length > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 flex-shrink-0">
                    {tmpl.detectedFields.fields.length} fields
                  </span>
                )}
                {/* Photo badge */}
                {tmpl.detectedFields.hasPhotos && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500 flex-shrink-0">
                    Photo
                  </span>
                )}
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-10 pb-4 space-y-4">
                  {/* Editable template name */}
                  <div>
                    <label className="block text-xs font-medium text-theme-tertiary mb-1">Template Name</label>
                    <input
                      type="text"
                      value={tmpl.name}
                      onChange={e => updateTemplate(idx, { name: e.target.value })}
                      className="w-full text-sm font-medium text-theme-primary bg-transparent border border-dashed border-theme rounded px-2 py-1.5 focus:border-[#D37E91] focus:outline-none"
                    />
                  </div>

                  {/* Feature toggles (evidence types) */}
                  <div>
                    <label className="block text-xs font-medium text-theme-tertiary mb-2">Opsly Features</label>
                    <div className="flex flex-wrap gap-2">
                      {FEATURE_OPTIONS.map(feat => {
                        const isActive = activeEvidenceTypes.includes(feat.value);
                        const isCustomMode = activeEvidenceTypes.includes('custom_fields');
                        return (
                          <button
                            key={feat.value}
                            onClick={() => toggleFeature(idx, feat.value)}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                              isActive && !isCustomMode
                                ? 'border-[#D37E91] bg-[#D37E91]/15 text-[#D37E91]'
                                : isCustomMode
                                  ? 'border-theme text-theme-tertiary/50'
                                  : 'border-theme text-theme-tertiary hover:border-theme-hover'
                            }`}
                          >
                            {feat.label}
                          </button>
                        );
                      })}
                      <span className="text-xs text-theme-tertiary/50 self-center">or</span>
                      {(() => {
                        const isCustomActive = activeEvidenceTypes.includes('custom_fields');
                        return (
                          <button
                            onClick={() => toggleFeature(idx, 'custom_fields')}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                              isCustomActive
                                ? 'border-blue-500 bg-blue-500/15 text-blue-500'
                                : 'border-theme text-theme-tertiary hover:border-theme-hover'
                            }`}
                          >
                            {CUSTOM_FIELDS_OPTION.label}
                          </button>
                        );
                      })()}
                    </div>
                    {activeEvidenceTypes.includes('custom_fields') && (
                      <p className="text-[10px] text-blue-500 mt-1.5">
                        Detected fields will be used as custom form fields for staff to fill in
                      </p>
                    )}
                  </div>

                  {/* Compliance template mapping */}
                  {complianceTemplates.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-theme-tertiary mb-1">
                        Link to Compliance Template
                      </label>
                      <select
                        value={tmpl.matchedTemplateSlug || ''}
                        onChange={e => {
                          const match = complianceTemplates.find(ct => ct.slug === e.target.value);
                          updateTemplate(idx, {
                            matchedTemplateSlug: match?.slug || undefined,
                            matchedTemplateName: match?.name || undefined,
                          });
                        }}
                        className="w-full text-xs px-2 py-1.5 rounded border border-theme bg-theme-surface text-theme-primary"
                      >
                        <option value="">Create as new template</option>
                        {complianceTemplates.map(ct => (
                          <option key={ct.slug} value={ct.slug}>{ct.name}</option>
                        ))}
                      </select>
                      {tmpl.matchedTemplateSlug && (
                        <p className="text-[10px] text-emerald-500 mt-1">
                          Will link to existing template instead of creating a new one
                        </p>
                      )}
                    </div>
                  )}

                  {/* Editable checklist items */}
                  <div>
                    <label className="block text-xs font-medium text-theme-tertiary mb-1">
                      Checklist Items ({tmpl.checklistItems.length})
                    </label>
                    {tmpl.checklistItems.length > 0 ? (
                      <div className="space-y-1">
                        {tmpl.checklistItems.map((item, i) => (
                          <div key={item.id} className="flex items-center gap-2">
                            <span className="w-4 text-right text-xs text-theme-tertiary">{i + 1}.</span>
                            <input
                              type="text"
                              value={item.text}
                              onChange={e => updateChecklistItem(idx, i, e.target.value)}
                              className="flex-1 text-xs text-theme-secondary bg-transparent border-b border-dashed border-theme px-1 py-0.5 focus:border-[#D37E91] focus:outline-none"
                              placeholder="Checklist item..."
                            />
                            <button
                              onClick={() => removeChecklistItem(idx, i)}
                              className="p-0.5 rounded hover:bg-red-500/10 text-theme-tertiary hover:text-red-400 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-theme-tertiary italic">No checklist items detected.</p>
                    )}
                    <button
                      onClick={() => addChecklistItem(idx)}
                      className="flex items-center gap-1 text-xs text-[#D37E91] hover:text-[#D37E91]/80 mt-2 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Add item
                    </button>
                  </div>

                  {/* Detected record fields (read-only) */}
                  {tmpl.detectedFields.fields.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-theme-tertiary mb-1">Detected Record Fields</label>
                      <div className="space-y-1">
                        {tmpl.detectedFields.fields.map((field, i) => (
                          <div key={field.field_name} className="flex items-center gap-2 text-xs text-theme-secondary">
                            <span className="w-4 text-right text-theme-tertiary">{i + 1}.</span>
                            <span className="font-mono text-[10px] px-1 py-0.5 bg-theme-muted rounded">
                              {field.field_type}
                            </span>
                            <span>{field.label}</span>
                            {field.field_type === 'temperature' && field.warn_threshold !== null && (
                              <span className="text-[10px] text-amber-500">
                                warn:{field.warn_threshold}&deg;C fail:{field.fail_threshold}&deg;C
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No content message */}
                  {tmpl.checklistItems.length === 0 && tmpl.detectedFields.fields.length === 0 && (
                    <p className="text-xs text-theme-tertiary italic">No checklist items or record fields detected.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button
          onClick={onNext}
          disabled={included.length === 0}
          className="bg-checkly-dark dark:bg-checkly text-white dark:text-[#1C1916] hover:opacity-90"
        >
          Next: Assign Sites ({included.length} templates)
        </Button>
      </div>
    </div>
  );
}
