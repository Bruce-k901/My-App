import type { ModuleKey } from '@/config/module-colors'

export type CalendarModule = ModuleKey

export type CalendarEventType = 'shift' | 'compliance' | 'delivery' | 'task' | 'message' | 'leave'

export type CalendarViewMode = 'day' | 'week' | 'month'

export type EventStatus = 'confirmed' | 'pending' | 'overdue' | 'complete'

export type DetailTab = 'overview' | 'detail' | 'messages' | 'history'

/** Individual item inside an aggregate calendar event (e.g. one checklist task inside "12 checks") */
export interface CalendarEventChild {
  id: string
  title: string
  time?: string
  status?: EventStatus
  assignedTo?: string
  completedBy?: string    // who completed it
  completedAt?: string    // ISO timestamp of completion
}

export interface CalendarEvent {
  id: string
  type: CalendarEventType
  module: CalendarModule
  title: string
  subtitle?: string
  date: string           // ISO date YYYY-MM-DD
  startTime?: string     // HH:MM
  endTime?: string       // HH:MM
  allDay?: boolean
  status?: EventStatus
  assignedTo?: string
  location?: string
  linkedId?: string      // ID in the source module table
  linkedModule?: CalendarModule
  msglyThreadId?: string
  /** Individual items for aggregate cards (compliance summary, task summary, shift blocks) */
  children?: CalendarEventChild[]
}

/** Maps event types to their source module */
export const EVENT_TYPE_MODULE: Record<CalendarEventType, CalendarModule> = {
  shift: 'teamly',
  compliance: 'checkly',
  delivery: 'stockly',
  task: 'planly',
  message: 'msgly',
  leave: 'assetly',
}

/** Maps event types to display labels for filter pills */
export const EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  shift: 'Shifts',
  compliance: 'Compliance',
  delivery: 'Deliveries',
  task: 'Tasks',
  message: 'Messages',
  leave: 'Leave',
}

/** Maps event type to Phosphor icon name */
export const EVENT_TYPE_ICONS: Record<CalendarEventType, string> = {
  shift: 'Users',
  compliance: 'ClipboardText',
  delivery: 'Truck',
  task: 'CheckSquare',
  message: 'ChatCircle',
  leave: 'CalendarX',
}
