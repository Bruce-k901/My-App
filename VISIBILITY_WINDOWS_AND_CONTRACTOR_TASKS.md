# Visibility Windows & Contractor Tasks Implementation

## Overview

This document describes the implementation of two critical system enhancements:

1. **Task Visibility Windows** - Tasks can appear before their due date and remain visible after
2. **Contractor Verification Tasks** - Support for contractor tasks with document uploads

## Changes Made

### 1. Database Schema Changes

#### Task Templates - Visibility Windows

Added to `recurrence_pattern` JSONB:

- `visibility_window_days_before` - Days before due date to show task
- `visibility_window_days_after` - Days after due date to keep task visible
- `grace_period_days` - Days after due date before task becomes "overdue"

#### Example Configuration:

```sql
recurrence_pattern = jsonb_build_object(
  'visibility_window_days_before', 14,  -- Show 2 weeks before
  'visibility_window_days_after', 14,   -- Keep visible 2 weeks after
  'grace_period_days', 7                -- Becomes overdue after 7 days
)
```

### 2. Task Generation Function Updates

**File**: `supabase/migrations/20250205000007_update_task_generation_visibility_windows.sql`

The `generate_daily_tasks_direct()` function now:

- Reads visibility window settings from template `recurrence_pattern`
- Stores visibility settings in `task_data` for easy access
- Sets `expires_at` based on `due_date + visibility_window_days_after`
- Stores `actual_due_date` in `task_data` for reference

**Default Visibility Windows**:

- **Daily**: 0 days before, 1 day after (no change)
- **Weekly**: 2 days before, 3 days after (default if not specified)
- **Monthly**: 7 days before, 7 days after (default if not specified)
- **Biannual/Annual**: 14-30 days before, 14-30 days after (configurable)

### 3. Today's Tasks Page Updates

**File**: `src/app/dashboard/checklists/page.tsx`

#### Visibility Window Filtering

- Fetches tasks with `due_date = today` OR `expires_at >= today`
- Filters tasks by visibility window logic:
  - Calculates window start: `actual_due_date - visibility_before`
  - Calculates window end: `actual_due_date + visibility_after`
  - Shows task if `today` is within this window

#### Grace Period & Overdue Status

- Updated `calculateTaskTiming()` to accept `gracePeriodDays`
- New statuses: `grace_period`, `overdue`
- Visual indicators:
  - **Grace Period**: Orange border/text
  - **Overdue**: Darker red border/text with days past due count

### 4. Task Timing Utility Updates

**File**: `src/utils/taskTiming.ts`

#### New Status Types:

- `grace_period` - Task is past due but within grace period
- `overdue` - Task is past grace period (escalated)

#### Updated Function Signature:

```typescript
calculateTaskTiming(
  dueDate: string,
  dueTime: string | null,
  currentTime: Date = new Date(),
  gracePeriodDays: number = 0
): TaskTimingInfo
```

#### Status Calculation:

1. If `currentTime < windowStart` → `pending`
2. If `currentTime <= windowEnd` → `due`
3. If `currentTime > windowEnd`:
   - If `daysPastDue <= gracePeriodDays` → `grace_period`
   - If `daysPastDue > gracePeriodDays` → `overdue`
   - Otherwise → `late` (legacy)

### 5. Contractor Verification Template

**File**: `supabase/migrations/20250205000006_add_extraction_contractor_template.sql`

#### Template Configuration:

- **Frequency**: Monthly (biannual via months array)
- **Evidence Types**: `['text_note', 'pass_fail']` (Checklist + Pass/Fail)
- **Document Uploads**: Enabled via `requires_sop = TRUE` and `requires_risk_assessment = TRUE`
- **Visibility Windows**: 14 days before, 14 days after
- **Grace Period**: 7 days

#### Features:

- Pre-populated checklist items for contractor verification workflow
- Pass/Fail fields for certificate verification, contractor qualification, work completion
- Document upload for service certificates
- Monitor/Callout automatically triggered on failures

### 6. Document Upload Feature Component

**File**: `src/components/templates/features/DocumentUploadFeature.tsx`

#### New Modular Component:

- Self-contained document upload component
- Supports multiple files
- File size validation (10MB default)
- File type filtering (configurable)
- Upload to Supabase Storage (`task-documents` bucket)
- Preview and remove uploaded files

#### Integration:

- Automatically enabled when `requires_sop = TRUE` OR `requires_risk_assessment = TRUE`
- Integrated into `TaskFromTemplateModal` using the modular component system

### 7. Feature Detection Updates

**File**: `src/lib/template-features.ts`

#### Document Upload Auto-Detection:

```typescript
documentUpload: template.requires_sop || false || template.requires_risk_assessment || false;
```

Document upload is automatically enabled for templates that require SOPs or risk assessments.

## Usage Examples

### Example 1: Monthly Fire Extinguisher Inspection (Visibility Windows)

```sql
INSERT INTO task_templates (..., recurrence_pattern) VALUES (
  ...,
  jsonb_build_object(
    'daypart_times', jsonb_build_object('before_open', '07:00'),
    'date_of_month', 1,
    'visibility_window_days_before', 7,  -- Show 1 week before
    'visibility_window_days_after', 7,   -- Keep visible 1 week after
    'grace_period_days', 3,              -- Overdue after 3 days
    'default_checklist_items', jsonb_build_array(...)
  )
);
```

### Example 2: Annual Safety Audit (Long Visibility Window)

```sql
jsonb_build_object(
  'visibility_window_days_before', 30,  -- Show 1 month before
  'visibility_window_days_after', 30,   -- Keep visible 1 month after
  'grace_period_days', 14               -- Overdue after 2 weeks
)
```

### Example 3: Contractor Verification Template

```sql
INSERT INTO task_templates (
  ...,
  evidence_types,
  requires_sop,
  requires_risk_assessment,
  recurrence_pattern
) VALUES (
  ...,
  ARRAY['text_note', 'pass_fail'],
  TRUE,   -- Enable document upload
  TRUE,   -- Enable RA/document section
  jsonb_build_object(
    'visibility_window_days_before', 14,
    'visibility_window_days_after', 14,
    'grace_period_days', 7,
    'default_checklist_items', jsonb_build_array(...)
  )
);
```

## Migration Files

1. **20250205000006_add_extraction_contractor_template.sql**
   - Creates extraction system contractor verification template
   - Demonstrates visibility windows and document uploads

2. **20250205000007_update_task_generation_visibility_windows.sql**
   - Updates `generate_daily_tasks_direct()` function
   - Adds visibility window support to daily, weekly, and monthly task generation

## Testing Checklist

- [ ] Run migrations to update task generation function
- [ ] Create a monthly/annual template with visibility windows
- [ ] Verify tasks appear in "Today's Tasks" before due date
- [ ] Verify tasks remain visible after due date
- [ ] Verify grace period status (orange indicator)
- [ ] Verify overdue status (red indicator with days count)
- [ ] Test contractor verification template with document uploads
- [ ] Verify document upload component appears when `requires_sop` or `requires_risk_assessment` is true
- [ ] Test document upload, preview, and removal

## Backwards Compatibility

- Templates without visibility window settings default to:
  - Daily: Show only on due date (existing behavior)
  - Weekly/Monthly: Default visibility windows (2-7 days before/after)
- Grace periods default to 0 (tasks become "late" immediately after due time)
- Existing tasks continue to work without modification

## Future Enhancements

1. **Biannual Task Support**: Add `months` array support to task generation
2. **Escalation Notifications**: Email/SMS alerts when tasks become overdue
3. **Escalation Workflow**: Automatic escalation to manager/admin after grace period
4. **Contractor Portal**: Dedicated interface for contractors to upload certificates
5. **Certificate Expiry Tracking**: Alert when contractor certificates are expiring

## Notes

- The `months` array in the extraction template is not yet supported by the task generation function. It will generate on the 1st of every month. To restrict to biannual, you may need to:
  - Use a separate cron job
  - Manually schedule tasks
  - Update the task generation function to support `months` array filtering
