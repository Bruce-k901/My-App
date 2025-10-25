import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { PPMAsset } from '@/types/ppm';

interface MonthlyData {
  [monthKey: string]: PPMAsset[]
}

export function usePPMCalendarData(currentDate: Date) {
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
      // Get user's company and role
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return []
      }

      const { data: userRole } = await supabase
        .from('user_roles')
        .select('company_id, app_role')
        .eq('user_id', user.id)
        .single()

      if (!userRole || !['admin', 'owner', 'manager'].includes(userRole.app_role)) {
        setLoading(false)
        return []
      }

      const { startDate, endDate } = getMonthDateRange(date)

      // Optimized query: only fetch assets with PPM schedules in the date range
      const { data: assetsData, error } = await supabase
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
          ),
          contractors(
            id,
            name
          ),
          ppm_schedule!inner(
            id,
            last_service_date,
            next_service_date,
            frequency_months,
            frequency_days,
            status,
            notes,
            contractor_id
          )
        `)
        .eq('sites.company_id', userRole.company_id)
        .gte('ppm_schedule.next_service_date', startDate)
        .lte('ppm_schedule.next_service_date', endDate)
        .order('ppm_schedule.next_service_date', { ascending: true })

      if (error) {
        console.error('Error fetching PPM data:', error)
        setError(error.message)
        setLoading(false)
        return []
      }

      // Transform the data
      const transformedAssets: PPMAsset[] = (assetsData || []).map((asset: any) => ({
        ppm_id: asset.ppm_schedule?.id || null,
        id: asset.id,
        name: asset.name,
        category_name: asset.categories?.name || 'Unknown',
        status: asset.status,
        site_id: asset.site_id,
        site_name: asset.sites?.name || 'Unknown Site',
        contractor_id: asset.ppm_schedule?.contractor_id || asset.contractors?.id,
        contractor_name: asset.contractors?.name || null,
        last_service_date: asset.ppm_schedule?.last_service_date,
        next_service_date: asset.ppm_schedule?.next_service_date,
        frequency_months: asset.ppm_schedule?.frequency_months,
        ppm_status: asset.ppm_schedule?.status,
        ppm_notes: asset.ppm_schedule?.notes || null,
      }))

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

  // Fetch data when current date changes
  useEffect(() => {
    fetchMonthData(currentDate)
  }, [currentDate])

  // Prefetch adjacent months for better UX
  useEffect(() => {
    const prefetchAdjacentMonths = async () => {
      const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
      
      // Prefetch previous month if not cached
      const prevMonthKey = getMonthKey(prevMonth)
      if (!monthlyData[prevMonthKey]) {
        setTimeout(() => fetchMonthData(prevMonth), 100)
      }
      
      // Prefetch next month if not cached
      const nextMonthKey = getMonthKey(nextMonth)
      if (!monthlyData[nextMonthKey]) {
        setTimeout(() => fetchMonthData(nextMonth), 200)
      }
    }

    // Only prefetch if we have current month data
    if (currentMonthData.length >= 0) {
      prefetchAdjacentMonths()
    }
  }, [currentDate, currentMonthData, monthlyData])

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