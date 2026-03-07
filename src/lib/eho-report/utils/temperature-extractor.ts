import type { TaskCompletionRow, TemperatureRecord, AssetRecord } from '../types'

/**
 * Extracts temperature readings from task_completion_records.completion_data.
 * Temperature data is stored in multiple formats across completion_data —
 * this mirrors the extraction logic used in the temperature logs page.
 */
export function extractTemperatureFromCompletions(
  taskCompletions: TaskCompletionRow[],
  assets: AssetRecord[]
): TemperatureRecord[] {
  const records: TemperatureRecord[] = []
  const seen = new Set<string>() // dedup key: `${completionId}_${assetId}`

  // Build asset name lookup
  const assetNameMap = new Map<string, string>()
  for (const a of assets) {
    assetNameMap.set(a.id, a.name)
  }

  for (const tc of taskCompletions) {
    const cd = tc.completion_data
    if (!cd) continue

    // METHOD 1: equipment_list array (preferred format from TemperatureTaskForm)
    if (cd.equipment_list && Array.isArray(cd.equipment_list)) {
      for (const eq of cd.equipment_list) {
        const assetId = extractAssetId(eq.asset_id || eq.assetId || eq.id)
        if (!assetId) continue

        const key = `${tc.completion_id}_${assetId}`
        if (seen.has(key)) continue

        const reading = extractReading(eq.temperature ?? eq.reading ?? eq.temp)
        if (reading === null) continue

        seen.add(key)
        records.push({
          recorded_at: eq.recorded_at || tc.completed_at,
          asset_name: eq.asset_name || eq.nickname || assetNameMap.get(assetId) || 'Unknown Equipment',
          asset_type: null,
          reading,
          unit: 'celsius',
          status: eq.status || (eq.in_range === false ? 'breach' : 'ok'),
          recorded_by_name: tc.completed_by_name,
          evaluation: null,
        })
      }
    }

    // METHOD 2: temperatures array
    if (cd.temperatures && Array.isArray(cd.temperatures)) {
      for (const temp of cd.temperatures) {
        const assetId = extractAssetId(temp.assetId || temp.asset_id || temp.id)
        if (!assetId) continue

        const key = `${tc.completion_id}_${assetId}`
        if (seen.has(key)) continue

        const reading = extractReading(temp.temp ?? temp.temperature ?? temp.reading)
        if (reading === null) continue

        seen.add(key)
        records.push({
          recorded_at: temp.recorded_at || temp.time || tc.completed_at,
          asset_name: temp.asset_name || temp.nickname || assetNameMap.get(assetId) || 'Unknown Equipment',
          asset_type: null,
          reading,
          unit: 'celsius',
          status: temp.status || 'ok',
          recorded_by_name: tc.completed_by_name,
          evaluation: null,
        })
      }
    }

    // METHOD 3: temp_${assetId} keys in completion_data
    for (const key of Object.keys(cd)) {
      if (!key.startsWith('temp_')) continue
      const assetId = key.replace('temp_', '')
      if (!assetId || assetId.includes('[object')) continue

      const dedupKey = `${tc.completion_id}_${assetId}`
      if (seen.has(dedupKey)) continue

      const reading = extractReading(cd[key])
      if (reading === null) continue

      seen.add(dedupKey)
      records.push({
        recorded_at: tc.completed_at,
        asset_name: assetNameMap.get(assetId) || 'Unknown Equipment',
        asset_type: null,
        reading,
        unit: 'celsius',
        status: 'ok',
        recorded_by_name: tc.completed_by_name,
        evaluation: null,
      })
    }

    // METHOD 4: Single temperature field with template asset
    if (cd.temperature !== undefined && cd.temperature !== null && cd.temperature !== '') {
      // Use template name as asset context since we don't have a specific asset ID
      const reading = extractReading(cd.temperature)
      if (reading !== null) {
        const dedupKey = `${tc.completion_id}_single`
        if (!seen.has(dedupKey)) {
          seen.add(dedupKey)
          records.push({
            recorded_at: tc.completed_at,
            asset_name: tc.template_name || 'Temperature Check',
            asset_type: null,
            reading,
            unit: 'celsius',
            status: 'ok',
            recorded_by_name: tc.completed_by_name,
            evaluation: null,
          })
        }
      }
    }
  }

  return records
}

/** Safely extract a string asset ID from various formats */
function extractAssetId(raw: unknown): string | null {
  if (!raw) return null
  if (typeof raw === 'string') {
    if (raw.includes('[object')) return null
    return raw
  }
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>
    const id = obj.id || obj.value || obj.asset_id || obj.assetId
    if (typeof id === 'string' && !id.includes('[object')) return id
  }
  return null
}

/** Safely parse a reading value to a number */
function extractReading(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return null
  if (typeof raw === 'number') return isNaN(raw) ? null : raw
  if (typeof raw === 'string') {
    const num = parseFloat(raw)
    return isNaN(num) ? null : num
  }
  return null
}
