/**
 * Type Guards for Checklist System
 * Runtime type validation functions
 */

import {
  TaskStatus,
  TaskPriority,
  TaskCategory,
  TaskFrequency,
  FieldType,
  ContractorType,
  AuditCategory,
  ChecklistTask,
  TaskTemplate
} from './checklist'

/**
 * Type guard: Is this value a valid TaskStatus?
 */
export function isTaskStatus(value: any): value is TaskStatus {
  return Object.values(TaskStatus).includes(value)
}

/**
 * Type guard: Is this value a valid TaskPriority?
 */
export function isTaskPriority(value: any): value is TaskPriority {
  return Object.values(TaskPriority).includes(value)
}

/**
 * Type guard: Is this value a valid TaskCategory?
 */
export function isTaskCategory(value: any): value is TaskCategory {
  return Object.values(TaskCategory).includes(value)
}

/**
 * Type guard: Is this value a valid TaskFrequency?
 */
export function isTaskFrequency(value: any): value is TaskFrequency {
  return Object.values(TaskFrequency).includes(value)
}

/**
 * Type guard: Is this value a valid FieldType?
 */
export function isFieldType(value: any): value is FieldType {
  return Object.values(FieldType).includes(value)
}

/**
 * Type guard: Is this value a valid ContractorType?
 */
export function isContractorType(value: any): value is ContractorType {
  return Object.values(ContractorType).includes(value)
}

/**
 * Type guard: Is task overdue?
 */
export function isTaskOverdue(task: ChecklistTask): boolean {
  if (task.status === 'completed' || task.status === 'skipped') {
    return false
  }
  const now = new Date()
  if (task.due_time) {
    return now > new Date(`${task.due_date}T${task.due_time}`)
  }
  return task.due_date < now.toISOString().split('T')[0]
}

/**
 * Type guard: Is task critical?
 */
export function isTaskCritical(task: ChecklistTask): boolean {
  return task.priority === TaskPriority.CRITICAL
}

/**
 * Type guard: Has task been started?
 */
export function isTaskStarted(task: ChecklistTask): boolean {
  return task.status === TaskStatus.IN_PROGRESS
}

/**
 * Type guard: Can task still be edited?
 */
export function canEditTask(task: ChecklistTask): boolean {
  return [TaskStatus.PENDING, TaskStatus.IN_PROGRESS].includes(task.status as TaskStatus)
}

/**
 * Type guard: Is template a repeatable type?
 */
export function hasRepeatableField(template: TaskTemplate): boolean {
  return template.repeatable_field_name !== null && template.repeatable_field_name !== undefined
}

/**
 * Type guard: Does template require photos?
 */
export function requiresPhotos(template: TaskTemplate): boolean {
  return template.evidence_types?.includes('photo') || false
}

/**
 * Type guard: Is template critical compliance?
 */
export function isCriticalCompliance(template: TaskTemplate): boolean {
  return template.is_critical || false
}

/**
 * Type guard: Can task be completed?
 */
export function canCompleteTask(task: ChecklistTask): boolean {
  return [TaskStatus.PENDING, TaskStatus.IN_PROGRESS].includes(task.status as TaskStatus)
}

/**
 * Type guard: Should task trigger contractor notification?
 */
export function shouldNotifyContractor(task: ChecklistTask): boolean {
  return task.contractor_notify_on_fail && task.status === TaskStatus.FAILED
}

/**
 * Type guard: Is task scheduled for today?
 */
export function isTaskScheduledToday(task: ChecklistTask): boolean {
  const today = new Date().toISOString().split('T')[0]
  return task.due_date === today
}

/**
 * Type guard: Is task overdue based on due_time?
 */
export function isTaskOverdueNow(task: ChecklistTask): boolean {
  if (task.status === 'completed' || task.status === 'skipped') {
    return false
  }
  
  const now = new Date()
  const dueDate = new Date(task.due_date)
  
  if (task.due_time) {
    const [hours, minutes] = task.due_time.split(':').map(Number)
    dueDate.setHours(hours, minutes, 0, 0)
  }
  
  return now > dueDate
}

