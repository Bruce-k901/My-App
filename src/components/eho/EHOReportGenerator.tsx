'use client'

import { useState, useEffect } from 'react'
import { Calendar, Download, FileText, FileJson, Archive, Loader2, AlertCircle, CheckCircle2, Building2, ChevronDown, ChevronUp, ShieldCheck } from '@/components/ui/icons'
import { useAppContext } from '@/context/AppContext'
import { Button } from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import EHOReadinessDashboard from './EHOReadinessDashboard'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

interface EHOReportGeneratorProps {
  onReportGenerated?: (reportId: string) => void
}

interface ComplianceSummary {
  category: string
  total_tasks: number
  completed_tasks: number
  missed_tasks: number
  completion_rate: number
  average_completion_time_seconds: number
  flagged_completions: number
}

interface Site {
  id: string
  name: string
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  postcode?: string | null
}

export default function EHOReportGenerator({ onReportGenerated }: EHOReportGeneratorProps) {
  const { siteId: contextSiteId, companyId, profile, loading: contextLoading } = useAppContext()
  const [selectedSiteId, setSelectedSiteId] = useState<string>(contextSiteId || '')
  const [sites, setSites] = useState<Site[]>([])
  const [sitesLoading, setSitesLoading] = useState(false)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [includeMissedTasks, setIncludeMissedTasks] = useState(false)
  const [exportFormat, setExportFormat] = useState<'pdf' | 'json' | 'zip'>('pdf')
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<ComplianceSummary[]>([])
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reportGeneratorExpanded, setReportGeneratorExpanded] = useState(false)
  const [fullPackLoading, setFullPackLoading] = useState(false)

  // Fetch sites list - wait for context to load
  useEffect(() => {
    if (contextLoading) {
      console.log('Context still loading, waiting...')
      return
    }

    if (companyId) {
      console.log('Context loaded, fetching sites for companyId:', companyId)
      fetchSites()
    } else {
      console.warn('Context loaded but no companyId available', { profile, companyId })
    }
  }, [companyId, contextLoading])

  // Initialize dates (default to last 30 days)
  useEffect(() => {
    const today = new Date()
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    setEndDate(today.toISOString().split('T')[0])
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0])
  }, [])

  // Set default site from context
  useEffect(() => {
    if (contextSiteId && !selectedSiteId) {
      setSelectedSiteId(contextSiteId)
    }
  }, [contextSiteId])

  // Load summary when dates or site change
  useEffect(() => {
    if (startDate && endDate && selectedSiteId) {
      loadSummary()
    }
  }, [startDate, endDate, selectedSiteId])

  async function fetchSites() {
    if (!companyId) {
      console.warn('fetchSites: No companyId available')
      return
    }

    setSitesLoading(true)
    try {
      // Fetch sites user has access to via user_site_access or company_id
      const { data: sitesData, error: sitesError } = await supabase
        .from('sites')
        .select('id, name, address_line1, address_line2, city, postcode')
        .eq('company_id', companyId)
        .order('name')

      if (sitesError) {
        const errorDetails = {
          message: sitesError.message,
          details: sitesError.details,
          hint: sitesError.hint,
          code: sitesError.code
        }
        console.error('Supabase error fetching sites:', JSON.stringify(errorDetails, null, 2))
        throw new Error(sitesError.message || 'Failed to fetch sites')
      }

      setSites(sitesData || [])

      // If no site selected and we have sites, select the first one
      if (!selectedSiteId && sitesData && sitesData.length > 0) {
        setSelectedSiteId(sitesData[0].id)
      }
    } catch (err: any) {
      const errorInfo = {
        error: err,
        message: err?.message || String(err),
        companyId,
        errorString: JSON.stringify(err, Object.getOwnPropertyNames(err))
      }
      console.error('Error fetching sites:', JSON.stringify(errorInfo, null, 2))
      console.error('Raw error object:', err)
      toast.error(err?.message || 'Failed to load sites')
    } finally {
      setSitesLoading(false)
    }
  }

  async function loadSummary() {
    if (!selectedSiteId || !startDate || !endDate) {
      console.warn('loadSummary: Missing required params', { selectedSiteId, startDate, endDate })
      return
    }

    setSummaryLoading(true)
    setError(null)

    try {
      const url = `/api/eho/summary?site_id=${selectedSiteId}&start_date=${startDate}&end_date=${endDate}`
      console.log('Loading summary from:', url)

      const response = await fetch(url)

      if (!response.ok) {
        let errorMessage = 'Failed to load summary'
        try {
          const data = await response.json()
          errorMessage = data.error || data.details || `HTTP ${response.status}: ${response.statusText}`
          console.error('API error response:', data)
        } catch (parseError) {
          // Response might not be JSON
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
          console.error('Failed to parse error response:', parseError)
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log('Summary loaded successfully:', result)
      setSummary(result.data || [])
    } catch (err: any) {
      const errorInfo = {
        error: err,
        message: err?.message || String(err),
        selectedSiteId,
        startDate,
        endDate,
        errorString: JSON.stringify(err, Object.getOwnPropertyNames(err))
      }
      console.error('Error loading summary:', JSON.stringify(errorInfo, null, 2))
      console.error('Raw error object:', err)
      const errorMessage = err?.message || 'Failed to load compliance summary'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setSummaryLoading(false)
    }
  }

  async function generateReport() {
    if (!selectedSiteId || !startDate || !endDate) {
      toast.error('Please select a site and date range')
      return
    }

    // Validate date range (max 180 days)
    const start = new Date(startDate)
    const end = new Date(endDate)
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff > 180) {
      toast.error('Date range cannot exceed 180 days (6 months)')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Build query params
      const params = new URLSearchParams({
        site_id: selectedSiteId,
        start_date: startDate,
        end_date: endDate,
        format: exportFormat,
        full_report: 'true',
        include_missed: includeMissedTasks.toString()
      })

      if (selectedCategories.length > 0) {
        params.append('categories', selectedCategories.join(','))
      }

      // Call appropriate endpoint based on format
      let endpoint = '/api/eho/export'
      let method = 'POST'

      if (exportFormat === 'json') {
        endpoint = '/api/eho/export/json'
        method = 'POST'
      } else if (exportFormat === 'zip') {
        endpoint = '/api/eho/export/zip'
        method = 'POST'
      } else {
        // PDF - returns HTML that can be printed to PDF
        endpoint = '/api/eho/export'
        method = 'POST'
      }

      const response = await fetch(`${endpoint}?${params.toString()}`, {
        method: method,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to generate report')
      }

      // Handle file download based on format
      if (exportFormat === 'pdf') {
        // PDF returns HTML - open in new window for printing
        const html = await response.text()
        const blob = new Blob([html], { type: 'text/html' })
        const url = window.URL.createObjectURL(blob)
        const newWindow = window.open(url, '_blank')
        if (newWindow) {
          newWindow.onload = () => {
            // Auto-trigger print dialog after a short delay
            setTimeout(() => {
              newWindow.print()
              // Revoke after print dialog is triggered
              window.URL.revokeObjectURL(url)
            }, 500)
          }
        } else {
          window.URL.revokeObjectURL(url)
        }
      } else if (exportFormat === 'json') {
        // JSON download
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `eho-report-${startDate}-to-${endDate}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else if (exportFormat === 'zip') {
        // ZIP - for now, return JSON with instructions
        // TODO: Implement client-side ZIP creation using JSZip
        const data = await response.json()
        toast.info('ZIP generation requires client-side processing. JSON data prepared.')
        console.log('ZIP data:', data)
        // In the future, use JSZip to create the ZIP file client-side
      }

      toast.success('Report generated successfully!')

      if (onReportGenerated) {
        const filename = `eho-report-${startDate}-to-${endDate}.${exportFormat === 'json' ? 'json' : exportFormat === 'zip' ? 'zip' : 'pdf'}`
        onReportGenerated(filename)
      }
    } catch (err: any) {
      console.error('Error generating report:', err)
      setError(err.message)
      toast.error(err.message || 'Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  async function generateFullPack() {
    if (!selectedSiteId) {
      toast.error('Please select a site')
      return
    }

    // Default to last 90 days if no dates set
    const end = endDate || new Date().toISOString().split('T')[0]
    const start = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    setFullPackLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        site_id: selectedSiteId,
        start_date: start,
        end_date: end,
        format: 'pdf',
        full_report: 'true',
      })

      const response = await fetch(`/api/eho/export?${params.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to generate EHO pack')
      }

      const html = await response.text()
      const blob = new Blob([html], { type: 'text/html' })
      const url = window.URL.createObjectURL(blob)
      const newWindow = window.open(url, '_blank')
      if (newWindow) {
        newWindow.onload = () => {
          setTimeout(() => {
            newWindow.print()
            window.URL.revokeObjectURL(url)
          }, 1000)
        }
      } else {
        window.URL.revokeObjectURL(url)
      }

      toast.success('Full EHO Pack generated successfully!')
    } catch (err: any) {
      console.error('Error generating full EHO pack:', err)
      setError(err.message)
      toast.error(err.message || 'Failed to generate EHO pack')
    } finally {
      setFullPackLoading(false)
    }
  }

  const templateCategories = [
    { value: 'food_safety', label: 'Food Safety' },
    { value: 'h_and_s', label: 'Health & Safety' },
    { value: 'fire', label: 'Fire Safety' },
    { value: 'cleaning', label: 'Cleaning' },
    { value: 'compliance', label: 'Compliance' }
  ]

  const totalTasks = summary.reduce((sum, s) => sum + s.total_tasks, 0)
  const totalCompleted = summary.reduce((sum, s) => sum + s.completed_tasks, 0)
  const overallCompletionRate = totalTasks > 0
    ? Math.round((totalCompleted / totalTasks) * 100)
    : 0

  // Show loading state while context is loading
  if (contextLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#D37E91] dark:text-[#D37E91] animate-spin" />
          <span className="ml-3 text-gray-500 dark:text-white/60">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">EHO Readiness Pack</h1>
        <p className="text-gray-500 dark:text-neutral-400">
          Analyze your compliance readiness and generate comprehensive reports for Environmental Health Officer inspections
        </p>
      </div>

      {/* Site Selector - Always Visible */}
      <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
        <Select
          label="Site"
          value={selectedSiteId}
          onValueChange={(val) => setSelectedSiteId(val)}
          disabled={sitesLoading}
          placeholder={sitesLoading ? 'Loading sites...' : sites.length === 0 ? 'No sites available' : 'Select a site'}
          options={
            sitesLoading
              ? []
              : sites.length === 0
              ? []
              : sites.map((site) => ({
                  label: `${site.name}${site.postcode ? ` (${site.postcode})` : ''}`,
                  value: site.id
                }))
          }
        />
      </div>

      {/* Readiness Dashboard - Always Visible */}
      {selectedSiteId && (
        <EHOReadinessDashboard siteId={selectedSiteId} />
      )}

      {/* Full EHO Pack Button */}
      {selectedSiteId && (
        <div className="bg-gradient-to-r from-[#D37E91]/10 to-purple-50 dark:from-[#D37E91]/15 dark:to-purple-500/10 border border-[#D37E91]/30 dark:border-[#D37E91]/20 rounded-xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#D37E91]/10 dark:bg-[#D37E91]/25 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-5 h-5 text-[#D37E91] dark:text-[#D37E91]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Full EHO Compliance Pack</h2>
                <p className="text-sm text-gray-600 dark:text-white/60 mt-1">
                  Generate a comprehensive A-Z compliance report covering all 14 sections — temperature logs, cleaning records,
                  training certificates, incidents, pest control, COSHH, equipment, documentation, and more.
                </p>
                <p className="text-xs text-gray-400 dark:text-white/40 mt-2">
                  {startDate && endDate
                    ? `Report period: ${startDate} to ${endDate}`
                    : 'Defaults to the last 90 days if no dates are set below'
                  }
                </p>
              </div>
            </div>
            <Button
              onClick={generateFullPack}
              disabled={fullPackLoading}
              className="flex items-center gap-2 whitespace-nowrap flex-shrink-0"
            >
              {fullPackLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Generate Full Pack
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Report Generator - Collapsible */}
      <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
        <button
          onClick={() => setReportGeneratorExpanded(!reportGeneratorExpanded)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Generate Report</h2>
            <p className="text-sm text-gray-500 dark:text-white/60">Export compliance data as PDF, JSON, or ZIP</p>
          </div>
          {reportGeneratorExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400 dark:text-white/60" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400 dark:text-white/60" />
          )}
        </button>

        {reportGeneratorExpanded && (
          <div className="px-6 pb-6 pt-2 border-t border-gray-200 dark:border-white/[0.06] space-y-6">
            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                  Start Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/40" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-[#D37E91] dark:focus:border-[#D37E91]/50"
                    max={endDate}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                  End Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/40" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-[#D37E91] dark:focus:border-[#D37E91]/50"
                    min={startDate}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            </div>

            {/* Template Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                Template Categories (optional - leave empty for all)
              </label>
              <div className="flex flex-wrap gap-2">
                {templateCategories.map((cat) => (
                  <label
                    key={cat.value}
                    className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCategories([...selectedCategories, cat.value])
                        } else {
                          setSelectedCategories(selectedCategories.filter(c => c !== cat.value))
                        }
                      }}
                      className="w-4 h-4 text-[#D37E91] rounded focus:ring-[#D37E91]"
                    />
                    <span className="text-sm text-gray-700 dark:text-white/80">{cat.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMissedTasks}
                  onChange={(e) => setIncludeMissedTasks(e.target.checked)}
                  className="w-4 h-4 text-[#D37E91] rounded focus:ring-[#D37E91]"
                />
                <span className="text-sm text-gray-700 dark:text-white/80">Include missed tasks in report</span>
              </label>
            </div>

            {/* Export Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                Export Format
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setExportFormat('pdf')}
                  className={`flex flex-col items-center gap-2 p-4 border rounded-lg transition-all ${
                    exportFormat === 'pdf'
                      ? 'border-[#D37E91] dark:border-[#D37E91]/50 bg-[#D37E91]/10 dark:bg-[#D37E91]/15'
                      : 'border-gray-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.03] hover:bg-gray-50 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <FileText className={`w-6 h-6 ${exportFormat === 'pdf' ? 'text-[#D37E91] dark:text-[#D37E91]' : 'text-gray-400 dark:text-white/60'}`} />
                  <span className={`text-sm font-medium ${exportFormat === 'pdf' ? 'text-[#D37E91] dark:text-[#D37E91]' : 'text-gray-600 dark:text-white/70'}`}>
                    PDF
                  </span>
                </button>
                <button
                  onClick={() => setExportFormat('json')}
                  className={`flex flex-col items-center gap-2 p-4 border rounded-lg transition-all ${
                    exportFormat === 'json'
                      ? 'border-[#D37E91] dark:border-[#D37E91]/50 bg-[#D37E91]/10 dark:bg-[#D37E91]/15'
                      : 'border-gray-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.03] hover:bg-gray-50 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <FileJson className={`w-6 h-6 ${exportFormat === 'json' ? 'text-[#D37E91] dark:text-[#D37E91]' : 'text-gray-400 dark:text-white/60'}`} />
                  <span className={`text-sm font-medium ${exportFormat === 'json' ? 'text-[#D37E91] dark:text-[#D37E91]' : 'text-gray-600 dark:text-white/70'}`}>
                    JSON
                  </span>
                </button>
                <button
                  onClick={() => setExportFormat('zip')}
                  className={`flex flex-col items-center gap-2 p-4 border rounded-lg transition-all ${
                    exportFormat === 'zip'
                      ? 'border-[#D37E91] dark:border-[#D37E91]/50 bg-[#D37E91]/10 dark:bg-[#D37E91]/15'
                      : 'border-gray-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.03] hover:bg-gray-50 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <Archive className={`w-6 h-6 ${exportFormat === 'zip' ? 'text-[#D37E91] dark:text-[#D37E91]' : 'text-gray-400 dark:text-white/60'}`} />
                  <span className={`text-sm font-medium ${exportFormat === 'zip' ? 'text-[#D37E91] dark:text-[#D37E91]' : 'text-gray-600 dark:text-white/70'}`}>
                    ZIP
                  </span>
                </button>
              </div>
            </div>

            {/* Summary Preview */}
            {summary.length > 0 && (
              <div className="bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Quick Summary</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-white/60 mb-1">Total Tasks</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{totalTasks}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-white/60 mb-1">Completed</div>
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">{totalCompleted}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-white/60 mb-1">Rate</div>
                    <div className="text-lg font-bold text-[#D37E91] dark:text-[#D37E91]">{overallCompletionRate}%</div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-300 dark:border-red-500/50 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-red-700 dark:text-red-400 mb-1">Error</div>
                  <div className="text-sm text-red-600 dark:text-red-300">{error}</div>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <div className="flex justify-end">
              <Button
                onClick={generateReport}
                disabled={loading || !startDate || !endDate || !selectedSiteId}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
