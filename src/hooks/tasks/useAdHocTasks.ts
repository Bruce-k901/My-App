// ============================================================================
// useAdHocTasks Hook
// Fetches triggered (ad hoc) site_checklists, templates, and completion counts.
// Provides startAdHocTask() to create a task instance and return it for the
// completion modal.
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { enrichTemplateWithDefinition } from '@/lib/templates/enrich-template'
import type { ChecklistTaskWithTemplate } from '@/types/checklist-types'

export interface AdHocTemplate {
  siteChecklist: {
    id: string
    site_id: string
    company_id: string
    template_id: string
    name: string
    frequency: string
    active: boolean
    equipment_config: any
    daypart_times: any
  }
  template: any // enriched TaskTemplate with fields
  completionsToday: number
}

interface UseAdHocTasksResult {
  adHocTemplates: AdHocTemplate[]
  loading: boolean
  startAdHocTask: (adHocTemplate: AdHocTemplate) => Promise<ChecklistTaskWithTemplate | null>
  refreshCompletionCounts: () => Promise<void>
}

export function useAdHocTasks(
  companyId: string | null,
  siteId: string | null | undefined,
  selectedSiteId: string | null | undefined
): UseAdHocTasksResult {
  const [adHocTemplates, setAdHocTemplates] = useState<AdHocTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const templatesCacheRef = useRef<AdHocTemplate[]>([])

  // Determine effective site filter (same logic as fetchTodaysTasks)
  const getFilterSiteId = useCallback(async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, app_role, home_site')
      .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
      .maybeSingle()

    if (!profile) return null

    const managerRoles = ['manager', 'general_manager', 'admin', 'owner']
    const isManager = profile.app_role && managerRoles.includes(profile.app_role.toLowerCase())

    if (isManager) {
      return (selectedSiteId && selectedSiteId !== 'all') ? selectedSiteId : null
    }
    return profile.home_site || null
  }, [selectedSiteId])

  // Fetch ad hoc templates
  const fetchAdHocTemplates = useCallback(async () => {
    if (!companyId) {
      setAdHocTemplates([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const filterSiteId = await getFilterSiteId()

      // 1. Fetch triggered site_checklists with templates
      let query = supabase
        .from('site_checklists')
        .select(`
          id, site_id, company_id, template_id, name, frequency, active,
          equipment_config, daypart_times,
          task_templates (
            id, name, slug, description, category, frequency, compliance_standard, is_critical,
            evidence_types, repeatable_field_name, instructions, dayparts, recurrence_pattern,
            asset_id, time_of_day,
            template_fields (*)
          )
        `)
        .eq('frequency', 'triggered')
        .eq('active', true)
        .eq('company_id', companyId)

      if (filterSiteId) {
        query = query.eq('site_id', filterSiteId)
      }

      const { data: siteChecklists, error } = await query

      if (error) {
        console.error('Failed to fetch ad hoc templates:', error)
        setAdHocTemplates([])
        setLoading(false)
        return
      }

      if (!siteChecklists || siteChecklists.length === 0) {
        setAdHocTemplates([])
        setLoading(false)
        return
      }

      // 2. Enrich templates and build list
      const todayStr = new Date().toISOString().split('T')[0]
      const templateIds = siteChecklists
        .map(sc => sc.template_id)
        .filter((id): id is string => !!id)

      // 3. Count today's completions per template
      let completionCounts: Record<string, number> = {}
      if (templateIds.length > 0) {
        let countQuery = supabase
          .from('checklist_tasks')
          .select('template_id')
          .eq('company_id', companyId)
          .eq('status', 'completed')
          .eq('due_date', todayStr)
          .in('template_id', templateIds)

        if (filterSiteId) {
          countQuery = countQuery.eq('site_id', filterSiteId)
        }

        const { data: completedTasks } = await countQuery

        if (completedTasks) {
          completionCounts = completedTasks.reduce((acc: Record<string, number>, task: any) => {
            acc[task.template_id] = (acc[task.template_id] || 0) + 1
            return acc
          }, {})
        }
      }

      // 4. Build AdHocTemplate list
      const templates: AdHocTemplate[] = siteChecklists
        .filter(sc => sc.task_templates) // must have a linked template
        .map(sc => {
          const rawTemplate = sc.task_templates as any
          const enriched = enrichTemplateWithDefinition({
            ...rawTemplate,
            fields: rawTemplate.template_fields || [],
          })

          return {
            siteChecklist: {
              id: sc.id,
              site_id: sc.site_id,
              company_id: sc.company_id,
              template_id: sc.template_id,
              name: sc.name,
              frequency: sc.frequency,
              active: sc.active,
              equipment_config: sc.equipment_config,
              daypart_times: sc.daypart_times,
            },
            template: enriched,
            completionsToday: completionCounts[sc.template_id] || 0,
          }
        })

      templatesCacheRef.current = templates
      setAdHocTemplates(templates)
    } catch (err) {
      console.error('Error in useAdHocTasks:', err)
      setAdHocTemplates([])
    } finally {
      setLoading(false)
    }
  }, [companyId, getFilterSiteId])

  // Refresh only completion counts (cheaper than full refetch)
  const refreshCompletionCounts = useCallback(async () => {
    if (!companyId || templatesCacheRef.current.length === 0) return

    const filterSiteId = await getFilterSiteId()
    const todayStr = new Date().toISOString().split('T')[0]
    const templateIds = templatesCacheRef.current.map(t => t.siteChecklist.template_id)

    let countQuery = supabase
      .from('checklist_tasks')
      .select('template_id')
      .eq('company_id', companyId)
      .eq('status', 'completed')
      .eq('due_date', todayStr)
      .in('template_id', templateIds)

    if (filterSiteId) {
      countQuery = countQuery.eq('site_id', filterSiteId)
    }

    const { data: completedTasks } = await countQuery

    const counts: Record<string, number> = {}
    if (completedTasks) {
      completedTasks.forEach((task: any) => {
        counts[task.template_id] = (counts[task.template_id] || 0) + 1
      })
    }

    const updated = templatesCacheRef.current.map(t => ({
      ...t,
      completionsToday: counts[t.siteChecklist.template_id] || 0,
    }))

    templatesCacheRef.current = updated
    setAdHocTemplates(updated)
  }, [companyId, getFilterSiteId])

  // Start an ad hoc task: insert into checklist_tasks and return with template
  const startAdHocTask = useCallback(async (
    adHocTemplate: AdHocTemplate
  ): Promise<ChecklistTaskWithTemplate | null> => {
    if (!companyId) return null

    const { siteChecklist, template } = adHocTemplate
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5) // HH:MM

    // Build task_data from site_checklist config + template recurrence_pattern
    const equipmentConfig = siteChecklist.equipment_config || {}
    const recurrencePattern = template.recurrence_pattern || {}

    const taskData: Record<string, any> = {
      source_type: 'ad_hoc',
    }

    // Copy equipment/asset config if present
    if (equipmentConfig.selectedAssets) {
      taskData.selectedAssets = equipmentConfig.selectedAssets
    }
    if (equipmentConfig.equipment_config) {
      taskData.equipment_config = equipmentConfig.equipment_config
    }

    // Copy checklist items from template defaults
    if (recurrencePattern.default_checklist_items) {
      taskData.checklistItems = recurrencePattern.default_checklist_items
    }
    if (recurrencePattern.default_yes_no_items) {
      taskData.yesNoChecklistItems = recurrencePattern.default_yes_no_items
    }

    const { data: createdTask, error } = await supabase
      .from('checklist_tasks')
      .insert({
        template_id: siteChecklist.template_id,
        company_id: companyId,
        site_id: siteChecklist.site_id,
        site_checklist_id: siteChecklist.id,
        custom_name: siteChecklist.name || template.name,
        due_date: todayStr,
        due_time: currentTime,
        status: 'pending',
        priority: 'medium',
        task_data: taskData,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create ad hoc task:', error)
      throw error
    }

    // Attach template data to match ChecklistTaskWithTemplate shape
    const taskWithTemplate: ChecklistTaskWithTemplate = {
      ...createdTask,
      template: {
        ...template,
        fields: template.template_fields || template.fields || [],
      },
    }

    return taskWithTemplate
  }, [companyId])

  // Fetch on mount and when deps change
  useEffect(() => {
    fetchAdHocTemplates()
  }, [fetchAdHocTemplates])

  return {
    adHocTemplates,
    loading,
    startAdHocTask,
    refreshCompletionCounts,
  }
}
