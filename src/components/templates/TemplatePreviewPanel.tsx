'use client';

import { Thermometer, Camera, Check, FileText, ChevronDown, ChevronRight, AlertTriangle, Link as LinkIcon, ExternalLink } from '@/components/ui/icons';
import { useState } from 'react';

interface CustomField {
  id: string;
  field_name: string;
  field_type: string;
  label: string;
  required: boolean;
  field_order: number;
  unit?: string | null;
  min_value?: number | null;
  max_value?: number | null;
  warn_threshold?: number | null;
  fail_threshold?: number | null;
  help_text?: string | null;
  placeholder?: string | null;
  options?: { choices?: string[] } | null;
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly',
  quarterly: 'Quarterly', annually: 'Annually',
  'bi-annually': 'Bi-Annually', triggered: 'On Demand', once: 'Once',
};

const CATEGORY_LABELS: Record<string, string> = {
  food_safety: 'Food Safety', h_and_s: 'Health & Safety',
  fire: 'Fire Safety', cleaning: 'Cleaning', compliance: 'Compliance',
};

const CATEGORY_COLORS: Record<string, string> = {
  food_safety: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  h_and_s: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  fire: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  cleaning: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  compliance: 'bg-checkly-dark/10 dark:bg-checkly/10 text-checkly-dark dark:text-checkly border-checkly-dark/20 dark:border-checkly/20',
};

interface TemplatePreviewPanelProps {
  template: {
    id: string;
    name: string;
    description?: string | null;
    task_description?: string | null;
    category: string;
    frequency: string;
    dayparts?: string[] | null;
    evidence_types?: string[] | null;
    instructions?: string | null;
    recurrence_pattern?: { default_checklist_items?: any[]; template_documents?: Array<{ url: string; fileName: string; fileType: string; fileSize: number }> } | null;
    use_custom_fields?: boolean;
  };
  customFields: CustomField[];
  loadingFields: boolean;
  onEdit: () => void;
  onQuickSchedule: () => void;
}

function parseInstructions(raw: string | null | undefined) {
  if (!raw) return null;
  const sections: { label: string; content: string }[] = [];
  const purposeMatch = raw.match(/Purpose:\n([\s\S]*?)(?:\n\n|$)/);
  const methodMatch = raw.match(/Method:\n([\s\S]*?)(?:\n\n|$)/);
  const importanceMatch = raw.match(/Importance:\n([\s\S]*?)(?:\n\n|$)/);
  const specialMatch = raw.match(/Special Requirements:\n([\s\S]*?)(?:\n\n|$)/);
  if (purposeMatch?.[1]?.trim()) sections.push({ label: 'Purpose', content: purposeMatch[1].trim() });
  if (methodMatch?.[1]?.trim()) sections.push({ label: 'Method', content: methodMatch[1].trim() });
  if (importanceMatch?.[1]?.trim()) sections.push({ label: 'Importance', content: importanceMatch[1].trim() });
  if (specialMatch?.[1]?.trim()) sections.push({ label: 'Special Requirements', content: specialMatch[1].trim() });
  return sections.length > 0 ? sections : null;
}

export function TemplatePreviewPanel({ template, customFields, loadingFields, onEdit, onQuickSchedule }: TemplatePreviewPanelProps) {
  const [showInstructions, setShowInstructions] = useState(false);

  const evidenceTypes = template.evidence_types || [];
  const rawItems = template.recurrence_pattern?.default_checklist_items || [];
  const instructions = parseInstructions(template.instructions);
  const description = template.task_description || template.description;

  const hasYesNo = evidenceTypes.includes('yes_no_checklist');
  const hasChecklist = !hasYesNo && (evidenceTypes.includes('text_note') || evidenceTypes.includes('checklist'));
  const hasTemp = evidenceTypes.includes('temperature');
  const hasPassFail = evidenceTypes.includes('pass_fail');
  const hasPhoto = evidenceTypes.includes('photo');
  const hasCustomFields = template.use_custom_fields;
  const hasDocUpload = evidenceTypes.includes('document_upload');
  const templateDocs = template.recurrence_pattern?.template_documents || [];

  // Parse checklist items based on evidence type
  const yesNoItems = hasYesNo ? rawItems.filter((item: any) => {
    const text = typeof item === 'string' ? item : item?.text;
    return text && text.trim().length > 0;
  }) : [];

  const checklistItems = hasChecklist ? rawItems.filter((item: any) => {
    const text = typeof item === 'string' ? item : item?.text;
    return text && text.trim().length > 0;
  }) : [];

  // Count what content is present vs missing
  const sections: { label: string; hasContent: boolean }[] = [];
  if (hasYesNo) sections.push({ label: 'Yes/No Questions', hasContent: yesNoItems.length > 0 });
  if (hasChecklist) sections.push({ label: 'Checklist Items', hasContent: checklistItems.length > 0 });
  if (hasTemp) sections.push({ label: 'Temperature Logging', hasContent: true }); // Always renders input
  if (hasPassFail) sections.push({ label: 'Pass/Fail', hasContent: true });
  if (hasPhoto) sections.push({ label: 'Photo Evidence', hasContent: true });
  if (hasDocUpload) sections.push({ label: 'Document Upload', hasContent: templateDocs.length > 0 });
  if (hasCustomFields) sections.push({ label: 'Custom Fields', hasContent: customFields.length > 0 });

  const missingSections = sections.filter(s => !s.hasContent);
  const noItemsAttached = hasYesNo && yesNoItems.length === 0;
  const noChecklistAttached = hasChecklist && checklistItems.length === 0;

  return (
    <div className="ml-6 mr-2 mb-4 mt-1 border border-theme rounded-lg overflow-hidden bg-theme-surface">
      {/* Task Header — mimics what staff see */}
      <div className="px-4 py-3 border-b border-theme bg-gray-50 dark:bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-theme-primary">{template.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[template.category] || 'bg-theme-muted text-theme-tertiary border-theme'}`}>
                {CATEGORY_LABELS[template.category] || template.category}
              </span>
              <span className="text-[10px] text-theme-tertiary">
                {FREQUENCY_LABELS[template.frequency] || template.frequency}
              </span>
              {template.dayparts && template.dayparts.length > 0 && (
                <span className="text-[10px] text-theme-tertiary">
                  {template.dayparts.map(d => d.replace(/_/g, ' ')).join(', ')}
                </span>
              )}
            </div>
          </div>
          <span className="text-[10px] font-medium px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            PREVIEW
          </span>
        </div>
        {description && (
          <p className="text-xs text-theme-secondary mt-2">{description}</p>
        )}
      </div>

      {/* Missing data warning */}
      {(noItemsAttached || noChecklistAttached || missingSections.length > 0) && (
        <div className="px-4 py-2 bg-amber-500/5 border-b border-amber-500/10">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-600 dark:text-amber-400">
              {noItemsAttached && <p>Yes/No feature enabled but <strong>no questions attached</strong> — staff will see an empty section.</p>}
              {noChecklistAttached && <p>Checklist feature enabled but <strong>no items attached</strong> — staff will see an empty section.</p>}
              {!instructions && <p>No instructions set — staff won't know the purpose or method.</p>}
            </div>
          </div>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Instructions */}
        {instructions && (
          <div className="border border-theme rounded-lg overflow-hidden">
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-theme-secondary hover:bg-theme-hover transition-colors"
            >
              {showInstructions ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Task Instructions
            </button>
            {showInstructions && (
              <div className="px-3 pb-3 space-y-2 border-t border-theme">
                {instructions.map(s => (
                  <div key={s.label} className="pt-2">
                    <p className="text-[10px] font-semibold text-theme-tertiary uppercase tracking-wider">{s.label}</p>
                    <p className="text-xs text-theme-primary mt-0.5 whitespace-pre-wrap">{s.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Yes/No Checklist — rendered as staff would see */}
        {hasYesNo && (
          <div>
            <p className="text-xs font-medium text-theme-primary mb-2">Yes / No Checklist</p>
            {yesNoItems.length === 0 ? (
              <div className="px-3 py-2 rounded border border-dashed border-amber-500/30 bg-amber-500/5 text-xs text-amber-600 dark:text-amber-400">
                No questions attached — edit template to add items
              </div>
            ) : (
              <div className="space-y-2">
                {yesNoItems.map((item: any, i: number) => {
                  const text = typeof item === 'string' ? item : item.text;
                  const options = item?.options;
                  const hasEnhancedOptions = Array.isArray(options) && options.length > 0;

                  return (
                    <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-lg border border-theme bg-gray-50 dark:bg-white/[0.02]">
                      <span className="text-xs text-theme-tertiary mt-0.5 w-4 shrink-0">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-theme-primary">{text}</p>
                        {hasEnhancedOptions && (
                          <div className="flex gap-1.5 mt-1.5">
                            {options.map((opt: any, oi: number) => {
                              const hasActions = opt.actions && (opt.actions.logException || opt.actions.requireAction || opt.actions.requestAction);
                              return (
                                <span
                                  key={oi}
                                  className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                    hasActions
                                      ? 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5'
                                      : 'border-theme text-theme-tertiary bg-theme-surface'
                                  }`}
                                >
                                  {opt.label}
                                  {hasActions && ' ⚡'}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        {!hasEnhancedOptions && (
                          <div className="flex gap-1.5 mt-1.5">
                            <span className="text-[10px] px-2 py-0.5 rounded-full border border-theme text-theme-tertiary bg-theme-surface">Yes</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full border border-theme text-theme-tertiary bg-theme-surface">No</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Regular Checklist */}
        {hasChecklist && (
          <div>
            <p className="text-xs font-medium text-theme-primary mb-2">Checklist</p>
            {checklistItems.length === 0 ? (
              <div className="px-3 py-2 rounded border border-dashed border-amber-500/30 bg-amber-500/5 text-xs text-amber-600 dark:text-amber-400">
                No items attached — edit template to add checklist items
              </div>
            ) : (
              <div className="space-y-1">
                {checklistItems.map((item: any, i: number) => {
                  const text = typeof item === 'string' ? item : item.text;
                  return (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-theme bg-gray-50 dark:bg-white/[0.02]">
                      <div className="w-4 h-4 rounded border-2 border-theme shrink-0" />
                      <span className="text-xs text-theme-primary">{text}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Temperature Logging */}
        {hasTemp && (
          <div>
            <p className="text-xs font-medium text-theme-primary mb-2 flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-red-500" />
              Temperature Logging
            </p>
            <div className="px-3 py-2 rounded-lg border border-theme bg-gray-50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-8 rounded border border-dashed border-theme bg-theme-surface flex items-center px-2">
                  <span className="text-xs text-theme-tertiary">Temperature input °C</span>
                </div>
              </div>
              <p className="text-[10px] text-theme-tertiary mt-1">Equipment/assets configured during scheduling</p>
            </div>
          </div>
        )}

        {/* Pass/Fail */}
        {hasPassFail && (
          <div>
            <p className="text-xs font-medium text-theme-primary mb-2">Pass / Fail</p>
            <div className="flex gap-2">
              <span className="flex-1 text-center text-xs py-1.5 rounded-lg border border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/5">
                Pass
              </span>
              <span className="flex-1 text-center text-xs py-1.5 rounded-lg border border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/5">
                Fail
              </span>
            </div>
          </div>
        )}

        {/* Photo Evidence */}
        {hasPhoto && (
          <div>
            <p className="text-xs font-medium text-theme-primary mb-2 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-blue-500" />
              Photo Evidence
            </p>
            <div className="px-3 py-3 rounded-lg border border-dashed border-theme bg-gray-50 dark:bg-white/[0.02] text-center">
              <span className="text-xs text-theme-tertiary">Staff will upload photo evidence here</span>
            </div>
          </div>
        )}

        {/* Files & Links */}
        {hasDocUpload && (
          <div>
            <p className="text-xs font-medium text-theme-primary mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-theme-tertiary" />
              Files & Links
            </p>
            {templateDocs.length === 0 ? (
              <div className="px-3 py-2 rounded border border-dashed border-amber-500/30 bg-amber-500/5 text-xs text-amber-600 dark:text-amber-400">
                No files or links attached — edit template to add
              </div>
            ) : (
              <div className="space-y-1">
                {templateDocs.map((doc: any, i: number) => {
                  const isLink = doc.fileType === 'link' || doc.fileSize === 0;
                  return (
                    <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-theme bg-gray-50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors group">
                      {isLink ? (
                        <LinkIcon className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-red-500 dark:text-red-400 shrink-0" />
                      )}
                      <span className="text-xs text-theme-primary truncate flex-1">{doc.fileName}</span>
                      {!isLink && doc.fileSize > 0 && (
                        <span className="text-[10px] text-theme-tertiary shrink-0">
                          {doc.fileSize < 1024 * 1024
                            ? `${(doc.fileSize / 1024).toFixed(0)} KB`
                            : `${(doc.fileSize / 1024 / 1024).toFixed(1)} MB`}
                        </span>
                      )}
                      <ExternalLink className="w-3 h-3 text-theme-tertiary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Custom Fields */}
        {hasCustomFields && (
          <div>
            <p className="text-xs font-medium text-theme-primary mb-2">Custom Form Fields</p>
            {loadingFields ? (
              <p className="text-xs text-theme-tertiary">Loading fields...</p>
            ) : customFields.length === 0 ? (
              <div className="px-3 py-2 rounded border border-dashed border-amber-500/30 bg-amber-500/5 text-xs text-amber-600 dark:text-amber-400">
                No custom fields configured — edit template to add fields
              </div>
            ) : (
              <div className="space-y-2">
                {customFields.map(f => (
                  <div key={f.id} className="px-3 py-2 rounded-lg border border-theme bg-gray-50 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-theme-primary">
                        {f.label}
                        {f.required && <span className="text-red-500 ml-0.5">*</span>}
                      </span>
                      <span className={`text-[9px] px-1 py-px rounded font-medium ${
                        f.field_type === 'temperature' ? 'bg-red-500/10 text-red-500' :
                        f.field_type === 'number' ? 'bg-blue-500/10 text-blue-500' :
                        f.field_type === 'select' ? 'bg-amber-500/10 text-amber-500' :
                        f.field_type === 'checkbox' ? 'bg-teal-500/10 text-teal-500' :
                        'bg-gray-500/10 text-theme-tertiary'
                      }`}>
                        {f.field_type}
                      </span>
                    </div>
                    {f.help_text && <p className="text-[10px] text-theme-tertiary mb-1">{f.help_text}</p>}
                    {/* Mock input */}
                    {f.field_type === 'select' && f.options?.choices ? (
                      <div className="flex flex-wrap gap-1">
                        {f.options.choices.map((c, ci) => (
                          <span key={ci} className="text-[10px] px-1.5 py-0.5 rounded border border-theme text-theme-tertiary bg-theme-surface">{c}</span>
                        ))}
                      </div>
                    ) : f.field_type === 'checkbox' ? (
                      <div className="w-4 h-4 rounded border-2 border-theme" />
                    ) : (
                      <div className="h-7 rounded border border-dashed border-theme bg-theme-surface flex items-center px-2">
                        <span className="text-[10px] text-theme-tertiary">
                          {f.placeholder || `${f.field_type === 'temperature' ? 'Temperature' : f.field_type === 'number' ? 'Number' : 'Text'} input`}
                          {f.unit && ` (${f.unit})`}
                        </span>
                      </div>
                    )}
                    {/* Range / thresholds */}
                    {(f.min_value != null || f.max_value != null || f.warn_threshold != null || f.fail_threshold != null) && (
                      <div className="flex gap-3 mt-1 text-[10px]">
                        {(f.min_value != null || f.max_value != null) && (
                          <span className="text-theme-tertiary">Range: {f.min_value ?? '—'} – {f.max_value ?? '—'}{f.unit ? ` ${f.unit}` : ''}</span>
                        )}
                        {f.warn_threshold != null && (
                          <span className="text-amber-500">Warn: {f.warn_threshold}</span>
                        )}
                        {f.fail_threshold != null && (
                          <span className="text-red-500">Fail: {f.fail_threshold}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes section always present */}
        <div>
          <p className="text-xs font-medium text-theme-primary mb-2 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-theme-tertiary" />
            Notes
          </p>
          <div className="h-12 rounded-lg border border-dashed border-theme bg-gray-50 dark:bg-white/[0.02] flex items-center justify-center">
            <span className="text-[10px] text-theme-tertiary">Free-text notes field</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-theme bg-gray-50 dark:bg-white/[0.02]">
        <button
          onClick={onEdit}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-theme text-theme-primary hover:bg-theme-hover transition-colors"
        >
          Edit Template
        </button>
        <button
          onClick={onQuickSchedule}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#D37E91] hover:bg-[#D37E91]/90 text-white transition-colors"
        >
          Quick Schedule
        </button>
      </div>
    </div>
  );
}
