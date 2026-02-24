'use client'

import { useEffect, useState } from 'react'
import { Search, Plus, Settings, Info, ArrowRight, AlertCircle, Trash2 } from '@/components/ui/icons'
import { supabase } from '@/lib/supabase'
import { TaskTemplate, TaskCategory, LABELS } from '@/types/checklist-types'
import { toast } from 'sonner'

// Category color mapping for left borders
const CATEGORY_COLORS = {
  food_safety: 'border-emerald-500',
  health_and_safety: 'border-blue-500', 
  fire: 'border-amber-500',
  cleaning: 'border-purple-500',
  compliance: 'border-module-fg'
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
const CATEGORY_LABELS: Record<string, string> = {
  food_safety: 'Food Safety',
  health_and_safety: 'Health & Safety',
  health_safety: 'Health & Safety',
  h_and_s: 'Health & Safety',
  fire: 'Fire & Security',
  fire_safety: 'Fire Safety',
  cleaning: 'Cleaning & Maintenance',
  cleaning_premises: 'Cleaning & Premises',
  handling_storage: 'Handling & Storage',
  welfare_first_aid: 'Welfare & First Aid',
  personal_hygiene: 'Personal Hygiene',
  policy_organisation: 'Policy & Organisation',
  risk_assessment: 'Risk Assessment',
  compliance: 'Compliance & Audit',
  salsa: 'SALSA',
}

type TemplateWithUsage = TaskTemplate & {
  usage_count?: number
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateWithUsage[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<TemplateWithUsage[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showClone, setShowClone] = useState(false)
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null)

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
      // Get current user's profile to get company_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user logged in');
        setTemplates([]);
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.company_id) {
        console.error('Error fetching profile or no company_id:', profileError);
        setTemplates([]);
        setLoading(false);
        return;
      }

      // Fetch user-created templates (not library templates) for this company
      const { data: templatesData, error: templatesError } = await supabase
        .from('task_templates')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('is_template_library', false) // User-created templates, not library templates
        .eq('is_active', true)
        .order('name')
      
      if (templatesError) {
        console.error('Error fetching templates:', templatesError)
        setTemplates([])
        return
      }
      
      // Fetch usage counts separately (count how many tasks were created from each template)
      const templateIds = (templatesData || []).map(t => t.id)
      const usageCounts = new Map<string, number>()
      
      if (templateIds.length > 0) {
        const { data: usageData } = await supabase
          .from('checklist_tasks')
          .select('template_id')
          .in('template_id', templateIds)
        
        if (usageData) {
          usageData.forEach(task => {
            if (task.template_id) {
              usageCounts.set(task.template_id, (usageCounts.get(task.template_id) || 0) + 1)
            }
          })
        }
      }
      
      // Combine templates with their usage counts
      const templatesWithUsage = (templatesData || []).map(t => ({
        ...t,
        usage_count: usageCounts.get(t.id) || 0
      }))
      
      setTemplates(templatesWithUsage)
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteTemplate(templateId: string, e: React.MouseEvent) {
    e.stopPropagation() // Prevent card click
    
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return
    }

    setDeletingTemplateId(templateId)
    
    try {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('task_templates')
        .update({ is_active: false })
        .eq('id', templateId)

      if (error) {
        toast.error('Failed to delete template: ' + error.message)
        return
      }

      toast.success('Template deleted successfully')
      // Refresh templates list
      fetchTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error('Failed to delete template')
    } finally {
      setDeletingTemplateId(null)
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
          <p className="text-theme-tertiary mt-1">Pre-built compliance templates ready to deploy</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/dashboard/checklists/templates/card1"
            className="px-4 py-2 bg-gradient-to-r from-module-fg/[0.70] to-assetly-dark/70 text-white rounded-lg hover:shadow-lg hover:shadow-module-fg/[0.30] transition-all text-sm"
          >
            Card 1 Config
          </a>
          <button className="px-4 py-2 bg-gradient-to-r from-module-fg/[0.70] to-assetly-dark/70 text-white rounded-lg hover:shadow-lg hover:shadow-module-fg/[0.30] transition-all">
            <Plus className="inline mr-2 h-4 w-4" />
            Create Template
          </button>
        </div>
      </div>

      {/* Search & Filter - Horizontal Layout */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-theme-tertiary" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral-800/50 border border-theme rounded-lg text-theme-primary placeholder-neutral-500 focus:outline-none focus:border-module-fg"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="pl-4 pr-10 py-2 bg-neutral-800/50 border border-theme rounded-lg text-theme-primary focus:outline-none focus:border-module-fg"
        >
          <option value="all">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select className="pl-4 pr-10 py-2 bg-neutral-800/50 border border-theme rounded-lg text-theme-primary focus:outline-none focus:border-module-fg">
          <option>A-Z</option>
          <option>Most Used</option>
          <option>Most Critical</option>
        </select>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12 text-theme-tertiary">
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
              className="group bg-neutral-800/50 backdrop-blur-sm border border-theme rounded-lg p-4 hover:border-neutral-600 transition-all cursor-pointer min-h-[90px] flex flex-col justify-between"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-theme-primary text-sm truncate">
                    {template.name}
                  </h3>
                  <p className="text-xs text-theme-tertiary mt-1 truncate">
                    {template.description}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                  <span className="text-xs text-theme-tertiary uppercase font-medium">
                    {FREQUENCY_LABELS[template.frequency as keyof typeof FREQUENCY_LABELS] || template.frequency}
                  </span>
                  {template.is_critical && (
                    <span className="text-xs text-module-fg font-medium ml-1">
                      ⚠️ CRIT
                    </span>
                  )}
                </div>
              </div>

              {/* Usage Count Tag */}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Used {template.usage_count || 0} {template.usage_count === 1 ? 'time' : 'times'}
                </span>
              </div>

              {/* Footer - Actions */}
              <div className="flex items-center justify-between mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      // TODO: Open settings
                    }}
                    className="p-1 text-theme-tertiary hover:text-white transition-colors"
                    title="Settings"
                  >
                    <Settings className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      // TODO: Open info
                    }}
                    className="p-1 text-theme-tertiary hover:text-white transition-colors"
                    title="Info"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteTemplate(template.id, e)}
                    disabled={deletingTemplateId === template.id}
                    className="p-1 text-theme-tertiary hover:text-red-400 transition-colors disabled:opacity-50"
                    title="Delete template"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex items-center text-xs text-theme-tertiary group-hover:text-module-fg transition-colors">
                  Use Template
                  <ArrowRight className="h-3 w-3 ml-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals - Removed: Components deleted as part of tasks restart */}
      {/* Template Detail Modal and Clone Dialog functionality removed */}
    </div>
  )
}
