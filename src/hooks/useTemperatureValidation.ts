// ============================================================================
// useTemperatureValidation Hook
// Validates temperature readings against asset ranges
// ============================================================================

import { useMemo } from 'react'
import type { Asset, OutOfRangeAsset } from '@/types/task-completion-types'

interface TemperatureValidationResult {
  outOfRangeAssets: OutOfRangeAsset[]
  isValid: boolean
}

export function useTemperatureValidation(
  temperatures: Record<string, number | null>,
  assets: Map<string, Asset>,
  assetTempRanges: Map<string, { min: number | null; max: number | null }>
): TemperatureValidationResult {

  return useMemo(() => {
    const outOfRange: OutOfRangeAsset[] = []

    Object.entries(temperatures).forEach(([assetId, temp]) => {
      // Skip if no temperature entered
      if (temp === null || temp === undefined) return

      const tempNum = typeof temp === 'string' ? parseFloat(temp) : temp
      if (isNaN(tempNum)) return

      const range = assetTempRanges.get(assetId)
      const asset = assets.get(assetId)

      // Skip if no range defined (warning only, not blocking)
      if (!range || (range.min === null && range.max === null)) {
        console.log(`ℹ️ No range defined for asset ${assetId}`)
        return
      }

      // Handle inverted ranges (freezers where min > max, e.g., -22 to -18)
      const isInvertedRange = range.min !== null && range.max !== null && range.min > range.max

      let isOutOfRange = false
      if (isInvertedRange) {
        // Freezer: valid if temp is between max (colder) and min (warmer)
        isOutOfRange = tempNum < range.max! || tempNum > range.min!
      } else {
        // Normal: valid if temp is between min and max
        isOutOfRange =
          (range.min !== null && tempNum < range.min) ||
          (range.max !== null && tempNum > range.max)
      }

      if (isOutOfRange) {
        outOfRange.push({
          assetId,
          assetName: asset?.name || 'Unknown Asset',
          temperature: tempNum,
          min: range.min,
          max: range.max
        })
      }
    })

    return {
      outOfRangeAssets: outOfRange,
      isValid: outOfRange.length === 0
    }
  }, [temperatures, assets, assetTempRanges])
}
