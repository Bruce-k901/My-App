/**
 * TEMPERATURE WARNING SYSTEM
 * 
 * This hook manages temperature warnings for assets in task completion.
 * It's isolated from other logic to prevent breaking when other features change.
 * 
 * CRITICAL: Do not modify this without testing temperature warnings thoroughly.
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface AssetTempRange {
  min: number | null
  max: number | null
}

export interface UseTemperatureWarningsResult {
  assetTempRanges: Map<string, AssetTempRange>
  outOfRangeAssets: Set<string>
  checkTemperature: (temp: number, assetId: string) => boolean
  addOutOfRangeAsset: (assetId: string) => void
  removeOutOfRangeAsset: (assetId: string) => void
  isOutOfRange: (assetId: string) => boolean
  isLoading: boolean
  error: string | null
}

/**
 * Hook to manage temperature warnings for assets
 * 
 * @param assetIds - Array of asset IDs to load temperature ranges for
 * @param templateAssetId - Optional template-linked asset ID
 * @param selectedAssets - Optional array of selected assets
 */
export function useTemperatureWarnings(
  assetIds: string[],
  templateAssetId?: string | null,
  selectedAssets?: any[]
): UseTemperatureWarningsResult {
  const [assetTempRanges, setAssetTempRanges] = useState<Map<string, AssetTempRange>>(new Map())
  const [outOfRangeAssets, setOutOfRangeAssets] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load asset temperature ranges
  useEffect(() => {
    let isMounted = true
    
    const loadRanges = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const ranges = new Map<string, AssetTempRange>()
        const allAssetIds = new Set<string>()
        
        // Add template-linked asset
        if (templateAssetId) {
          allAssetIds.add(templateAssetId)
        }
        
        // Add asset IDs from array
        assetIds.forEach(id => {
          if (id) allAssetIds.add(id)
        })
        
        // Add asset IDs from selected assets
        if (selectedAssets && Array.isArray(selectedAssets)) {
          selectedAssets.forEach((asset: any) => {
            if (asset?.id) allAssetIds.add(asset.id)
          })
        }
        
        if (allAssetIds.size === 0) {
          console.log('🌡️ No assets to load temperature ranges for')
          setIsLoading(false)
          return
        }
        
        // Fetch all assets with temperature ranges
        const { data: assetsData, error: assetsError } = await supabase
          .from('assets')
          .select('id, name, working_temp_min, working_temp_max')
          .in('id', Array.from(allAssetIds))
        
        if (assetsError) {
          throw new Error(`Failed to load asset temperature ranges: ${assetsError.message}`)
        }
        
        if (assetsData && isMounted) {
          assetsData.forEach(asset => {
            ranges.set(asset.id, {
              min: asset.working_temp_min,
              max: asset.working_temp_max
            })
          })
          
          setAssetTempRanges(ranges)
          
          console.log('🌡️ Loaded asset temperature ranges:', {
            count: ranges.size,
            ranges: Array.from(ranges.entries()).map(([id, range]) => ({
              assetId: id,
              min: range.min,
              max: range.max
            }))
          })
        }
      } catch (err) {
        console.error('❌ Error loading asset temperature ranges:', err)
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load temperature ranges')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }
    
    loadRanges()
    
    return () => {
      isMounted = false
    }
  }, [assetIds.join(','), templateAssetId, selectedAssets?.map(a => a?.id).join(',')])

  /**
   * Check if a temperature is out of range for an asset
   */
  const checkTemperature = useCallback((temp: number, assetId: string): boolean => {
    if (!assetId || isNaN(temp)) {
      return false
    }
    
    const range = assetTempRanges.get(assetId)
    if (!range) {
      console.warn(`⚠️ No temperature range loaded for asset ${assetId}`)
      return false
    }
    
    const { min, max } = range
    if (min === null && max === null) {
      return false
    }
    
    // Check if temperature is outside the working range
    // Handle inverted ranges for freezers (where min > max, e.g., min: -18, max: -20)
    // For freezers: range is actually max to min (colder to warmer), so -20°C to -18°C
    // For fridges: range is min to max (colder to warmer), so 3°C to 5°C
    const isInvertedRange = min !== null && max !== null && min > max
    let isOutOfRange = false
    
    if (isInvertedRange) {
      // Inverted range (freezer): actual range is max (colder) to min (warmer)
      // Temperature is out of range if: temp < max (too cold) OR temp > min (too warm)
      isOutOfRange = (max !== null && temp < max) || (min !== null && temp > min)
    } else {
      // Normal range (fridge): range is min (colder) to max (warmer)
      isOutOfRange = (min !== null && temp < min) || (max !== null && temp > max)
    }
    
    if (isOutOfRange) {
      console.log(`🌡️ Temperature ${temp}°C is out of range for asset ${assetId}:`, {
        temp,
        min,
        max,
        isInvertedRange,
        belowMin: isInvertedRange ? (max !== null && temp < max) : (min !== null && temp < min),
        aboveMax: isInvertedRange ? (min !== null && temp > min) : (max !== null && temp > max)
      })
    }
    
    return isOutOfRange
  }, [assetTempRanges])

  /**
   * Add an asset to the out-of-range set
   */
  const addOutOfRangeAsset = useCallback((assetId: string) => {
    setOutOfRangeAssets(prev => {
      const newSet = new Set(prev)
      newSet.add(assetId)
      console.log(`🚨 Added asset ${assetId} to out-of-range set. Total: ${newSet.size}`)
      return newSet
    })
  }, [])

  /**
   * Remove an asset from the out-of-range set
   */
  const removeOutOfRangeAsset = useCallback((assetId: string) => {
    setOutOfRangeAssets(prev => {
      const newSet = new Set(prev)
      newSet.delete(assetId)
      return newSet
    })
  }, [])

  /**
   * Check if an asset is currently marked as out of range
   */
  const isOutOfRange = useCallback((assetId: string): boolean => {
    return outOfRangeAssets.has(assetId)
  }, [outOfRangeAssets])

  return {
    assetTempRanges,
    outOfRangeAssets,
    checkTemperature,
    addOutOfRangeAsset,
    removeOutOfRangeAsset,
    isOutOfRange,
    isLoading,
    error
  }
}

