'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Camera, X } from '@/components/ui/icons'
import type { ChecklistTaskWithTemplate } from '@/types/checklist-types'
import type { TemperatureTaskData, TaskCompletionPayload, OutOfRangeAsset, Asset } from '@/types/task-completion-types'
import { AssetTemperatureInput, type AssetTemperatureInputHandle } from '../components/AssetTemperatureInput'
import { NumericKeyboard } from '@/components/ui/NumericKeyboard'
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

  // Shared keyboard state
  const [focusedAssetId, setFocusedAssetId] = useState<string | null>(null)
  const [showKeyboard, setShowKeyboard] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const inputRefs = useRef<Map<string, AssetTemperatureInputHandle>>(new Map())

  useEffect(() => {
    const checkMobile = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isSmallScreen = window.innerWidth <= 768
      setIsMobile(hasTouch && isSmallScreen)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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

  // Shared keyboard handlers — route to active input
  const handleKeyPress = useCallback((key: string) => {
    if (!focusedAssetId) return
    inputRefs.current.get(focusedAssetId)?.handleKeyPress(key)
  }, [focusedAssetId])

  const handleBackspace = useCallback(() => {
    if (!focusedAssetId) return
    inputRefs.current.get(focusedAssetId)?.handleBackspace()
  }, [focusedAssetId])

  // Enter advances to next sensor (state-only, no DOM focus)
  const handleEnter = useCallback(() => {
    if (!focusedAssetId) return
    const currentIndex = assetIds.indexOf(focusedAssetId)
    if (currentIndex < assetIds.length - 1) {
      setFocusedAssetId(assetIds[currentIndex + 1])
    } else {
      // Last sensor — dismiss keyboard
      setShowKeyboard(false)
      setFocusedAssetId(null)
    }
  }, [focusedAssetId, assetIds])

  const handleDismiss = useCallback(() => {
    setShowKeyboard(false)
    setFocusedAssetId(null)
  }, [])

  const handleInputFocus = useCallback((assetId: string) => {
    setFocusedAssetId(assetId)
    if (isMobile) setShowKeyboard(true)
  }, [isMobile])

  const handleInputBlur = useCallback((_assetId: string) => {
    // On mobile, outside-click handler manages dismissal
    // On desktop, clear state directly
    if (!isMobile) {
      setFocusedAssetId(null)
      setShowKeyboard(false)
    }
  }, [isMobile])

  // Outside-click dismissal for mobile keyboard
  useEffect(() => {
    if (!isMobile || !showKeyboard) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const keyboard = document.querySelector('[data-numeric-keyboard]')

      // Ignore clicks on the keyboard itself
      if (keyboard?.contains(target)) return

      // Check if clicked on a temperature input (let onFocus handle switching)
      const clickedInput = target.closest('[data-temp-input]')
      if (clickedInput) return

      // Clicked outside — dismiss keyboard
      setShowKeyboard(false)
      setFocusedAssetId(null)
    }

    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [isMobile, showKeyboard])

  const setInputRef = useCallback((assetId: string) => (handle: AssetTemperatureInputHandle | null) => {
    if (handle) inputRefs.current.set(assetId, handle)
    else inputRefs.current.delete(assetId)
  }, [])

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
        <h3 className="text-sm font-medium text-theme-primary mb-3">Temperature Readings</h3>
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
                ref={setInputRef(assetId)}
                key={assetId}
                assetId={assetId}
                assetName={displayAsset.name}
                nickname={nickname}
                value={temperatures[assetId] ?? null}
                min={range.min}
                max={range.max}
                onChange={handleTemperatureChange}
                disabled={submitting}
                isKeyboardTarget={focusedAssetId === assetId && showKeyboard}
                onInputFocus={handleInputFocus}
                onInputBlur={handleInputBlur}
                isMobile={isMobile}
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
        <label className="block text-sm font-medium text-theme-primary mb-2">
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
          <Camera className="w-5 h-5 text-theme-tertiary" />
          <span className="text-sm text-theme-tertiary">
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
        <label className="block text-sm font-medium text-theme-primary mb-2">
          Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={submitting}
          rows={3}
          className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-theme-primary placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
          placeholder="Add any notes..."
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 px-4 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-lg text-theme-primary text-sm font-medium transition-colors disabled:opacity-50"
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
        <div className="text-xs text-center text-theme-tertiary">
          {!hasAllTemperatures && 'Please enter all temperatures'}
          {hasAllTemperatures && !allOutOfRangeHandled && 'Please handle all out-of-range temperatures'}
        </div>
      )}

      {/* Single shared numeric keyboard */}
      {isMobile && (
        <NumericKeyboard
          onKeyPress={handleKeyPress}
          onBackspace={handleBackspace}
          onEnter={handleEnter}
          onDismiss={handleDismiss}
          isVisible={showKeyboard}
        />
      )}
    </div>
  )
}
