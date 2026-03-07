'use client';

import type { ChecklistTask, EnabledFeatures, TaskDataBase } from '@/types/task-completion.types';
import type { TemplateField } from '@/types/checklist';
import { FileText, ExternalLink, Link as LinkIcon } from '@/components/ui/icons';
import { ChecklistRenderer } from './features/ChecklistRenderer';
import { YesNoChecklistRenderer } from './features/YesNoChecklistRenderer';
import { TemperatureRenderer } from './features/TemperatureRenderer';
import { PhotoEvidenceRenderer } from './features/PhotoEvidenceRenderer';
import { CustomFieldsRenderer } from './custom-fields/CustomFieldsRenderer';

interface TemplateRendererProps {
  task: ChecklistTask;
  taskData: TaskDataBase;
  template: any;
  assets: Map<string, any>;
  assetTempRanges: Map<string, { min: number | null; max: number | null }>;
  enabledFeatures: EnabledFeatures;

  // Temperatures
  temperatures: Record<string, number | null>;
  onTemperatureChange: (assetId: string, temp: number | null) => void;

  // Checklist
  checklistItems: Array<{ text: string; completed: boolean }>;
  onChecklistItemChange: (index: number, completed: boolean) => void;

  // Yes/No checklist
  yesNoItems: any[];
  onYesNoItemChange: (index: number, answer: string | null) => void;
  actionResponses?: Record<number, string>;
  onActionResponse?: (index: number, response: string) => void;
  yesNoManagerSelections?: Record<number, string[]>;
  onYesNoManagerSelect?: (index: number, managerIds: string[]) => void;

  // Photos
  photos: File[];
  onPhotoAdd: (file: File) => void;
  onPhotoRemove: (index: number) => void;

  // Out of range actions
  placedActions?: Map<string, { action: 'monitor' | 'callout'; duration?: number; notes?: string }>;
  onPlaceAction?: (assetId: string, action: 'monitor' | 'callout', options?: { duration?: number; notes?: string }) => void;
  onRemoveAction?: (assetId: string) => void;

  // Notes
  notes: string;
  onNotesChange: (notes: string) => void;

  // Custom fields (form builder)
  customFields?: TemplateField[];
  customFieldValues?: Record<string, any>;
  onCustomFieldChange?: (fieldName: string, value: any) => void;
  customRecords?: Record<string, any>[];
  onAddRecord?: () => void;
  onUpdateRecord?: (index: number, fieldName: string, value: any) => void;
  onRemoveRecord?: (index: number) => void;

  // Available managers for yes/no action notifications
  availableManagers?: Array<{ id: string; full_name: string; email: string }>;

  // State
  disabled?: boolean;
}

/** Parse structured instruction string into sections, omitting empty ones */
function parseInstructions(raw: string | null | undefined): { label: string; content: string }[] | null {
  if (!raw) return null;
  const sections: { label: string; content: string }[] = [];
  const purposeMatch = raw.match(/Purpose:\n([\s\S]*?)(?:\n\n|$)/);
  const importanceMatch = raw.match(/Importance:\n([\s\S]*?)(?:\n\n|$)/);
  const methodMatch = raw.match(/Method:\n([\s\S]*?)(?:\n\n|$)/);
  const specialMatch = raw.match(/Special Requirements:\n([\s\S]*?)(?:\n\n|$)/);
  if (purposeMatch?.[1]?.trim()) sections.push({ label: 'Purpose', content: purposeMatch[1].trim() });
  if (importanceMatch?.[1]?.trim()) sections.push({ label: 'Importance', content: importanceMatch[1].trim() });
  if (methodMatch?.[1]?.trim()) sections.push({ label: 'Method', content: methodMatch[1].trim() });
  if (specialMatch?.[1]?.trim()) sections.push({ label: 'Special Requirements', content: specialMatch[1].trim() });
  // If no structured sections found but there's plain text, show it as-is
  if (sections.length === 0 && raw.trim()) {
    // Check if it's just empty headers with no content
    const stripped = raw.replace(/Purpose:|Importance:|Method:|Special Requirements:/g, '').trim();
    if (stripped) sections.push({ label: 'Instructions', content: raw.trim() });
  }
  return sections.length > 0 ? sections : null;
}

export function TemplateRenderer({
  task,
  taskData,
  template,
  assets,
  assetTempRanges,
  enabledFeatures,
  temperatures,
  onTemperatureChange,
  checklistItems,
  onChecklistItemChange,
  yesNoItems,
  onYesNoItemChange,
  actionResponses,
  onActionResponse,
  yesNoManagerSelections,
  onYesNoManagerSelect,
  photos,
  onPhotoAdd,
  onPhotoRemove,
  placedActions,
  onPlaceAction,
  onRemoveAction,
  notes,
  onNotesChange,
  customFields,
  customFieldValues,
  onCustomFieldChange,
  customRecords,
  onAddRecord,
  onUpdateRecord,
  onRemoveRecord,
  availableManagers,
  disabled = false
}: TemplateRendererProps) {
  // Check if we have temperature data to render - just check assets Map
  const hasTemperatureData = assets.size > 0;

  // Parse instructions into sections, omitting empty ones
  const rawInstructions = task.custom_instructions || template?.instructions;
  const instructionSections = parseInstructions(rawInstructions);

  // Reference documents attached to the template (SOPs, RAs, guides)
  // Check task_data first, then fall back to template's recurrence_pattern
  const referenceDocuments: Array<{ url: string; fileName: string; fileType: string; fileSize: number }> =
    taskData?.referenceDocuments ||
    template?.recurrence_pattern?.template_documents ||
    [];

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const ReferenceDocumentsSection = referenceDocuments.length > 0 ? (
    <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-3">
      <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-1.5">
        <FileText className="w-3.5 h-3.5" />
        Reference Documents
      </h4>
      <div className="space-y-1.5">
        {referenceDocuments.map((doc, i) => {
          const isLink = doc.fileType === 'link' || doc.fileSize === 0;
          return (
            <a
              key={i}
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white/60 dark:bg-white/5 border border-blue-100 dark:border-blue-500/10 hover:bg-white dark:hover:bg-white/10 transition-colors group"
            >
              {isLink ? (
                <LinkIcon className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
              )}
              <span className="text-xs text-blue-700 dark:text-blue-300 font-medium truncate flex-1">
                {doc.fileName}
              </span>
              {!isLink && doc.fileSize > 0 && (
                <span className="text-[10px] text-blue-400 dark:text-blue-500 shrink-0">
                  {formatFileSize(doc.fileSize)}
                </span>
              )}
              <ExternalLink className="w-3 h-3 text-blue-400 dark:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </a>
          );
        })}
      </div>
    </div>
  ) : null;

  // Custom fields mode: render dynamic form instead of legacy features
  if (enabledFeatures.customFields && customFields && customFields.length > 0 && onCustomFieldChange) {
    const topLevelFields = customFields.filter(f => !f.parent_field_id);

    return (
      <div className="space-y-6">
        {/* Task Instructions — only show sections with content */}
        {instructionSections && (
          <div className="bg-module-fg/10 border border-module-fg/30 rounded-lg p-4">
            <h4 className="text-sm font-medium text-module-fg mb-2">Instructions</h4>
            <div className="space-y-2">
              {instructionSections.map(s => (
                <div key={s.label}>
                  <p className="text-xs font-semibold text-module-fg/60 uppercase tracking-wider">{s.label}</p>
                  <p className="text-sm text-theme-tertiary whitespace-pre-wrap mt-0.5">{s.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reference Documents */}
        {ReferenceDocumentsSection}

        <CustomFieldsRenderer
          fields={topLevelFields}
          allFields={customFields}
          values={customFieldValues || {}}
          onChange={onCustomFieldChange}
          records={customRecords || []}
          onAddRecord={onAddRecord || (() => {})}
          onUpdateRecord={onUpdateRecord || (() => {})}
          onRemoveRecord={onRemoveRecord || (() => {})}
          managers={availableManagers}
          disabled={disabled}
        />

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-theme-primary mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            disabled={disabled}
            rows={3}
            className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary placeholder-theme-tertiary focus:outline-none focus:border-module-fg transition-colors text-sm disabled:opacity-50 resize-none"
            placeholder="Add any notes..."
          />
        </div>
      </div>
    );
  }

  // Legacy feature-toggle mode
  return (
    <div className="space-y-6">
      {/* Task Instructions — only show sections with content */}
      {instructionSections && (
        <div className="bg-module-fg/10 border border-module-fg/30 rounded-lg p-4">
          <h4 className="text-sm font-medium text-module-fg mb-2">Instructions</h4>
          <div className="space-y-2">
            {instructionSections.map(s => (
              <div key={s.label}>
                <p className="text-xs font-semibold text-module-fg/60 uppercase tracking-wider">{s.label}</p>
                <p className="text-sm text-theme-tertiary whitespace-pre-wrap mt-0.5">{s.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reference Documents */}
      {ReferenceDocumentsSection}

      {/* Checklist */}
      {enabledFeatures.checklist && checklistItems.length > 0 && (
        <ChecklistRenderer
          items={checklistItems}
          onChange={onChecklistItemChange}
          disabled={disabled}
        />
      )}

      {/* Yes/No Checklist */}
      {enabledFeatures.yesNoChecklist && yesNoItems.length > 0 && (
        <YesNoChecklistRenderer
          items={yesNoItems}
          onChange={onYesNoItemChange}
          actionResponses={actionResponses}
          onActionResponse={onActionResponse}
          managers={availableManagers}
          managerSelections={yesNoManagerSelections}
          onManagerSelect={onYesNoManagerSelect}
          disabled={disabled}
        />
      )}

      {/* Temperature - With inline action handling */}
      {enabledFeatures.temperature && hasTemperatureData && (
        <TemperatureRenderer
          assets={assets}
          assetTempRanges={assetTempRanges}
          temperatures={temperatures}
          onTemperatureChange={onTemperatureChange}
          placedActions={placedActions}
          onPlaceAction={onPlaceAction}
          onRemoveAction={onRemoveAction}
        />
      )}

      {/* Photo Evidence */}
      {enabledFeatures.photoEvidence && (
        <PhotoEvidenceRenderer
          photos={photos}
          onAdd={onPhotoAdd}
          onRemove={onPhotoRemove}
          disabled={disabled}
        />
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-theme-primary mb-2">
          Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          disabled={disabled}
          rows={3}
          className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary placeholder-theme-tertiary focus:outline-none focus:border-module-fg transition-colors text-sm disabled:opacity-50 resize-none"
          placeholder="Add any notes..."
        />
      </div>
    </div>
  );
}
