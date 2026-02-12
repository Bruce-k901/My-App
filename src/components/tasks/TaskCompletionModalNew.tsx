'use client';

import { useCallback, useMemo, useState } from 'react';
import { X, Loader2 } from '@/components/ui/icons';
import { useAppContext } from '@/context/AppContext';
import { useTaskState } from '@/hooks/tasks/useTaskState';
import { useTaskSubmission } from '@/hooks/tasks/useTaskSubmission';
import { TemplateRenderer } from './renderers/TemplateRenderer';
// Actions are now integrated directly into AssetTemperatureInput
import type { ChecklistTask, TaskCompletionPayload, OutOfRangeAsset } from '@/types/task-completion.types';

interface TaskCompletionModalNewProps {
  task: ChecklistTask;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onMonitoringTaskCreated?: () => void;
}

export function TaskCompletionModalNew({
  task,
  isOpen,
  onClose,
  onComplete,
  onMonitoringTaskCreated
}: TaskCompletionModalNewProps) {
  const { companyId, siteId, profile } = useAppContext();

  // State management hook
  const {
    taskData,
    template,
    assets,
    assetTempRanges,
    enabledFeatures,
    temperatures,
    setTemperature,
    checklistItems,
    setChecklistItemCompleted,
    yesNoItems,
    setYesNoAnswer,
    photos,
    addPhoto,
    removePhoto,
    notes,
    setNotes,
    outOfRangeActions,
    setOutOfRangeAction,
    loading,
    error
  } = useTaskState(task, isOpen, companyId, siteId);

  // Submission hook
  const { submitTask, submitting, error: submitError } = useTaskSubmission(task, () => {
    onComplete();
    if (onMonitoringTaskCreated) {
      onMonitoringTaskCreated();
    }
  });

  // Local state for out-of-range actions (allows remove)
  const [localOutOfRangeActions, setLocalOutOfRangeActions] = useState<Map<string, { action: 'monitor' | 'callout'; duration?: number; notes?: string }>>(new Map());

  // Get asset IDs from the assets Map (single source of truth)
  const assetIds = useMemo(() => Array.from(assets.keys()), [assets]);

  // Calculate out-of-range assets
  const outOfRangeAssets = useMemo(() => {
    const outOfRange: Array<{
      assetId: string;
      assetName: string;
      temperature: number;
      min: number | null;
      max: number | null;
    }> = [];

    assetIds.forEach((assetId) => {
      const temp = temperatures[assetId];
      if (temp === null || temp === undefined) return;

      const range = assetTempRanges.get(assetId);
      if (!range || (range.min === null && range.max === null)) return;

      // Ranges are already corrected in useTaskState, so simple check
      const isOutOfRange =
        (range.min !== null && temp < range.min) ||
        (range.max !== null && temp > range.max);

      if (isOutOfRange) {
        const asset = assets.get(assetId);
        outOfRange.push({
          assetId,
          assetName: asset?.nickname || asset?.name || 'Unknown Asset',
          temperature: temp,
          min: range.min,
          max: range.max
        });
      }
    });

    return outOfRange;
  }, [assetIds, temperatures, assetTempRanges, assets]);

  // Check if form is valid (temperatures recorded, but out-of-range actions checked at submit)
  const isFormValid = useMemo(() => {
    // If temperature is enabled, all assets must have temperatures
    if (enabledFeatures.temperature && assetIds.length > 0) {
      const allTempsRecorded = assetIds.every(
        (assetId: string) => temperatures[assetId] !== null && temperatures[assetId] !== undefined
      );

      if (!allTempsRecorded) return false;
    }

    // If checklist is enabled and has items, at least one must be completed
    if (enabledFeatures.checklist && checklistItems.length > 0) {
      // For now, we don't require all items to be completed
    }

    return true;
  }, [enabledFeatures, assetIds, temperatures, checklistItems]);

  // Build and submit payload (defined first so other handlers can reference it)
  const handleSubmit = useCallback(async () => {
    console.log('🚀 [SUBMIT] handleSubmit called');
    console.log('🚀 [SUBMIT] Context:', { profileId: profile?.id, companyId, siteId: task.site_id });
    console.log('🚀 [SUBMIT] assetIds:', assetIds);
    console.log('🚀 [SUBMIT] temperatures:', temperatures);

    if (!profile?.id || !companyId) {
      console.error('❌ [SUBMIT] Missing profile or companyId');
      return;
    }

    // Build temperature records
    const temperatureRecords = assetIds
      .filter((assetId: string) => temperatures[assetId] !== null && temperatures[assetId] !== undefined)
      .map((assetId: string) => {
        const temp = temperatures[assetId]!;
        const range = assetTempRanges.get(assetId) || { min: null, max: null };

        // Ranges are already corrected, so simple check
        let status: 'ok' | 'warning' | 'critical' = 'ok';
        if ((range.min !== null && temp < range.min) || (range.max !== null && temp > range.max)) {
          status = 'critical';
        }

        return {
          asset_id: assetId,
          temperature: temp,
          status,
          recorded_at: new Date().toISOString(),
          task_id: task.id,
          company_id: companyId,
          site_id: task.site_id
        };
      });

    console.log('🌡️ [SUBMIT] Built temperatureRecords:', temperatureRecords);

    // Build out-of-range asset details from local state
    const outOfRangeDetails: OutOfRangeAsset[] = [];
    localOutOfRangeActions.forEach((action, assetId) => {
      const asset = assets.get(assetId);
      const range = assetTempRanges.get(assetId) || { min: null, max: null };

      outOfRangeDetails.push({
        assetId,
        assetName: asset?.nickname || asset?.name || 'Unknown Asset',
        temperature: temperatures[assetId]!,
        min: range.min,
        max: range.max,
        action: action.action,
        monitoringDuration: action.duration,
        calloutNotes: action.notes
      });
    });

    // Build equipment list from assets Map (include temp ranges for display)
    const equipmentList = assetIds.map((assetId: string) => {
      const asset = assets.get(assetId);
      const range = assetTempRanges.get(assetId);

      return {
        assetId,
        assetName: asset?.name || 'Unknown',
        temperature: temperatures[assetId] ?? undefined,
        nickname: asset?.nickname,
        temp_min: range?.min ?? null,
        temp_max: range?.max ?? null
      };
    });

    // Build form data
    const formData: Record<string, any> = {
      notes,
      checklist_items: checklistItems,
      yes_no_items: yesNoItems,
      temperatures: assetIds.map((assetId) => {
        const asset = assets.get(assetId);
        return {
          assetId,
          temp: temperatures[assetId],
          nickname: asset?.nickname
        };
      })
    };

    const payload: TaskCompletionPayload = {
      taskId: task.id,
      status: 'completed',
      completedAt: new Date().toISOString(),
      completedBy: profile.id,
      formData,
      photos,
      temperatureRecords,
      outOfRangeAssets: outOfRangeDetails,
      equipmentList
    };

    await submitTask(payload);
  }, [
    task, profile, companyId, assetIds, temperatures, assetTempRanges,
    assets, localOutOfRangeActions, checklistItems, yesNoItems, notes, photos, submitTask
  ]);

  // Handle placing an out-of-range action
  const handlePlaceAction = useCallback((assetId: string, action: 'monitor' | 'callout', options?: { duration?: number; notes?: string }) => {
    setLocalOutOfRangeActions(prev => {
      const newActions = new Map(prev);
      newActions.set(assetId, { action, ...options });
      return newActions;
    });
    // Also update the hook state
    setOutOfRangeAction(assetId, action, options);
  }, [setOutOfRangeAction]);

  // Handle removing an out-of-range action
  const handleRemoveAction = useCallback((assetId: string) => {
    setLocalOutOfRangeActions(prev => {
      const newActions = new Map(prev);
      newActions.delete(assetId);
      return newActions;
    });
  }, []);

  // Handle submit button click
  const handleSubmitClick = useCallback(async () => {
    console.log('🎯 [SUBMIT] Complete Task clicked');
    console.log('🎯 [SUBMIT] outOfRangeAssets:', outOfRangeAssets);
    console.log('🎯 [SUBMIT] localOutOfRangeActions:', Array.from(localOutOfRangeActions.entries()));

    // Validate all temps entered (only when temperature feature is enabled)
    if (enabledFeatures.temperature && assetIds.length > 0) {
      const allTempsEntered = assetIds.every(
        (assetId) => temperatures[assetId] !== null && temperatures[assetId] !== undefined
      );

      if (!allTempsEntered) {
        alert('Please enter all temperature readings before completing the task.');
        return;
      }
    }

    // Check if all out-of-range assets have actions placed (only when temperature feature is enabled)
    if (enabledFeatures.temperature && outOfRangeAssets.length > 0) {
      const allActionsPlaced = outOfRangeAssets.every(
        (asset) => localOutOfRangeActions.has(asset.assetId)
      );

      if (!allActionsPlaced) {
        alert('Please select an action (Monitor or Callout) for all out-of-range temperatures.');
        return;
      }
    }

    // Submit (awaited to ensure submitting state is set before returning)
    await handleSubmit();
  }, [enabledFeatures, assetIds, temperatures, outOfRangeAssets, localOutOfRangeActions, handleSubmit]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-theme-surface rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-theme">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-theme">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-theme-primary truncate">
              {task.custom_name || template?.name || 'Complete Task'}
            </h2>
            {template?.slug && (
              <p className="text-sm text-theme-tertiary mt-1 truncate">{template.slug}</p>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-2 hover:bg-theme-hover rounded-lg transition-colors disabled:opacity-50 ml-4"
          >
            <X className="w-5 h-5 text-theme-tertiary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-12rem)]">
          {(error || submitError) && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error || submitError}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-module-fg border-t-transparent rounded-full animate-spin" />
                <div className="text-theme-tertiary text-sm">Loading task data...</div>
              </div>
            </div>
          ) : (
            <TemplateRenderer
              task={task}
              taskData={taskData}
              template={template}
              assets={assets}
              assetTempRanges={assetTempRanges}
              enabledFeatures={enabledFeatures}
              temperatures={temperatures}
              onTemperatureChange={setTemperature}
              checklistItems={checklistItems}
              onChecklistItemChange={setChecklistItemCompleted}
              yesNoItems={yesNoItems}
              onYesNoItemChange={setYesNoAnswer}
              photos={photos}
              onPhotoAdd={addPhoto}
              onPhotoRemove={removePhoto}
              placedActions={localOutOfRangeActions}
              onPlaceAction={handlePlaceAction}
              onRemoveAction={handleRemoveAction}
              notes={notes}
              onNotesChange={setNotes}
              disabled={submitting}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-theme">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-theme-tertiary hover:text-theme-primary hover:bg-theme-hover rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmitClick}
            disabled={submitting || loading || !isFormValid}
            className="px-4 py-2 text-sm font-medium text-white bg-module-fg hover:bg-module-fg/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Complete Task'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TaskCompletionModalNew;
