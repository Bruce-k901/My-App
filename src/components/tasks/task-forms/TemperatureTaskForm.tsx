'use client'

import { useState, useEffect, useMemo } from 'react'
import { Camera, X } from 'lucide-react'
import type { ChecklistTaskWithTemplate } from '@/types/checklist-types'
import type { TemperatureTaskData, TaskCompletionPayload, OutOfRangeAsset, Asset } from '@/types/task-completion-types'
import { AssetTemperatureInput } from '../components/AssetTemperatureInput'
import { OutOfRangeWarning } from '../components/OutOfRangeWarning'
import { useTemperatureValidation } from '@/hooks/useTemperatureValidation'
import { useAppContext } from '@/context/AppContext'

interface TemperatureTaskFormProps {
  task: ChecklistTaskWithTemplate
  taskData: TemperatureTaskData
  assets: Map<string, Asset>
  assetTempRanges: Map<string, { min: number | null; max: number | null }>
  onSubmit: (payload: TaskCompletionPayload) => Promise<boolean>
  onCancel: () => void
  submitting: boolean
}

export function TemperatureTaskForm({
  task,
  taskData,
  assets,
  assetTempRanges,
  onSubmit,
  onCancel,
  submitting
}: TemperatureTaskFormProps) {
  const { profile } = useAppContext()
  const [temperatures, setTemperatures] = useState<Record<string, number | null>>({})
  const [photos, setPhotos] = useState<File[]>([])
  const [notes, setNotes] = useState('')
  const [outOfRangeActions, setOutOfRangeActions] = useState<Map<string, OutOfRangeAsset>>(new Map())

  // Get the list of asset IDs to show inputs for
  const assetIds = useMemo(() => {
    // Priority 1: equipment_config from task_data
    if (taskData.equipment_config && Array.isArray(taskData.equipment_config)) {
      return taskData.equipment_config.map(item => item.assetId).filter(Boolean)
    }
    // Priority 2: selectedAssets from task_data
    if (taskData.selectedAssets && Array.isArray(taskData.selectedAssets)) {
      return taskData.selectedAssets
    }
    // Priority 3: keys from assets map
    return Array.from(assets.keys())
  }, [taskData.equipment_config, taskData.selectedAssets, assets])

  // Get nickname for an asset
  const getNickname = (assetId: string): string | undefined => {
    if (taskData.equipment_config) {
      const config = taskData.equipment_config.find(c => c.assetId === assetId)
      return config?.nickname || undefined
    }
    return undefined
  }

  const { outOfRangeAssets } = useTemperatureValidation(temperatures, assets, assetTempRanges)

  // Merge actions with out-of-range assets for display
  const outOfRangeWithActions = useMemo(() => {
    return outOfRangeAssets.map(asset => ({
      ...asset,
      ...outOfRangeActions.get(asset.assetId)
    }))
  }, [outOfRangeAssets, outOfRangeActions])

  // Initialize temperatures
  useEffect(() => {
    const initialTemps: Record<string, number | null> = {}
    assetIds.forEach(assetId => {
      initialTemps[assetId] = null
    })
    setTemperatures(initialTemps)
  }, [assetIds])

  const handleTemperatureChange = (assetId: string, temp: number | null) => {
    setTemperatures(prev => ({
      ...prev,
      [assetId]: temp
    }))

    // Clear action if temperature changes and it's no longer out of range
    if (outOfRangeActions.has(assetId)) {
      const range = assetTempRanges.get(assetId)
      if (range && temp !== null) {
        const isInverted = range.min !== null && range.max !== null && range.min > range.max
        let stillOutOfRange = false

        if (isInverted) {
          stillOutOfRange = temp < range.max! || temp > range.min!
        } else {
          stillOutOfRange =
            (range.min !== null && temp < range.min) ||
            (range.max !== null && temp > range.max)
        }

        if (!stillOutOfRange) {
          setOutOfRangeActions(prev => {
            const newMap = new Map(prev)
            newMap.delete(assetId)
            return newMap
          })
        }
      }
    }
  }

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos(prev => [...prev, ...Array.from(e.target.files!)])
    }
  }

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const handleActionSelect = (assetId: string, action: 'monitor' | 'callout', options?: any) => {
    const asset = outOfRangeAssets.find(a => a.assetId === assetId)
    if (!asset) return

    setOutOfRangeActions(prev => {
      const newMap = new Map(prev)
      newMap.set(assetId, {
        ...asset,
        action,
        monitoringDuration: action === 'monitor' ? options?.duration || 60 : undefined,
        calloutNotes: action === 'callout' ? options?.notes || '' : undefined
      })
      return newMap
    })
  }

  const handleSubmit = async () => {
    // Build temperature records for logging
    const temperatureRecords = Object.entries(temperatures)
      .filter(([_, temp]) => temp !== null && temp !== undefined)
      .map(([assetId, temp]) => {
        const range = assetTempRanges.get(assetId)
        const asset = assets.get(assetId)

        let status: 'ok' | 'warning' | 'critical' = 'ok'
        if (range && (range.min !== null || range.max !== null) && temp !== null) {
          const isInverted = range.min !== null && range.max !== null && range.min > range.max
          let isOutOfRange = false

          if (isInverted) {
            isOutOfRange = temp < range.max! || temp > range.min!
          } else {
            isOutOfRange =
              (range.min !== null && temp < range.min) ||
              (range.max !== null && temp > range.max)
          }

          if (isOutOfRange) {
            status = 'critical'
          }
        }

        return {
          asset_id: assetId,
          temperature: temp!,
          status,
          recorded_at: new Date().toISOString(),
          task_id: task.id,
          company_id: task.company_id!,
          site_id: task.site_id!
        }
      })

    // Build equipment list for completion_data
    const equipmentList = assetIds.map(assetId => {
      const asset = assets.get(assetId)
      const nickname = getNickname(assetId)

      return {
        assetId,
        assetName: asset?.name || 'Unknown',
        temperature: temperatures[assetId] ?? undefined,
        nickname
      }
    })

    // Get out-of-range assets with actions
    const actionsArray = Array.from(outOfRangeActions.values())

    const payload: TaskCompletionPayload = {
      taskId: task.id,
      status: 'completed',
      completedAt: new Date().toISOString(),
      completedBy: profile?.id || '',
      formData: {
        notes,
        temperature_readings: temperatures
      },
      photos,
      temperatureRecords,
      outOfRangeAssets: actionsArray,
      equipmentList
    }

    await onSubmit(payload)
  }

  // Validation
  const hasAllTemperatures = assetIds.every(assetId =>
    temperatures[assetId] !== null && temperatures[assetId] !== undefined
  )

  const allOutOfRangeHandled = outOfRangeAssets.every(asset =>
    outOfRangeActions.has(asset.assetId)
  )

  const canSubmit = hasAllTemperatures && allOutOfRangeHandled && !submitting

  return (
    <div className="space-y-6">
      {/* Temperature Inputs */}
      <div>
        <h3 className="text-sm font-medium text-white mb-3">Temperature Readings</h3>
        <div className="space-y-2">
          {assetIds.map(assetId => {
            const asset = assets.get(assetId)
            const range = assetTempRanges.get(assetId) || { min: null, max: null }
            const nickname = getNickname(assetId)

            // Create asset object if not in map (from equipment_config)
            const displayAsset: Asset = asset || {
              id: assetId,
              name: taskData.equipment_config?.find(c => c.assetId === assetId)?.asset_name || 'Unknown Asset',
              category: 'unknown',
              site_id: task.site_id || ''
            }

            return (
              <AssetTemperatureInput
                key={assetId}
                asset={displayAsset}
                nickname={nickname}
                value={temperatures[assetId] ?? null}
                min={range.min}
                max={range.max}
                onChange={handleTemperatureChange}
                disabled={submitting}
              />
            )
          })}
        </div>
      </div>

      {/* Out of Range Warning */}
      {outOfRangeWithActions.length > 0 && (
        <OutOfRangeWarning
          outOfRangeAssets={outOfRangeWithActions}
          onActionSelect={handleActionSelect}
        />
      )}

      {/* Photo Evidence */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Photo Evidence (Optional)
        </label>

        {photos.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {photos.map((photo, index) => (
              <div key={index} className="relative">
                <img
                  src={URL.createObjectURL(photo)}
                  alt={`Photo ${index + 1}`}
                  className="w-20 h-20 object-cover rounded-lg border border-white/[0.1]"
                />
                <button
                  onClick={() => removePhoto(index)}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-white/[0.1] rounded-lg hover:border-white/[0.2] cursor-pointer transition-colors">
          <Camera className="w-5 h-5 text-neutral-400" />
          <span className="text-sm text-neutral-400">
            {photos.length > 0 ? 'Add more photos' : 'Tap to add photo'}
          </span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handlePhotoCapture}
            className="hidden"
            disabled={submitting}
          />
        </label>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={submitting}
          rows={3}
          className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
          placeholder="Add any notes..."
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 px-4 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Completing...' : 'Complete Task'}
        </button>
      </div>

      {!canSubmit && !submitting && (
        <div className="text-xs text-center text-neutral-400">
          {!hasAllTemperatures && 'Please enter all temperatures'}
          {hasAllTemperatures && !allOutOfRangeHandled && 'Please handle all out-of-range temperatures'}
        </div>
      )}
    </div>
  )
}
