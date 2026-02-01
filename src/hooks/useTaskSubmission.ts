// ============================================================================
// useTaskSubmission Hook
// Handles task completion, temperature logging, and callout creation
// ============================================================================

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ChecklistTaskWithTemplate } from '@/types/checklist-types'
import type { TaskCompletionPayload, OutOfRangeAsset } from '@/types/task-completion-types'
import { useToast } from '@/components/ui/ToastProvider'
import { useAppContext } from '@/context/AppContext'

interface UseTaskSubmissionResult {
  submitTask: (payload: TaskCompletionPayload) => Promise<boolean>
  submitting: boolean
  error: string | null
}

export function useTaskSubmission(
  task: ChecklistTaskWithTemplate,
  onComplete: () => void
): UseTaskSubmissionResult {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useToast()
  const { profile, companyId, siteId } = useAppContext()

  async function submitTask(payload: TaskCompletionPayload): Promise<boolean> {
    setSubmitting(true)
    setError(null)

    try {
      console.log('🚀 Starting task submission:', payload.taskId)

      // Validate required fields
      if (!companyId || !siteId || !profile?.id) {
        throw new Error('Missing required context (company, site, or profile)')
      }

      // Validate siteId is a valid UUID (not "all")
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(siteId)) {
        console.warn(`⚠️ Invalid siteId "${siteId}" - skipping temperature log creation`)
      }

      // 1. Upload photos (if any)
      const photoUrls: string[] = []
      if (payload.photos && payload.photos.length > 0) {
        for (const photo of payload.photos) {
          try {
            const fileExt = photo.name.split('.').pop() || 'jpg'
            const fileName = `${companyId}/${siteId}/${payload.taskId}_${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
              .from('task-evidence')
              .upload(fileName, photo)

            if (uploadError) {
              console.error('Photo upload error:', uploadError)
              continue
            }

            const { data: urlData } = supabase.storage
              .from('task-evidence')
              .getPublicUrl(fileName)

            if (urlData?.publicUrl) {
              photoUrls.push(urlData.publicUrl)
            }
          } catch (photoErr) {
            console.error('Photo upload failed:', photoErr)
          }
        }
      }

      // 2. Insert temperature records (if any and siteId is valid)
      if (payload.temperatureRecords && payload.temperatureRecords.length > 0 && uuidRegex.test(siteId)) {
        const recordsToInsert = payload.temperatureRecords.map(record => ({
          company_id: companyId,
          site_id: siteId,
          asset_id: record.asset_id,
          recorded_by: profile.id,
          reading: record.temperature,
          unit: '°C',
          recorded_at: record.recorded_at,
          status: record.status,
          notes: `Recorded via task: ${task.template?.name || task.custom_name || 'Task'}`
        }))

        const { error: tempError } = await supabase
          .from('temperature_logs')
          .insert(recordsToInsert)

        if (tempError) {
          // Log but don't fail - temperature data is also in completion_data
          console.error('❌ Temperature insert error (non-blocking):', tempError)
        } else {
          console.log(`✅ Saved ${recordsToInsert.length} temperature records`)
        }
      }

      // 3. Handle out-of-range assets (create monitoring tasks or callouts)
      if (payload.outOfRangeAssets && payload.outOfRangeAssets.length > 0) {
        for (const outOfRangeAsset of payload.outOfRangeAssets) {
          try {
            if (outOfRangeAsset.action === 'monitor') {
              await createMonitoringTask(outOfRangeAsset, task, companyId, siteId, profile.id)
            } else if (outOfRangeAsset.action === 'callout') {
              await createCallout(outOfRangeAsset, task, companyId, siteId, profile.id)
            }
          } catch (actionErr) {
            console.error('Failed to create follow-up action:', actionErr)
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
      }

      // 5. Mark task as completed
      const { error: updateError } = await supabase
        .from('checklist_tasks')
        .update({
          status: 'completed',
          completed_at: payload.completedAt,
          completed_by: profile.id,
          completion_data: completionData
        })
        .eq('id', payload.taskId)

      if (updateError) {
        throw new Error(`Failed to complete task: ${updateError.message}`)
      }

      console.log('✅ Task completed successfully:', payload.taskId)

      showToast({
        title: 'Task completed',
        description: 'Your task has been saved successfully.',
        type: 'success'
      })

      // Dispatch event for any listeners
      window.dispatchEvent(new CustomEvent('task-completed', {
        detail: { taskId: payload.taskId, completedAt: payload.completedAt }
      }))

      onComplete()
      return true

    } catch (err: any) {
      console.error('❌ Task submission error:', err)
      setError(err.message || 'Failed to complete task')

      showToast({
        title: 'Error',
        description: err.message || 'Failed to complete task',
        type: 'error'
      })

      return false
    } finally {
      setSubmitting(false)
    }
  }

  async function createMonitoringTask(
    outOfRangeAsset: OutOfRangeAsset,
    originalTask: ChecklistTaskWithTemplate,
    companyId: string,
    siteId: string,
    profileId: string
  ) {
    const monitoringDuration = outOfRangeAsset.monitoringDuration || 60 // Default 60 mins

    const dueTime = new Date()
    dueTime.setMinutes(dueTime.getMinutes() + monitoringDuration)

    const { error } = await supabase.from('checklist_tasks').insert({
      template_id: originalTask.template_id,
      company_id: companyId,
      site_id: siteId,
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
        parent_task_id: originalTask.id,
        monitoring_duration: monitoringDuration,
        original_temperature: outOfRangeAsset.temperature
      }
    })

    if (error) {
      console.error('Failed to create monitoring task:', error)
      throw error
    }

    console.log(`✅ Created monitoring task for ${outOfRangeAsset.assetName}`)
  }

  async function createCallout(
    outOfRangeAsset: OutOfRangeAsset,
    originalTask: ChecklistTaskWithTemplate,
    companyId: string,
    siteId: string,
    profileId: string
  ) {
    const { error } = await supabase.from('callouts').insert({
      company_id: companyId,
      site_id: siteId,
      asset_id: outOfRangeAsset.assetId,
      callout_type: 'reactive',
      fault_description: `Temperature out of range: ${outOfRangeAsset.temperature}°C (Range: ${outOfRangeAsset.min ?? 'N/A'}°C to ${outOfRangeAsset.max ?? 'N/A'}°C)`,
      notes: outOfRangeAsset.calloutNotes || '',
      status: 'open',
      priority: 'urgent',
      reported_by: profileId,
      reported_at: new Date().toISOString()
    })

    if (error) {
      console.error('Failed to create callout:', error)
      throw error
    }

    console.log(`✅ Created callout for ${outOfRangeAsset.assetName}`)
  }

  return {
    submitTask,
    submitting,
    error
  }
}
