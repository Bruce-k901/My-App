// ============================================================================
// useTaskSubmission Hook
// Handles task completion, temperature logging, and follow-up creation
// ============================================================================

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ChecklistTask, TaskCompletionPayload, OutOfRangeAsset } from '@/types/task-completion.types';
import { useToast } from '@/components/ui/ToastProvider';
import { useAppContext } from '@/context/AppContext';

interface UseTaskSubmissionResult {
  submitTask: (payload: TaskCompletionPayload) => Promise<boolean>;
  submitting: boolean;
  error: string | null;
}

export function useTaskSubmission(
  task: ChecklistTask,
  onComplete: () => void
): UseTaskSubmissionResult {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  const { profile, companyId, siteId } = useAppContext();

  async function submitTask(payload: TaskCompletionPayload): Promise<boolean> {
    setSubmitting(true);
    setError(null);

    try {
      console.log('🚀 Starting task submission:', payload.taskId);

      // Validate required context
      if (!companyId || !profile?.id) {
        throw new Error('Missing required context (company or profile)');
      }

      // Use task's site_id if context siteId is invalid
      const effectiveSiteId = isValidUuid(siteId) ? siteId : task.site_id;

      if (!isValidUuid(effectiveSiteId)) {
        console.warn(`⚠️ Invalid siteId "${siteId}" and task.site_id "${task.site_id}" - skipping temperature log creation`);
      }

      // 1. Upload photos (if any)
      const photoUrls: string[] = [];
      if (payload.photos && payload.photos.length > 0) {
        for (const photo of payload.photos) {
          try {
            const fileExt = photo.name.split('.').pop() || 'jpg';
            const fileName = `${companyId}/${effectiveSiteId}/${payload.taskId}_${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
              .from('task-evidence')
              .upload(fileName, photo);

            if (uploadError) {
              console.error('Photo upload error:', uploadError);
              continue;
            }

            const { data: urlData } = supabase.storage
              .from('task-evidence')
              .getPublicUrl(fileName);

            if (urlData?.publicUrl) {
              photoUrls.push(urlData.publicUrl);
            }
          } catch (photoErr) {
            console.error('Photo upload failed:', photoErr);
          }
        }
      }

      // 2. Insert temperature records (if any and siteId is valid)
      console.log('🌡️ [TEMP] Checking temperature records:', {
        hasRecords: !!payload.temperatureRecords,
        recordCount: payload.temperatureRecords?.length || 0,
        effectiveSiteId,
        isValidSite: isValidUuid(effectiveSiteId)
      });

      if (payload.temperatureRecords && payload.temperatureRecords.length > 0 && isValidUuid(effectiveSiteId)) {
        // First, lookup position_ids for all assets
        const assetIds = payload.temperatureRecords.map(r => r.asset_id);
        const { data: positions, error: positionError } = await supabase
          .from('site_equipment_positions')
          .select('id, current_asset_id, nickname')
          .eq('site_id', effectiveSiteId)
          .in('current_asset_id', assetIds);

        if (positionError) {
          console.warn('⚠️ [TEMP] Position lookup failed (non-blocking):', positionError);
        }

        const positionMap = new Map(
          positions?.map(p => [p.current_asset_id, { id: p.id, nickname: p.nickname }]) || []
        );

        console.log('🌡️ [TEMP] Position map:', Object.fromEntries(positionMap));

        const recordsToInsert = payload.temperatureRecords.map(record => {
          const position = positionMap.get(record.asset_id);
          return {
            company_id: companyId,
            site_id: effectiveSiteId,
            asset_id: record.asset_id,
            position_id: position?.id || null,
            recorded_by: profile.id,
            reading: record.temperature,
            unit: '°C',
            recorded_at: record.recorded_at,
            status: record.status === 'critical' ? 'out_of_range' : 'normal',
            notes: `Recorded via task: ${task.template?.name || task.custom_name || 'Task'}`
          };
        });

        console.log('🌡️ [TEMP] Inserting records:', recordsToInsert);

        const { error: tempError } = await supabase
          .from('temperature_logs')
          .insert(recordsToInsert);

        if (tempError) {
          // Log but don't fail - temperature data is also in completion_notes
          console.error('❌ Temperature insert error (non-blocking):', tempError);
        } else {
          console.log(`✅ Saved ${recordsToInsert.length} temperature records`);
        }
      } else {
        console.warn('⚠️ [TEMP] Skipping temperature insert:', {
          reason: !payload.temperatureRecords ? 'no records' :
                  payload.temperatureRecords.length === 0 ? 'empty records' :
                  'invalid site_id'
        });
      }

      // 3. Handle out-of-range assets (create monitoring tasks or callouts)
      if (payload.outOfRangeAssets && payload.outOfRangeAssets.length > 0) {
        for (const outOfRangeAsset of payload.outOfRangeAssets) {
          try {
            if (outOfRangeAsset.action === 'monitor') {
              await createMonitoringTask(outOfRangeAsset, effectiveSiteId);
            } else if (outOfRangeAsset.action === 'callout') {
              await createCallout(outOfRangeAsset, effectiveSiteId);
            }
          } catch (actionErr) {
            console.error('Failed to create follow-up action:', actionErr);
          }
        }
      }

      // 4. Build completion data
      const completionData = {
        ...payload.formData,
        equipment_list: payload.equipmentList || [],
        photo_evidence: photoUrls,
        completed_at: payload.completedAt,
        completed_by_id: profile.id,
        completed_by_name: profile.full_name || profile.email || 'Unknown'
      };

      // 5. Mark task as completed
      const { error: updateError } = await supabase
        .from('checklist_tasks')
        .update({
          status: 'completed',
          completed_at: payload.completedAt,
          completed_by: profile.id,
          completion_notes: JSON.stringify(completionData)
        })
        .eq('id', payload.taskId);

      if (updateError) {
        throw new Error(`Failed to complete task: ${updateError.message}`);
      }

      console.log('✅ Task completed successfully:', payload.taskId);

      showToast({
        title: 'Task completed',
        description: 'Your task has been saved successfully.',
        type: 'success'
      });

      // Dispatch event for any listeners
      window.dispatchEvent(new CustomEvent('task-completed', {
        detail: { taskId: payload.taskId, completedAt: payload.completedAt }
      }));

      onComplete();
      return true;

    } catch (err: any) {
      console.error('❌ Task submission error:', err);
      setError(err.message || 'Failed to complete task');

      showToast({
        title: 'Error',
        description: err.message || 'Failed to complete task',
        type: 'error'
      });

      return false;
    } finally {
      setSubmitting(false);
    }
  }

  function isValidUuid(value: string | null | undefined): value is string {
    if (!value) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  async function createMonitoringTask(
    outOfRangeAsset: OutOfRangeAsset,
    effectiveSiteId: string
  ) {
    const monitoringDuration = outOfRangeAsset.monitoringDuration || 60;

    const dueTime = new Date();
    dueTime.setMinutes(dueTime.getMinutes() + monitoringDuration);

    const { error } = await supabase.from('checklist_tasks').insert({
      template_id: task.template_id,
      company_id: companyId,
      site_id: effectiveSiteId,
      custom_name: `Re-check: ${outOfRangeAsset.assetName}`,
      due_date: dueTime.toISOString().split('T')[0],
      due_time: dueTime.toTimeString().split(' ')[0].substring(0, 5),
      status: 'pending',
      priority: 'urgent',
      flagged: true,
      flag_reason: 'monitoring',
      task_data: {
        source_type: 'monitoring',
        selectedAssets: [outOfRangeAsset.assetId],
        equipment_config: [{
          assetId: outOfRangeAsset.assetId,
          asset_name: outOfRangeAsset.assetName,
          temp_min: outOfRangeAsset.min,
          temp_max: outOfRangeAsset.max
        }],
        parent_task_id: task.id,
        monitoring_duration: monitoringDuration,
        original_temperature: outOfRangeAsset.temperature
      }
    });

    if (error) {
      console.error('Failed to create monitoring task:', error);
      throw error;
    }

    console.log(`✅ Created monitoring task for ${outOfRangeAsset.assetName}`);
  }

  async function createCallout(
    outOfRangeAsset: OutOfRangeAsset,
    effectiveSiteId: string
  ) {
    const { error } = await supabase.from('callouts').insert({
      company_id: companyId,
      site_id: effectiveSiteId,
      asset_id: outOfRangeAsset.assetId,
      callout_type: 'reactive',
      fault_description: `Temperature out of range: ${outOfRangeAsset.temperature}°C (Range: ${outOfRangeAsset.min ?? 'N/A'}°C to ${outOfRangeAsset.max ?? 'N/A'}°C)`,
      notes: outOfRangeAsset.calloutNotes || '',
      status: 'open',
      priority: 'urgent',
      reported_by: profile?.id,
      reported_at: new Date().toISOString()
    });

    if (error) {
      console.error('Failed to create callout:', error);
      throw error;
    }

    console.log(`✅ Created callout for ${outOfRangeAsset.assetName}`);
  }

  return {
    submitTask,
    submitting,
    error
  };
}
