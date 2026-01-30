'use client';

import type { ChecklistTask, EnabledFeatures, TaskDataBase } from '@/types/task-completion.types';
import { ChecklistRenderer } from './features/ChecklistRenderer';
import { YesNoChecklistRenderer } from './features/YesNoChecklistRenderer';
import { TemperatureRenderer } from './features/TemperatureRenderer';
import { PhotoEvidenceRenderer } from './features/PhotoEvidenceRenderer';

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
  yesNoItems: Array<{ text: string; answer: 'yes' | 'no' | null }>;
  onYesNoItemChange: (index: number, answer: 'yes' | 'no' | null) => void;

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

  // State
  disabled?: boolean;
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
  photos,
  onPhotoAdd,
  onPhotoRemove,
  placedActions,
  onPlaceAction,
  onRemoveAction,
  notes,
  onNotesChange,
  disabled = false
}: TemplateRendererProps) {

  // Check if we have temperature data to render - just check assets Map
  const hasTemperatureData = assets.size > 0;

  return (
    <div className="space-y-6">
      {/* Task Instructions */}
      {(task.custom_instructions || template?.instructions) && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-400 mb-2">Instructions</h4>
          <p className="text-sm text-neutral-300 whitespace-pre-wrap">
            {task.custom_instructions || template?.instructions}
          </p>
        </div>
      )}

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
        <label className="block text-sm font-medium text-white mb-2">
          Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          disabled={disabled}
          rows={3}
          className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors text-sm disabled:opacity-50 resize-none"
          placeholder="Add any notes..."
        />
      </div>
    </div>
  );
}
