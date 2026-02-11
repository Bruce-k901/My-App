'use client'

// ============================================================================
// TaskCompletionModal - Smart Router for Task Types
// ============================================================================
//
// PART A: User-Built Templates (Master Template Builder)
//   - Routes to TaskCompletionModalNew which dynamically renders UI based on
//     evidence_types selected in the template builder (temperature, checklist,
//     photo, signature, pass_fail, etc.)
//
// PART B: Pre-Built Compliance Templates (Specialized Forms)
//   - PPM Tasks -> PPMServicePanel (Log Service, Contact Contractor, etc.)
//   - PPM Follow-up Tasks -> PPMFollowupModal (after callout placed)
//   - Certificate Tasks -> CertificateTaskModal (update expiry date)
//   - Document Tasks -> DocumentReviewModal (upload new version or update expiry)
//   - SOP Review Tasks -> SOPReviewModal (confirm review, set next review date)
//   - RA Review Tasks -> RAReviewModal (confirm review, flag for updates)
//   - Callout Tasks -> CalloutTaskModal (update status, close callout)
//
// ============================================================================

import { TaskCompletionModalNew } from '@/components/tasks/TaskCompletionModalNew'
import PPMServicePanel from '@/components/compliance/PPMServicePanel'
import PPMFollowupModal from '@/components/ppm/PPMFollowupModal'
import CertificateTaskModal from '@/components/training/CertificateTaskModal'
import DocumentReviewModal from '@/components/documents/DocumentReviewModal'
import SOPReviewModal from '@/components/compliance/SOPReviewModal'
import RAReviewModal from '@/components/compliance/RAReviewModal'
import CalloutTaskModal from '@/components/compliance/CalloutTaskModal'
import type { ChecklistTaskWithTemplate } from '@/types/checklist-types'

interface TaskCompletionModalProps {
  task: ChecklistTaskWithTemplate
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  onMonitoringTaskCreated?: () => void
}

// ============================================================================
// Task Type Detection Functions
// ============================================================================
// PRIORITY ORDER:
// 1. Pre-built compliance templates (PPM, Certificate, Document, SOP, RA, Callout) - source_type driven
// 2. User-built templates - render based on evidence_types (dynamic features)
// ============================================================================

type TaskType =
  | 'ppm'
  | 'ppm_followup'
  | 'certificate'
  | 'document_expiry'
  | 'sop_review'
  | 'ra_review'
  | 'callout'
  | 'user_template'

function getTaskType(task: ChecklistTaskWithTemplate): TaskType {
  // PRIORITY 1: Check for specialized compliance tasks (source_type driven)
  // These are system-generated tasks that need specific workflows

  // PPM Tasks
  if (isPPMTask(task)) {
    return 'ppm'
  }

  // PPM Follow-up Tasks (after callout has been placed)
  if (isPPMFollowupTask(task)) {
    return 'ppm_followup'
  }

  // Certificate Tasks
  if (isCertificateTask(task)) {
    return 'certificate'
  }

  // Document Expiry Tasks
  if (isDocumentExpiryTask(task)) {
    return 'document_expiry'
  }

  // SOP Review Tasks
  if (isSOPReviewTask(task)) {
    return 'sop_review'
  }

  // RA Review Tasks
  if (isRAReviewTask(task)) {
    return 'ra_review'
  }

  // Callout Follow-up Tasks
  if (isCalloutTask(task)) {
    return 'callout'
  }

  // PRIORITY 2: User-built templates - render based on enabled features
  // This handles ALL templates created via Master Template Builder
  return 'user_template'
}

// PPM (Planned Preventive Maintenance) Tasks
function isPPMTask(task: ChecklistTaskWithTemplate): boolean {
  const taskData = task.task_data as Record<string, any> | null
  const sourceType = taskData?.source_type
  const taskType = taskData?.task_type

  return (
    sourceType === 'ppm_overdue' ||
    sourceType === 'ppm_no_schedule' ||
    sourceType === 'ppm_service_due' ||
    sourceType === 'ppm_service_overdue' ||
    taskType === 'ppm_service_due' ||
    taskType === 'ppm_service_overdue' ||
    taskType === 'ppm_no_schedule' ||
    task.template?.slug === 'ppm-overdue'
  )
}

// PPM Follow-up Tasks (after callout has been placed)
function isPPMFollowupTask(task: ChecklistTaskWithTemplate): boolean {
  const taskData = task.task_data as Record<string, any> | null
  return taskData?.source_type === 'ppm_followup'
}

// Certificate Expiry Tasks
function isCertificateTask(task: ChecklistTaskWithTemplate): boolean {
  const taskData = task.task_data as Record<string, any> | null
  const sourceType = taskData?.source_type

  return (
    sourceType === 'certificate_expiry' ||      // Matches database (profile-based certs)
    sourceType === 'certificate_no_expiry' ||   // Matches database
    sourceType === 'training_certificate' ||    // Matches database (training_records-based)
    sourceType === 'certificate_expiring' ||    // Backward compatibility
    sourceType === 'certificate_expired' ||     // Backward compatibility
    task.template?.slug === 'certificate-renewal' ||
    task.template?.slug === 'certificate-renewal-generic'
  )
}

// Document Expiry Tasks
function isDocumentExpiryTask(task: ChecklistTaskWithTemplate): boolean {
  const taskData = task.task_data as Record<string, any> | null
  const sourceType = taskData?.source_type

  return (
    sourceType === 'document_expiry' ||
    task.template?.slug === 'document-review' ||
    task.template?.slug === 'document-review-generic'
  )
}

// SOP Review Tasks
function isSOPReviewTask(task: ChecklistTaskWithTemplate): boolean {
  const taskData = task.task_data as Record<string, any> | null

  return (
    taskData?.source_type === 'sop_review' ||
    task.template?.slug === 'sop-review' ||
    task.template?.slug === 'sop-review-generic'
  )
}

// Risk Assessment Review Tasks
function isRAReviewTask(task: ChecklistTaskWithTemplate): boolean {
  const taskData = task.task_data as Record<string, any> | null

  return (
    taskData?.source_type === 'ra_review' ||
    task.template?.slug === 'ra-review' ||
    task.template?.slug === 'ra-review-generic'
  )
}

// Callout Follow-up Tasks
function isCalloutTask(task: ChecklistTaskWithTemplate): boolean {
  const taskData = task.task_data as Record<string, any> | null

  return (
    taskData?.source_type === 'callout_followup' ||
    task.template?.slug === 'callout-followup'
  )
}

// ============================================================================
// Main Component - Task Type Router
// ============================================================================

export default function TaskCompletionModal({
  task,
  isOpen,
  onClose,
  onComplete,
  onMonitoringTaskCreated
}: TaskCompletionModalProps) {
  const taskType = getTaskType(task)

  // Route to appropriate form based on task type
  switch (taskType) {
    // =========================================================================
    // PART B: Pre-Built Compliance Templates (Specialized Forms)
    // =========================================================================

    case 'ppm':
      // PPM tasks use dedicated PPMServicePanel with full workflow
      // (Log Service, Contact Contractor, Reschedule, View Asset)
      return (
        <PPMServicePanel
          task={task}
          isOpen={isOpen}
          onClose={onClose}
          onComplete={onComplete}
        />
      )

    case 'ppm_followup':
      // PPM follow-up tasks after callout has been placed
      // Shows: progress notes, log service complete, upload docs, close task
      return (
        <PPMFollowupModal
          task={task}
          isOpen={isOpen}
          onClose={onClose}
          onComplete={onComplete}
        />
      )

    case 'certificate':
      // Certificate expiry tasks - update expiry date when renewed
      return (
        <CertificateTaskModal
          task={task}
          isOpen={isOpen}
          onClose={onClose}
          onComplete={onComplete}
        />
      )

    case 'document_expiry':
      // Document expiry tasks - upload new version or update expiry date
      return (
        <DocumentReviewModal
          task={task}
          isOpen={isOpen}
          onClose={onClose}
          onComplete={onComplete}
        />
      )

    case 'sop_review':
      // SOP review tasks - confirm review and set next review date
      return (
        <SOPReviewModal
          task={task}
          isOpen={isOpen}
          onClose={onClose}
          onComplete={onComplete}
        />
      )

    case 'ra_review':
      // Risk Assessment review tasks - confirm review, flag for updates if needed
      return (
        <RAReviewModal
          task={task}
          isOpen={isOpen}
          onClose={onClose}
          onComplete={onComplete}
        />
      )

    case 'callout':
      // Callout follow-up tasks - update status, add notes, close callout
      return (
        <CalloutTaskModal
          task={task}
          isOpen={isOpen}
          onClose={onClose}
          onComplete={onComplete}
        />
      )

    // =========================================================================
    // PART A: User-Built Templates (Dynamic Feature Rendering)
    // =========================================================================
    // TaskCompletionModalNew dynamically renders UI based on evidence_types:
    // - temperature -> Asset cards with temp inputs
    // - checklist -> Checkbox list
    // - yes_no_checklist -> Yes/No toggles
    // - photo -> Photo upload
    // - signature -> Signature pad
    // - pass_fail -> Pass/Fail buttons
    // - etc.
    // =========================================================================

    case 'user_template':
    default:
      return (
        <TaskCompletionModalNew
          task={task}
          isOpen={isOpen}
          onClose={onClose}
          onComplete={onComplete}
          onMonitoringTaskCreated={onMonitoringTaskCreated}
        />
      )
  }
}
