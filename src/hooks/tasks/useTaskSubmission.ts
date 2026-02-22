// ============================================================================
// useTaskSubmission Hook
// Handles task completion, temperature logging, and follow-up creation
// ============================================================================

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { ChecklistTask, TaskCompletionPayload, OutOfRangeAsset, YesNoChecklistItemEnhanced, YesNoOption } from '@/types/task-completion.types';
import { isEnhancedYesNoItem } from '@/types/task-completion.types';
import { useToast } from '@/components/ui/ToastProvider';
import { useAppContext } from '@/context/AppContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { queueWrite } from '@/lib/offline/db';
import { compressImage } from '@/lib/image-compression';

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
  const { isOnline } = useOnlineStatus();

  // Ref-based guard to prevent duplicate submissions (synchronous check)
  const isSubmittingRef = useRef(false);

  async function submitTask(payload: TaskCompletionPayload): Promise<boolean> {
    // Synchronous guard: prevent multiple concurrent submissions
    if (isSubmittingRef.current) {
      console.warn('⚠️ Task submission already in progress, ignoring duplicate call');
      return false;
    }
    isSubmittingRef.current = true;

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

      // Offline fallback: queue task completion for sync when back online
      if (!isOnline) {
        console.log('📴 Offline — queuing task completion for sync:', payload.taskId);

        const completionRecord = {
          task_id: payload.taskId,
          company_id: companyId,
          site_id: effectiveSiteId || null,
          completed_by: profile.id,
          completed_at: payload.completedAt,
          completion_data: {
            ...payload.formData,
            equipment_list: payload.equipmentList || [],
            temperature_records: payload.temperatureRecords || [],
            out_of_range_assets: payload.outOfRangeAssets || [],
          },
        };

        await queueWrite(
          'complete_task',
          '/api/tasks/complete',
          completionRecord,
          'checkly'
        );

        showToast({
          title: 'Saved offline',
          description: 'Task will sync automatically when you reconnect.',
          type: 'info',
        });

        window.dispatchEvent(
          new CustomEvent('task-completed', {
            detail: { taskId: payload.taskId, completedAt: payload.completedAt, offline: true },
          })
        );

        onComplete();
        return true;
      }

      // 1. Upload photos (if any)
      const photoUrls: string[] = [];
      if (payload.photos && payload.photos.length > 0) {
        for (const photo of payload.photos) {
          try {
            const compressed = await compressImage(photo).catch(() => photo);
            const fileExt = compressed.name.split('.').pop() || 'jpg';
            const fileName = `${companyId}/${effectiveSiteId}/${payload.taskId}_${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
              .from('task-evidence')
              .upload(fileName, compressed);

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
        console.debug('[TEMP] No temperature records to insert (expected for non-temperature tasks)');
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

      // 3.5 Handle yes/no checklist follow-up actions
      const yesNoItems = payload.formData.yes_no_items || [];
      let hasExceptions = false;

      for (const item of yesNoItems) {
        if (!isEnhancedYesNoItem(item) || !item.answer) continue;
        const selectedOption = item.options.find((o: YesNoOption) => o.value === item.answer);
        if (!selectedOption?.actions) continue;

        if (selectedOption.actions.logException) {
          hasExceptions = true;
        }

        if (selectedOption.actions.requestAction) {
          try {
            await supabase.from('notifications').insert({
              company_id: companyId,
              site_id: effectiveSiteId,
              type: 'task',
              title: `Action requested: ${item.text.substring(0, 60)}`,
              message: selectedOption.actions.message ||
                `"${item.text}" was answered "${selectedOption.label}" — action requested.`,
              severity: 'warning',
              priority: 'high',
              status: 'active',
              recipient_role: 'manager',
              task_id: task.id,
              created_by: profile?.id,
              metadata: {
                source: 'yes_no_checklist',
                question: item.text,
                answer: selectedOption.label,
                action_response: item.actionResponse || null,
              }
            });
            console.log(`✅ Created notification for: ${item.text}`);
          } catch (notifErr) {
            console.error('Failed to create yes/no notification:', notifErr);
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

      // 5. Mark task as completed (flag if exceptions were logged)
      const { error: updateError } = await supabase
        .from('checklist_tasks')
        .update({
          status: 'completed',
          completed_at: payload.completedAt,
          completed_by: profile.id,
          completion_notes: JSON.stringify(completionData),
          ...(hasExceptions ? { flagged: true, flag_reason: 'yes_no_exception' } : {}),
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

      // Fire-and-forget: trigger notification emails if template has notification_config
      fetch('/api/notifications/task-completed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: payload.taskId,
          completedBy: profile.id,
          completedAt: payload.completedAt,
          companyId,
          siteId: effectiveSiteId,
        }),
      }).catch((notifErr) => {
        console.error('Non-blocking: notification trigger failed:', notifErr);
      });

      onComplete();
      return true;

    } catch (err: any) {
      console.error('❌ Task submission error:', err);

      // Detect network errors (offline or connection dropped) and queue for later
      const isNetworkError =
        err.message?.includes('Load failed') ||
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError') ||
        err.name === 'TypeError';

      if (isNetworkError) {
        console.log('📴 Network error detected — queuing task for offline sync');

        try {
          const completionRecord = {
            task_id: payload.taskId,
            company_id: companyId,
            site_id: (isValidUuid(siteId) ? siteId : task.site_id) || null,
            completed_by: profile?.id,
            completed_at: payload.completedAt,
            completion_data: {
              ...payload.formData,
              equipment_list: payload.equipmentList || [],
              temperature_records: payload.temperatureRecords || [],
              out_of_range_assets: payload.outOfRangeAssets || [],
            },
          };

          await queueWrite(
            'complete_task',
            '/api/tasks/complete',
            completionRecord,
            'checkly'
          );

          showToast({
            title: 'Saved offline',
            description: 'Task will sync automatically when you reconnect.',
            type: 'info',
          });

          window.dispatchEvent(
            new CustomEvent('task-completed', {
              detail: { taskId: payload.taskId, completedAt: payload.completedAt, offline: true },
            })
          );

          onComplete();
          return true;
        } catch (queueErr) {
          console.error('❌ Failed to queue task offline:', queueErr);
        }
      }

      setError(err.message || 'Failed to complete task');

      showToast({
        title: 'Error',
        description: err.message || 'Failed to complete task',
        type: 'error'
      });

      return false;
    } finally {
      isSubmittingRef.current = false;
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
