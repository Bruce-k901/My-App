import { getTemplateBySlug } from '@/data/compliance-templates'
import type { TaskTemplate } from '@/types/checklist'

type WorkflowMeta = {
  workflowType?: string
  workflowConfig?: Record<string, any> | null
}

type TemplateLike = Partial<TaskTemplate> & WorkflowMeta & {
  recurrence_pattern?: any
  slug?: string | null
}

function extractWorkflowFromRecurrence(recurrence: any): WorkflowMeta {
  if (!recurrence || typeof recurrence !== 'object') {
    return {}
  }

  const workflowContainer =
    recurrence.__workflow ||
    recurrence.workflow ||
    recurrence.workflowConfig ||
    null

  if (workflowContainer && typeof workflowContainer === 'object') {
    const type = workflowContainer.type || workflowContainer.workflowType
    const config = workflowContainer.config || workflowContainer.workflowConfig
    return {
      workflowType: type ?? undefined,
      workflowConfig: config ?? undefined,
    }
  }

  const type = recurrence.workflowType as string | undefined
  const config = recurrence.workflowConfig as WorkflowMeta['workflowConfig']

  return {
    workflowType: type ?? undefined,
    workflowConfig: config ?? undefined,
  }
}

export function enrichTemplateWithDefinition<T extends TemplateLike | null | undefined>(
  template: T,
): T {
  if (!template) {
    return template
  }

  const recurrence = template.recurrence_pattern
  const recurrenceWorkflow = extractWorkflowFromRecurrence(recurrence)

  let workflowType = template.workflowType ?? recurrenceWorkflow.workflowType
  let workflowConfig = template.workflowConfig ?? recurrenceWorkflow.workflowConfig

  const definition = template.slug ? getTemplateBySlug(template.slug) : null

  if (definition) {
    workflowType = workflowType ?? definition.workflowType
    workflowConfig = workflowConfig ?? definition.workflowConfig
  }

  if (!definition && !workflowType && !workflowConfig) {
    return template
  }

  const merged = {
    ...(definition ? { ...definition } : {}),
    ...template,
    workflowType,
    workflowConfig,
  }

  return merged as T
}
