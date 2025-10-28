'use client'

import { useEffect, useState } from 'react'
import { Search, Plus, Settings, Info, ArrowRight, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { TaskTemplate, TaskCategory, LABELS } from '@/types/checklist-types'
import TemplateDetailModal from '@/components/checklists/TemplateDetailModal'
import CloneTemplateDialog from '@/components/checklists/CloneTemplateDialog'

// Category color mapping for left borders
const CATEGORY_COLORS = {
  food_safety: 'border-emerald-500',
  health_and_safety: 'border-blue-500', 
  fire: 'border-amber-500',
  cleaning: 'border-purple-500',
  compliance: 'border-pink-500'
}

// Frequency labels
const FREQUENCY_LABELS = {
  daily: 'Daily',
  weekly: 'Weekly', 
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
  triggered: 'Triggered',
  once: 'One-time'
}

// Category labels
const CATEGORY_LABELS = {
  food_safety: 'Food Safety',
  health_and_safety: 'Health & Safety',
  fire: 'Fire & Security', 
  cleaning: 'Cleaning & Maintenance',
  compliance: 'Compliance & Audit'
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<TaskTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showClone, setShowClone] = useState(false)

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates()
  }, [])

  // Filter templates when search or category changes
  useEffect(() => {
    let filtered = templates

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory)
    }

    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredTemplates(filtered)
  }, [templates, searchTerm, selectedCategory])

  async function fetchTemplates() {
    try {
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .eq('is_template_library', true)
        .eq('is_active', true)
        .order('category')
        .order('name')

      if (error) {
        console.error('Database error:', error)
        // If table doesn't exist, use empty mock data - no hardcoded tasks
        setTemplates([])
        return
      }
      setTemplates(data || [])
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-2">
            Task Templates
          </h1>
          <p className="text-neutral-400 mt-1">Pre-built compliance templates ready to deploy</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/dashboard/checklists/templates/card1"
            className="px-4 py-2 bg-gradient-to-r from-pink-600/70 to-blue-600/70 text-white rounded-lg hover:shadow-lg hover:shadow-pink-500/30 transition-all text-sm"
          >
            Card 1 Config
          </a>
          <button className="px-4 py-2 bg-gradient-to-r from-pink-600/70 to-blue-600/70 text-white rounded-lg hover:shadow-lg hover:shadow-pink-500/30 transition-all">
            <Plus className="inline mr-2 h-4 w-4" />
            Create Template
          </button>
        </div>
      </div>

      {/* Search & Filter - Horizontal Layout */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-pink-400"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-pink-400"
        >
          <option value="all">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select className="px-4 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-pink-400">
          <option>A-Z</option>
          <option>Most Used</option>
          <option>Most Critical</option>
        </select>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12 text-neutral-400">
          Loading templates...
        </div>
      )}

      {/* Templates Grid - 3 Column Layout */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => (
            <div
              key={template.id}
              onClick={() => {
                setSelectedTemplate(template)
                setShowDetail(true)
              }}
              className={`group bg-neutral-800/50 backdrop-blur-sm border-l-2 ${CATEGORY_COLORS[template.category as keyof typeof CATEGORY_COLORS] || 'border-neutral-600'} border-r border-t border-b border-neutral-700 rounded-lg p-4 hover:border-neutral-600 transition-all cursor-pointer h-[90px] flex flex-col justify-between`}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-sm truncate">
                    {template.name}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1 truncate">
                    {template.description}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <span className="text-xs text-neutral-500 uppercase font-medium">
                    {FREQUENCY_LABELS[template.frequency as keyof typeof FREQUENCY_LABELS] || template.frequency}
                  </span>
                  {template.is_critical && (
                    <span className="text-xs text-pink-500 font-medium ml-1">
                      ⚠️ CRIT
                    </span>
                  )}
                </div>
              </div>

              {/* Footer - Actions */}
              <div className="flex items-center justify-between mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      // TODO: Open settings
                    }}
                    className="p-1 text-neutral-400 hover:text-white transition-colors"
                  >
                    <Settings className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      // TODO: Open info
                    }}
                    className="p-1 text-neutral-400 hover:text-white transition-colors"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex items-center text-xs text-neutral-400 group-hover:text-pink-400 transition-colors">
                  Use Template
                  <ArrowRight className="h-3 w-3 ml-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {selectedTemplate && (
        <>
          {showDetail && (
            <TemplateDetailModal
              template={selectedTemplate}
              isOpen={showDetail}
              onClose={() => setShowDetail(false)}
              onClone={() => {
                setShowDetail(false)
                setShowClone(true)
              }}
            />
          )}
          {showClone && (
            <CloneTemplateDialog
              template={selectedTemplate}
              isOpen={showClone}
              onClose={() => setShowClone(false)}
              onSuccess={() => {
                setShowClone(false)
                // Refresh or navigate to edit page
              }}
            />
          )}
        </>
      )}
    </div>
  )
}
