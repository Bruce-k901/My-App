import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppContext } from '@/context/AppContext'
import { PPMAsset } from '@/types/ppm';

interface MonthlyData {
  [monthKey: string]: PPMAsset[]
}

export function usePPMCalendarData(currentDate: Date) {
  const { companyId, role } = useAppContext()
  const [monthlyData, setMonthlyData] = useState<MonthlyData>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Generate month key for caching
  const getMonthKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }

  // Get date range for the current month view (including padding days)
  const getMonthDateRange = (date: Date) => {
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
    const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    
    // Get the first day of the week for the calendar grid
    const startDate = new Date(firstDayOfMonth)
    startDate.setDate(startDate.getDate() - startDate.getDay())
    
    // Get the last day of the week for the calendar grid
    const endDate = new Date(lastDayOfMonth)
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()))
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }
  }

  // Fetch PPM data for a specific month
  const fetchMonthData = async (date: Date) => {
    const monthKey = getMonthKey(date)
    
    // Return cached data if available
    if (monthlyData[monthKey]) {
      return monthlyData[monthKey]
    }

    setLoading(true)
    setError(null)

    try {
      // Check if user has access (admin, owner, or manager)
      if (!companyId || !role || !['Admin', 'Owner', 'Manager'].includes(role)) {
        setLoading(false)
        return []
      }

      const { startDate, endDate } = getMonthDateRange(date)

      // Fetch ppm_schedules records with date filter
      // Table is ppm_schedules (plural) with columns: next_due_date, frequency, task_type, description
      const { data: ppmSchedules, error: ppmError } = await supabase
        .from('ppm_schedules')
        .select('id, asset_id, next_due_date, frequency, task_type, description')
        .eq('company_id', companyId)
        .gte('next_due_date', startDate)
        .lte('next_due_date', endDate)

      if (ppmError) {
        console.error('Error fetching PPM schedules:', ppmError)
        setError(ppmError.message)
        setLoading(false)
        return []
      }

      console.log(`[PPM Calendar] Fetched ${ppmSchedules?.length || 0} PPM schedules for ${startDate} to ${endDate}`, ppmSchedules)

      if (!ppmSchedules || ppmSchedules.length === 0) {
        console.log(`[PPM Calendar] No PPM schedules found for date range ${startDate} to ${endDate}`)
        setLoading(false)
        return []
      }

      // Get unique asset IDs
      const assetIds = [...new Set(ppmSchedules.map((p: any) => p.asset_id).filter(Boolean))]

      if (assetIds.length === 0) {
        setLoading(false)
        return []
      }

      // Fetch assets with their sites
      const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select(`
          id,
          name,
          category,
          status,
          site_id,
          sites!inner(
            id,
            name,
            company_id
          )
        `)
        .in('id', assetIds)
        // Filter by company_id in JavaScript due to nested relationship limitations

      if (assetsError) {
        console.error('Error fetching assets:', assetsError)
        setError(assetsError.message)
        setLoading(false)
        return []
      }

      // Create lookup map
      const assetsMap = new Map((assets || []).map((a: any) => [a.id, a]))

      // Transform the data by joining ppm_schedules with assets
      // Map ppm_schedules columns to PPMAsset interface
      const transformedAssets: PPMAsset[] = (ppmSchedules || [])
        .map((ppm: any) => {
          const asset = assetsMap.get(ppm.asset_id)
          // Only include if asset belongs to the company
          if (!asset || asset.sites?.company_id !== companyId) {
            if (asset && asset.sites?.company_id !== companyId) {
              console.log(`[PPM Calendar] Skipping asset ${asset.id} - wrong company (${asset.sites?.company_id} vs ${companyId})`)
            }
            return null
          }
          
          // Convert frequency string to months (e.g., "monthly" = 1, "quarterly" = 3, "yearly" = 12)
          let frequencyMonths: number | null = null
          if (ppm.frequency) {
            const freqLower = ppm.frequency.toLowerCase()
            if (freqLower.includes('month')) {
              const match = freqLower.match(/(\d+)/)
              frequencyMonths = match ? parseInt(match[1]) : 1
            } else if (freqLower.includes('quarter')) {
              frequencyMonths = 3
            } else if (freqLower.includes('year')) {
              frequencyMonths = 12
            }
          }
          
          // Ensure next_due_date is in YYYY-MM-DD format
          let nextServiceDate = ppm.next_due_date
          if (nextServiceDate && typeof nextServiceDate === 'string') {
            // If it's a full ISO string, extract just the date part
            if (nextServiceDate.includes('T')) {
              nextServiceDate = nextServiceDate.split('T')[0]
            }
          }
          
          return {
            ppm_id: ppm.id,
            id: asset.id,
            name: asset.name || 'Unknown Asset',
            category_name: asset.category || 'Unknown',
            status: asset.status || null,
            site_id: asset.site_id || null,
            site_name: asset.sites?.name || 'Unknown Site',
            contractor_id: null, // ppm_schedules table doesn't have contractor_id
            contractor_name: null,
            last_service_date: null, // Column doesn't exist in table
            next_service_date: nextServiceDate, // Map next_due_date to next_service_date
            frequency_months: frequencyMonths,
            ppm_status: null, // Column doesn't exist in table
            ppm_notes: ppm.description || null, // Map description to notes
          }
        })
        .filter((asset): asset is PPMAsset => asset !== null)
        // Sort by next_service_date in JavaScript
        .sort((a, b) => {
          if (!a.next_service_date && !b.next_service_date) return 0
          if (!a.next_service_date) return 1
          if (!b.next_service_date) return -1
          return new Date(a.next_service_date).getTime() - new Date(b.next_service_date).getTime()
        })

      console.log(`[PPM Calendar] Transformed ${transformedAssets.length} assets for month ${monthKey}`, transformedAssets.slice(0, 3))

      // Cache the data
      setMonthlyData(prev => ({
        ...prev,
        [monthKey]: transformedAssets
      }))

      setLoading(false)
      return transformedAssets

    } catch (err) {
      console.error('Error fetching PPM calendar data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setLoading(false)
      return []
    }
  }

  // Get current month data
  const currentMonthData = useMemo(() => {
    const monthKey = getMonthKey(currentDate)
    return monthlyData[monthKey] || []
  }, [monthlyData, currentDate])

  // Fetch data when current date or companyId changes
  useEffect(() => {
    if (companyId) {
      fetchMonthData(currentDate)
    }
  }, [currentDate, companyId])

  // Prefetch adjacent months for better UX (disabled for now to reduce jitter)
  // useEffect(() => {
  //   const prefetchAdjacentMonths = async () => {
  //     const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
  //     const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
  //     
  //     // Prefetch previous month if not cached
  //     const prevMonthKey = getMonthKey(prevMonth)
  //     if (!monthlyData[prevMonthKey]) {
  //       setTimeout(() => fetchMonthData(prevMonth), 100)
  //     }
  //     
  //     // Prefetch next month if not cached
  //     const nextMonthKey = getMonthKey(nextMonth)
  //     if (!monthlyData[nextMonthKey]) {
  //       setTimeout(() => fetchMonthData(nextMonth), 200)
  //     }
  //   }

  //   // Only prefetch if we have current month data
  //   if (currentMonthData.length >= 0) {
  //     prefetchAdjacentMonths()
  //   }
  // }, [currentDate, currentMonthData, monthlyData, companyId])

  // Clear old cached data (keep only last 6 months)
  useEffect(() => {
    const cleanupOldData = () => {
      const cutoffDate = new Date()
      cutoffDate.setMonth(cutoffDate.getMonth() - 6)
      
      const cutoffKey = getMonthKey(cutoffDate)
      
      setMonthlyData(prev => {
        const cleaned = { ...prev }
        Object.keys(cleaned).forEach(key => {
          if (key < cutoffKey) {
            delete cleaned[key]
          }
        })
        return cleaned
      })
    }

    // Clean up every 5 minutes
    const interval = setInterval(cleanupOldData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return {
    assets: currentMonthData,
    loading,
    error,
    refreshMonth: () => {
      const monthKey = getMonthKey(currentDate)
      setMonthlyData(prev => {
        const updated = { ...prev }
        delete updated[monthKey]
        return updated
      })
      fetchMonthData(currentDate)
    },
    clearCache: () => setMonthlyData({})
  }
}