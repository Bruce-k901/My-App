// ============================================================================
// useTaskData Hook
// Loads task data, assets, and template information
// ============================================================================

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { ChecklistTaskWithTemplate } from '@/types/checklist-types'
import type { TaskData, Asset, TemperatureTaskData } from '@/types/task-completion-types'

interface UseTaskDataResult {
  taskData: TaskData
  assets: Map<string, Asset>
  assetTempRanges: Map<string, { min: number | null; max: number | null }>
  templateFields: any[]
  loading: boolean
  error: string | null
}

export function useTaskData(
  task: ChecklistTaskWithTemplate,
  isOpen: boolean,
  companyId: string | null,
  siteId: string | null
): UseTaskDataResult {
  const [taskData, setTaskData] = useState<TaskData>({})
  const [assets, setAssets] = useState<Map<string, Asset>>(new Map())
  const [assetTempRanges, setAssetTempRanges] = useState<Map<string, { min: number | null; max: number | null }>>(new Map())
  const [templateFields, setTemplateFields] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setTaskData({})
      setAssets(new Map())
      setAssetTempRanges(new Map())
      setTemplateFields([])
      setLoading(true)
      setError(null)
      return
    }

    async function loadTaskData() {
      setLoading(true)
      setError(null)

      try {
        // 1. Load task_data from task
        const rawTaskData = (task.task_data || {}) as TaskData
        setTaskData(rawTaskData)

        // 2. Load template fields
        if (task.template_id) {
          const { data: template } = await supabase
            .from('task_templates')
            .select('fields')
            .eq('id', task.template_id)
            .single()

          if (template?.fields && Array.isArray(template.fields)) {
            setTemplateFields(template.fields)
          }
        }

        // 3. Collect asset IDs from various sources
        const assetIds: string[] = []

        // From selectedAssets (temperature tasks)
        if ('selectedAssets' in rawTaskData && Array.isArray(rawTaskData.selectedAssets)) {
          assetIds.push(...rawTaskData.selectedAssets)
        }

        // From equipment_config (temperature tasks with config)
        if ('equipment_config' in rawTaskData && Array.isArray((rawTaskData as TemperatureTaskData).equipment_config)) {
          const configAssetIds = (rawTaskData as TemperatureTaskData).equipment_config!
            .map(item => item.assetId)
            .filter(Boolean)
          assetIds.push(...configAssetIds)
        }

        // From PPM tasks which have a single asset
        if ('source_type' in rawTaskData &&
            (rawTaskData.source_type === 'ppm_overdue' || rawTaskData.source_type === 'ppm_service') &&
            'source_id' in rawTaskData) {
          assetIds.push((rawTaskData as any).source_id)
        }

        // Load assets if we have any
        if (assetIds.length > 0) {
          await loadAssets([...new Set(assetIds)]) // Dedupe
        }

        // 4. Also load temp ranges from equipment_config if available
        if ('equipment_config' in rawTaskData && Array.isArray((rawTaskData as TemperatureTaskData).equipment_config)) {
          const tempRangeMap = new Map<string, { min: number | null; max: number | null }>()

          for (const item of (rawTaskData as TemperatureTaskData).equipment_config!) {
            if (item.assetId) {
              tempRangeMap.set(item.assetId, {
                min: item.temp_min ?? null,
                max: item.temp_max ?? null
              })
            }
          }

          // Merge with any existing ranges (DB takes precedence)
          setAssetTempRanges(prev => {
            const merged = new Map(tempRangeMap)
            prev.forEach((range, assetId) => {
              if (range.min !== null || range.max !== null) {
                merged.set(assetId, range)
              }
            })
            return merged
          })
        }

      } catch (err: any) {
        console.error('Error loading task data:', err)
        setError(err.message || 'Failed to load task data')
      } finally {
        setLoading(false)
      }
    }

    async function loadAssets(assetIds: string[]) {
      if (!assetIds || assetIds.length === 0) return

      const { data: assetData, error: assetError } = await supabase
        .from('assets')
        .select('id, name, category, site_id, temperature_min, temperature_max, sites(id, name)')
        .in('id', assetIds)

      if (assetError) {
        console.error('Error loading assets:', assetError)
        return
      }

      if (assetData && assetData.length > 0) {
        const assetMap = new Map<string, Asset>()
        const tempRangeMap = new Map<string, { min: number | null; max: number | null }>()

        assetData.forEach((asset: any) => {
          const site = Array.isArray(asset.sites) ? asset.sites[0] : asset.sites
          const assetWithSite: Asset = {
            id: asset.id,
            name: asset.name,
            category: asset.category,
            site_id: asset.site_id,
            site_name: site?.name || 'No site assigned',
            temperature_min: asset.temperature_min,
            temperature_max: asset.temperature_max
          }
          assetMap.set(asset.id, assetWithSite)
          tempRangeMap.set(asset.id, {
            min: asset.temperature_min ?? null,
            max: asset.temperature_max ?? null
          })
        })

        setAssets(assetMap)
        setAssetTempRanges(tempRangeMap)

        console.log('✅ Loaded assets:', assetMap.size)
      }
    }

    loadTaskData()
  }, [isOpen, task.id, task.template_id, task.task_data, companyId, siteId])

  return {
    taskData,
    assets,
    assetTempRanges,
    templateFields,
    loading,
    error
  }
}
