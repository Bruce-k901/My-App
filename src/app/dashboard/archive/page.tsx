'use client'

// ============================================================================
// Archive Center - Unified Hub for All Archived Items
// ============================================================================
// Single location to view, search, and restore archived:
// - Assets, Sites, Profiles, Contractors (existing archives)
// - SOPs, RAs, Documents, Certificates (compliance archives)
// - Future: Recipes, Templates, Products, Incidents
// ============================================================================

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppContext } from '@/context/AppContext'
import {
  Archive,
  Search,
  Filter,
  Download,
  RotateCcw,
  Eye,
  Calendar,
  User,
  Building,
  FileText,
  Shield,
  BookOpen,
  Award,
  Wrench,
  Users,
  Package,
  ChevronDown,
  Loader2,
  AlertCircle,
  X
} from '@/components/ui/icons'

type ArchiveType =
  | 'assets'
  | 'tasks'
  | 'sops'
  | 'risk_assessments'
  | 'documents'
  | 'certificates'
  | 'recipes'
  | 'templates'

interface ArchiveTab {
  id: ArchiveType
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  darkColor: string
  count?: number
  enabled: boolean
}

interface ArchiveItem {
  id: string
  name: string
  type: ArchiveType
  archived_at: string
  archived_by: string
  archived_by_name?: string
  category?: string
  version?: string
  changes_summary?: string
  site_name?: string
  file_path?: string
  can_restore: boolean
  metadata?: Record<string, any>
}

export default function ArchiveCenterPage() {
  const { companyId, siteId, profile } = useAppContext()

  // State
  const [activeTab, setActiveTab] = useState<ArchiveType>('assets')
  const [items, setItems] = useState<ArchiveItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSite, setSelectedSite] = useState<string>('all')
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d'>('all')
  const [selectedItem, setSelectedItem] = useState<ArchiveItem | null>(null)

  // Tab configuration with light/dark colors
  const tabs: ArchiveTab[] = [
    {
      id: 'assets',
      label: 'Assets',
      icon: Wrench,
      color: 'text-blue-600',
      darkColor: 'dark:text-blue-400',
      enabled: true
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: FileText,
      color: 'text-orange-600',
      darkColor: 'dark:text-orange-400',
      enabled: true
    },
    {
      id: 'sops',
      label: 'SOPs',
      icon: BookOpen,
      color: 'text-indigo-600',
      darkColor: 'dark:text-indigo-400',
      enabled: true
    },
    {
      id: 'risk_assessments',
      label: 'Risk Assessments',
      icon: Shield,
      color: 'text-red-600',
      darkColor: 'dark:text-red-400',
      enabled: true
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: FileText,
      color: 'text-cyan-600',
      darkColor: 'dark:text-cyan-400',
      enabled: true
    },
    {
      id: 'certificates',
      label: 'Certificates',
      icon: Award,
      color: 'text-yellow-600',
      darkColor: 'dark:text-yellow-400',
      enabled: true
    },
    {
      id: 'recipes',
      label: 'Recipes',
      icon: Package,
      color: 'text-[#D37E91]',
      darkColor: 'dark:text-[#D37E91]',
      enabled: false
    },
    {
      id: 'templates',
      label: 'Templates',
      icon: FileText,
      color: 'text-teal-600',
      darkColor: 'dark:text-teal-400',
      enabled: false
    }
  ]

  // Load archive items based on active tab
  useEffect(() => {
    if (!companyId) return
    loadArchiveItems()
  }, [activeTab, companyId, siteId])

  const loadArchiveItems = async () => {
    try {
      setLoading(true)
      setError(null)

      let data: ArchiveItem[] = []

      // Existing archives (archived flag in main tables)
      if (['assets', 'tasks'].includes(activeTab)) {
        data = await loadTableArchives(activeTab)
      }
      // SOPs - query from sop_entries table with status='Archived'
      else if (activeTab === 'sops') {
        data = await loadSOPArchives()
      }
      // Risk Assessments - query from risk_assessments table with status='Archived'
      else if (activeTab === 'risk_assessments') {
        data = await loadRAArchives()
      }
      // Documents - query from global_documents table with is_archived=true
      else if (activeTab === 'documents') {
        data = await loadDocumentArchives()
      }
      // Certificates - query from compliance_archive table (legacy)
      else if (activeTab === 'certificates') {
        data = await loadComplianceArchives(activeTab)
      }

      setItems(data)
    } catch (err) {
      console.error('Error loading archives:', err)
      setError(err instanceof Error ? err.message : 'Failed to load archives')
    } finally {
      setLoading(false)
    }
  }

  // Load archived Documents from global_documents table
  const loadDocumentArchives = async (): Promise<ArchiveItem[]> => {
    const { data, error } = await supabase
      .from('global_documents')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_archived', true)
      .order('created_at', { ascending: false })

    if (error) {
      // If is_archived column doesn't exist, return empty array
      if (error.message?.includes('is_archived') || error.code === 'PGRST204') {
        console.warn('is_archived column not found in global_documents')
        return []
      }
      throw error
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      name: item.name || 'Unnamed Document',
      type: 'documents' as ArchiveType,
      archived_at: item.created_at,
      archived_by: 'Unknown',
      category: item.category,
      version: item.version,
      file_path: item.file_path,
      can_restore: true,
      metadata: item
    }))
  }

  // Load archived Risk Assessments from risk_assessments table
  const loadRAArchives = async (): Promise<ArchiveItem[]> => {
    const { data, error } = await supabase
      .from('risk_assessments')
      .select(`
        *,
        profiles:archived_by(full_name)
      `)
      .eq('company_id', companyId)
      .eq('status', 'Archived')
      .order('archived_at', { ascending: false, nullsFirst: false })

    if (error) throw error

    return (data || []).map((item: any) => ({
      id: item.id,
      name: item.title || 'Unnamed RA',
      type: 'risk_assessments' as ArchiveType,
      archived_at: item.archived_at || item.updated_at,
      archived_by: item.archived_by || 'Unknown',
      archived_by_name: item.profiles?.full_name,
      category: item.template_type === 'coshh' ? 'COSHH' : 'General',
      version: item.version_number ? `v${item.version_number}` : undefined,
      can_restore: true,
      metadata: item
    }))
  }

  // Load archived SOPs from sop_entries table
  const loadSOPArchives = async (): Promise<ArchiveItem[]> => {
    const { data, error } = await supabase
      .from('sop_entries')
      .select(`
        *,
        profiles:archived_by(full_name)
      `)
      .eq('company_id', companyId)
      .eq('status', 'Archived')
      .order('archived_at', { ascending: false, nullsFirst: false })

    if (error) throw error

    return (data || []).map((item: any) => ({
      id: item.id,
      name: item.title || 'Unnamed SOP',
      type: 'sops' as ArchiveType,
      archived_at: item.archived_at || item.updated_at,
      archived_by: item.archived_by || 'Unknown',
      archived_by_name: item.profiles?.full_name,
      category: item.category,
      version: item.version_number ? `v${item.version_number}` : undefined,
      can_restore: true,
      metadata: item
    }))
  }

  // Load from tables with archived=true
  const loadTableArchives = async (type: ArchiveType): Promise<ArchiveItem[]> => {
    const tableMap = {
      assets: 'assets',
      tasks: 'tasks'
    }

    const table = tableMap[type as keyof typeof tableMap]

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('company_id', companyId)
      .eq('archived', true)
      .order('updated_at', { ascending: false })

    if (error) throw error

    return (data || []).map((item: any) => ({
      id: item.id,
      name: item.name || item.title || item.description || item.full_name || item.company_name || 'Unnamed',
      type,
      archived_at: item.archived_at || item.updated_at,
      archived_by: item.archived_by || 'Unknown',
      site_name: item.site_name,
      can_restore: true,
      metadata: item
    }))
  }

  // Load from compliance_archive table
  const loadComplianceArchives = async (type: ArchiveType): Promise<ArchiveItem[]> => {
    const sourceTypeMap = {
      sops: 'sop',
      risk_assessments: 'ra',
      documents: 'document',
      certificates: 'certificate'
    }

    const sourceType = sourceTypeMap[type as keyof typeof sourceTypeMap]

    try {
      const { data, error } = await supabase
        .from('compliance_archive')
        .select(`
          *,
          profiles:archived_by(full_name)
        `)
        .eq('company_id', companyId)
        .eq('source_type', sourceType)
        .order('archived_at', { ascending: false })

      if (error) throw error

      return (data || []).map((item: any) => ({
        id: item.id,
        name: item.display_name,
        type,
        archived_at: item.archived_at,
        archived_by: item.archived_by,
        archived_by_name: item.profiles?.full_name,
        category: item.document_category,
        version: item.version_label,
        changes_summary: item.changes_summary,
        file_path: item.file_path,
        can_restore: false, // Compliance items are permanent archives
        metadata: item
      }))
    } catch (err) {
      // Table might not exist yet
      console.warn('compliance_archive table may not exist:', err)
      return []
    }
  }

  // Filter items based on search and filters
  const filteredItems = useMemo(() => {
    let filtered = items

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query) ||
        item.changes_summary?.toLowerCase().includes(query)
      )
    }

    // Site filter (for site-specific archives)
    if (selectedSite !== 'all') {
      filtered = filtered.filter(item => item.metadata?.site_id === selectedSite)
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date()
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      filtered = filtered.filter(item => new Date(item.archived_at) >= cutoff)
    }

    return filtered
  }, [items, searchQuery, selectedSite, dateRange])

  const handleRestore = async (item: ArchiveItem) => {
    if (!item.can_restore) {
      alert('This item cannot be restored. Compliance archives are permanent.')
      return
    }

    if (!confirm(`Restore ${item.name}? This will make it active again.`)) {
      return
    }

    try {
      // Handle SOPs separately
      if (item.type === 'sops') {
        const { error } = await supabase
          .from('sop_entries')
          .update({
            status: 'Published',
            archived_at: null,
            archived_by: null
          })
          .eq('id', item.id)

        if (error) throw error
      }
      // Handle Risk Assessments
      else if (item.type === 'risk_assessments') {
        const { error } = await supabase
          .from('risk_assessments')
          .update({
            status: 'Draft',
            archived_at: null,
            archived_by: null
          })
          .eq('id', item.id)

        if (error) throw error
      }
      // Handle Documents
      else if (item.type === 'documents') {
        const { error } = await supabase
          .from('global_documents')
          .update({ is_archived: false })
          .eq('id', item.id)

        if (error) throw error
      } else {
        const tableMap = {
          assets: 'assets',
          tasks: 'tasks'
        }

        const table = tableMap[item.type as keyof typeof tableMap]

        const { error } = await supabase
          .from(table)
          .update({
            archived: false,
            archived_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id)

        if (error) throw error
      }

      // Refresh list
      await loadArchiveItems()

      alert(`${item.name} has been restored!`)
    } catch (err) {
      console.error('Error restoring item:', err)
      alert('Failed to restore item')
    }
  }

  const handleView = async (item: ArchiveItem) => {
    setSelectedItem(item)
  }

  const handleDownload = async (item: ArchiveItem) => {
    if (!item.file_path) {
      alert('No file available for download')
      return
    }

    try {
      const { data, error } = await supabase.storage
        .from('global-docs')
        .createSignedUrl(item.file_path, 60 * 60) // 1 hour

      if (error) throw error
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
      }
    } catch (err) {
      console.error('Error downloading file:', err)
      alert('Failed to download file')
    }
  }

  const getIcon = (type: ArchiveType) => {
    const tab = tabs.find(t => t.id === type)
    const IconComponent = tab?.icon || Archive
    return <IconComponent className={`w-5 h-5 ${tab?.color || 'text-neutral-600'} ${tab?.darkColor || 'dark:text-neutral-400'}`} />
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-gradient-to-br dark:from-neutral-950 dark:to-neutral-900 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Archive className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Archive Center</h1>
          </div>
          <p className="text-neutral-600 dark:text-neutral-400">
            View and manage all archived items from across Opsly
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-2 min-w-max pb-2">
            {tabs.filter(tab => tab.enabled).map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-white/[0.1] dark:text-white dark:border-white/[0.2]'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? `${tab.color} ${tab.darkColor}` : ''}`} />
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-neutral-200 dark:bg-white/[0.1]">
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-white/[0.03] rounded-lg p-4 mb-6 border border-neutral-200 dark:border-white/[0.06]">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search archives..."
                  className="w-full pl-10 pr-4 py-2 bg-neutral-50 dark:bg-white/[0.06] border border-neutral-200 dark:border-white/[0.1] rounded-lg text-neutral-900 dark:text-white text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Date Range */}
            <div>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-white/[0.06] border border-neutral-200 dark:border-white/[0.1] rounded-lg text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All time</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>

            {/* Site Filter */}
            <div>
              <select
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-white/[0.06] border border-neutral-200 dark:border-white/[0.1] rounded-lg text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All sites</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="bg-white dark:bg-white/[0.03] rounded-lg p-12 border border-neutral-200 dark:border-white/[0.06] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
              <p className="text-neutral-600 dark:text-neutral-400">Loading archives...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-500/10 rounded-lg p-6 border border-red-200 dark:border-red-500/30 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-800 dark:text-red-400 font-semibold mb-1">Error Loading Archives</h3>
              <p className="text-red-600 dark:text-red-400/80 text-sm">{error}</p>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-white/[0.03] rounded-lg p-12 border border-neutral-200 dark:border-white/[0.06] text-center">
            <Archive className="w-12 h-12 text-neutral-400 dark:text-neutral-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">No Archived Items</h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              {searchQuery
                ? 'No items match your search criteria'
                : `No archived ${tabs.find(t => t.id === activeTab)?.label.toLowerCase()} found`
              }
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-white/[0.03] rounded-lg border border-neutral-200 dark:border-white/[0.06] overflow-hidden">

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-neutral-50 dark:bg-white/[0.03] border-b border-neutral-200 dark:border-white/[0.06] text-sm font-medium text-neutral-600 dark:text-neutral-400">
              <div className="col-span-5">Name</div>
              <div className="col-span-2">Archived</div>
              <div className="col-span-2">By</div>
              <div className="col-span-1">Version</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-neutral-200 dark:divide-white/[0.06]">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-neutral-50 dark:hover:bg-white/[0.03] transition-colors"
                >
                  {/* Name & Details */}
                  <div className="col-span-5">
                    <div className="flex items-start gap-3">
                      {getIcon(item.type)}
                      <div className="flex-1 min-w-0">
                        <div className="text-neutral-900 dark:text-white font-medium truncate">{item.name}</div>
                        {item.category && (
                          <div className="text-xs text-neutral-500 mt-0.5">{item.category}</div>
                        )}
                        {item.changes_summary && (
                          <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2">
                            {item.changes_summary}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Archived Date */}
                  <div className="col-span-2 flex flex-col justify-center">
                    <div className="text-sm text-neutral-900 dark:text-white">
                      {new Date(item.archived_at).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {new Date(item.archived_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>

                  {/* Archived By */}
                  <div className="col-span-2 flex items-center">
                    <div className="text-sm text-neutral-700 dark:text-neutral-300">
                      {item.archived_by_name || 'Unknown'}
                    </div>
                  </div>

                  {/* Version */}
                  <div className="col-span-1 flex items-center">
                    {item.version && (
                      <span className="px-2 py-1 text-xs rounded bg-neutral-100 dark:bg-white/[0.06] text-neutral-700 dark:text-neutral-300">
                        {item.version}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleView(item)}
                      className="p-2 hover:bg-neutral-100 dark:hover:bg-white/[0.1] rounded-lg transition-colors"
                      title="View details"
                    >
                      <Eye className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                    </button>

                    {item.file_path && (
                      <button
                        onClick={() => handleDownload(item)}
                        className="p-2 hover:bg-neutral-100 dark:hover:bg-white/[0.1] rounded-lg transition-colors"
                        title="Download file"
                      >
                        <Download className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                      </button>
                    )}

                    {item.can_restore && (
                      <button
                        onClick={() => handleRestore(item)}
                        className="p-2 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-lg transition-colors"
                        title="Restore"
                      >
                        <RotateCcw className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Item count */}
        {filteredItems.length > 0 && (
          <div className="mt-4 text-center text-sm text-neutral-500">
            Showing {filteredItems.length} of {items.length} archived items
          </div>
        )}
      </div>

      {/* View Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gradient-to-br dark:from-neutral-900 dark:to-neutral-950 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-neutral-200 dark:border-white/[0.08]">
            <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-white/[0.08]">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{selectedItem.name}</h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-white/[0.1] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-neutral-500 mb-1">Type</div>
                  <div className="text-neutral-900 dark:text-white capitalize">{selectedItem.type.replace('_', ' ')}</div>
                </div>

                {selectedItem.version && (
                  <div>
                    <div className="text-sm text-neutral-500 mb-1">Version</div>
                    <div className="text-neutral-900 dark:text-white">{selectedItem.version}</div>
                  </div>
                )}

                {selectedItem.category && (
                  <div>
                    <div className="text-sm text-neutral-500 mb-1">Category</div>
                    <div className="text-neutral-900 dark:text-white">{selectedItem.category}</div>
                  </div>
                )}

                {selectedItem.changes_summary && (
                  <div>
                    <div className="text-sm text-neutral-500 mb-1">Changes</div>
                    <div className="text-neutral-900 dark:text-white">{selectedItem.changes_summary}</div>
                  </div>
                )}

                <div>
                  <div className="text-sm text-neutral-500 mb-1">Archived</div>
                  <div className="text-neutral-900 dark:text-white">
                    {new Date(selectedItem.archived_at).toLocaleString()}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-neutral-500 mb-1">Archived By</div>
                  <div className="text-neutral-900 dark:text-white">{selectedItem.archived_by_name || 'Unknown'}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-200 dark:border-white/[0.08]">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors"
              >
                Close
              </button>
              {selectedItem.can_restore && (
                <button
                  onClick={() => {
                    handleRestore(selectedItem)
                    setSelectedItem(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restore
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
