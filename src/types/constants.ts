/**
 * Constants, Labels, Colors, and Icons for Checklist System
 * UI mappings and defaults
 */

import {
  TaskCategory,
  TaskFrequency,
  TaskStatus,
  TaskPriority,
  FieldType,
  ContractorType,
  AuditCategory
} from './checklist'

/**
 * Human-readable labels for enums
 */
export const LABELS = {
  category: {
    [TaskCategory.FOOD_SAFETY]: 'Food Safety',
    [TaskCategory.HEALTH_AND_SAFETY]: 'Health & Safety',
    [TaskCategory.FIRE]: 'Fire & Security',
    [TaskCategory.CLEANING]: 'Cleaning & Maintenance',
    [TaskCategory.COMPLIANCE]: 'Compliance & Audit'
  },
  frequency: {
    [TaskFrequency.DAILY]: 'Daily',
    [TaskFrequency.WEEKLY]: 'Weekly',
    [TaskFrequency.MONTHLY]: 'Monthly',
    [TaskFrequency.QUARTERLY]: 'Quarterly',
    [TaskFrequency.ANNUALLY]: 'Annually',
    [TaskFrequency.TRIGGERED]: 'Triggered',
    [TaskFrequency.ONCE]: 'One-time'
  },
  status: {
    [TaskStatus.PENDING]: 'Pending',
    [TaskStatus.IN_PROGRESS]: 'In Progress',
    [TaskStatus.COMPLETED]: 'Completed',
    [TaskStatus.SKIPPED]: 'Skipped',
    [TaskStatus.FAILED]: 'Failed',
    [TaskStatus.OVERDUE]: 'Overdue'
  },
  priority: {
    [TaskPriority.LOW]: 'Low',
    [TaskPriority.MEDIUM]: 'Medium',
    [TaskPriority.HIGH]: 'High',
    [TaskPriority.CRITICAL]: 'Critical'
  },
  fieldType: {
    [FieldType.TEXT]: 'Text',
    [FieldType.NUMBER]: 'Number',
    [FieldType.SELECT]: 'Dropdown',
    [FieldType.REPEATABLE_RECORD]: 'Multiple Records',
    [FieldType.PHOTO]: 'Photo',
    [FieldType.PASS_FAIL]: 'Pass/Fail',
    [FieldType.SIGNATURE]: 'Signature',
    [FieldType.DATE]: 'Date',
    [FieldType.TIME]: 'Time'
  },
  contractorType: {
    [ContractorType.PEST_CONTROL]: 'Pest Control',
    [ContractorType.FIRE_ENGINEER]: 'Fire Engineer',
    [ContractorType.EQUIPMENT_REPAIR]: 'Equipment Repair',
    [ContractorType.HVAC]: 'HVAC',
    [ContractorType.PLUMBING]: 'Plumbing'
  },
  auditCategory: {
    [AuditCategory.FOOD_SAFETY]: 'Food Safety',
    [AuditCategory.ALLERGEN]: 'Allergen',
    [AuditCategory.HEALTH_AND_SAFETY]: 'Health & Safety',
    [AuditCategory.FIRE]: 'Fire',
    [AuditCategory.CLEANLINESS]: 'Cleanliness',
    [AuditCategory.COMPLIANCE]: 'Compliance',
    [AuditCategory.MAINTENANCE]: 'Maintenance'
  }
}

/**
 * Color mappings for UI (matches your theme: magenta-400 accents, neutral-900 bg)
 */
export const COLORS = {
  category: {
    [TaskCategory.FOOD_SAFETY]: 'from-red-600/20 to-orange-600/20',
    [TaskCategory.HEALTH_AND_SAFETY]: 'from-blue-600/20 to-cyan-600/20',
    [TaskCategory.FIRE]: 'from-red-600/20 to-yellow-600/20',
    [TaskCategory.CLEANING]: 'from-green-600/20 to-emerald-600/20',
    [TaskCategory.COMPLIANCE]: 'from-purple-600/20 to-magenta-600/20'
  },
  priority: {
    [TaskPriority.LOW]: 'text-gray-400',
    [TaskPriority.MEDIUM]: 'text-blue-400',
    [TaskPriority.HIGH]: 'text-orange-400',
    [TaskPriority.CRITICAL]: 'text-red-500'
  },
  status: {
    [TaskStatus.PENDING]: 'bg-neutral-700/50',
    [TaskStatus.IN_PROGRESS]: 'bg-blue-600/20',
    [TaskStatus.COMPLETED]: 'bg-green-600/20',
    [TaskStatus.SKIPPED]: 'bg-gray-600/20',
    [TaskStatus.FAILED]: 'bg-red-600/20',
    [TaskStatus.OVERDUE]: 'bg-red-600/30'
  }
}

/**
 * Icons for different task statuses (using Lucide icons)
 */
export const ICONS = {
  status: {
    [TaskStatus.PENDING]: 'Clock',
    [TaskStatus.IN_PROGRESS]: 'Play',
    [TaskStatus.COMPLETED]: 'CheckCircle2',
    [TaskStatus.SKIPPED]: 'SkipForward',
    [TaskStatus.FAILED]: 'AlertCircle',
    [TaskStatus.OVERDUE]: 'AlertTriangle'
  },
  category: {
    [TaskCategory.FOOD_SAFETY]: 'Utensils',
    [TaskCategory.HEALTH_AND_SAFETY]: 'ShieldAlert',
    [TaskCategory.FIRE]: 'Flame',
    [TaskCategory.CLEANING]: 'Sparkles',
    [TaskCategory.COMPLIANCE]: 'ClipboardCheck'
  }
}

/**
 * Default values for forms
 */
export const DEFAULTS = {
  frequency: TaskFrequency.DAILY,
  priority: TaskPriority.MEDIUM,
  status: TaskStatus.PENDING,
  daypart: 'before_open',
  fieldType: FieldType.TEXT
}

/**
 * Validation rules
 */
export const VALIDATION = {
  templateName: {
    minLength: 3,
    maxLength: 100
  },
  templateSlug: {
    pattern: /^[a-z0-9_-]+$/,
    minLength: 3,
    maxLength: 50
  },
  temperature: {
    minValue: -20,
    maxValue: 100
  }
}

/**
 * Daypart options
 */
export const DAYPARTS = [
  { value: 'before_open', label: 'Before Open' },
  { value: 'during_service', label: 'During Service' },
  { value: 'after_service', label: 'After Service' },
  { value: 'anytime', label: 'Anytime' }
]

/**
 * Common compliance standards
 */
export const COMPLIANCE_STANDARDS = [
  'Food Safety Act 1990',
  'HACCP',
  "Natasha's Law",
  'Cook Safe',
  'Health & Safety at Work Act 1974',
  'RIDDOR',
  'Manual Handling Regulations',
  'Fire Safety Order 2005',
  'Regulatory Reform (Fire Safety) Order 2005',
  'Environmental Health'
]

