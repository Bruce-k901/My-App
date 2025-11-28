# PPM Flow Diagnostic Report

## Issues Identified

### 1. **Unnecessary "View PPM Schedule" Button**

**Location**: `src/components/checklists/TaskCompletionModal.tsx` (lines 4784-4792)

- **Problem**: PPM tasks show both "View PPM Schedule" and "Place PPM Call Out" buttons
- **Expected**: Only "Place PPM Call Out" should be shown at this stage
- **Fix**: Remove the "View PPM Schedule" quick navigation section for PPM tasks

### 2. **Missing Follow-up Task After Callout**

**Location**: `src/components/modals/CalloutModal.tsx` (lines 898-931)

- **Problem**: Follow-up task creation is skipped due to RLS policy restrictions
- **Expected**: After placing a PPM callout, a new task should be generated to "Update PPM Task"
- **Fix**: Create follow-up task using API route or service role to bypass RLS

### 3. **PPM Schedule Not Updated on Task Completion**

**Location**: `src/components/checklists/TaskCompletionModal.tsx` (handleSubmit function)

- **Problem**: When a PPM task is completed, the PPM schedule's `next_service_date` is not auto-populated
- **Expected**: When task is closed, calculate next service date based on `frequency_months` (6 or 12 months)
- **Fix**: Add logic to update `ppm_schedule` table when PPM task is completed

### 4. **PPM Schedule Lookup**

**Problem**: PPM tasks use `task_data.source_id` (asset_id) but need to find the corresponding `ppm_schedule` record

- **Fix**: Query `ppm_schedule` table by `asset_id` to get `frequency_months` and update accordingly

## Current Flow (Broken)

1. ✅ PPM task generated in Today's Tasks (via `generate-daily-tasks` edge function)
2. ❌ User sees both "View PPM Schedule" and "Place PPM Call Out" buttons
3. ✅ User places callout
4. ❌ No follow-up task created (skipped due to RLS)
5. ❌ When task is completed, PPM schedule not updated with next service date

## Expected Flow (Fixed)

1. ✅ PPM task generated in Today's Tasks
2. ✅ User sees only "Place PPM Call Out" button
3. ✅ User places callout
4. ✅ Follow-up task created: "Update PPM Task" (allows adding notes or closing)
5. ✅ When follow-up task is closed, PPM schedule updated:
   - `last_service_date` = today
   - `next_service_date` = today + `frequency_months`
   - `status` = 'upcoming'

## Implementation Plan

1. ✅ Remove "View PPM Schedule" button from PPM tasks
2. ✅ Create API route for follow-up task creation (bypasses RLS)
3. ✅ Add PPM schedule update logic when PPM task is completed
4. ⏳ Test complete flow end-to-end

## Changes Made

### 1. Removed "View PPM Schedule" Button

**File**: `src/components/checklists/TaskCompletionModal.tsx`

- **Change**: Modified the quick navigation section to return `null` for PPM tasks
- **Result**: Only "Place PPM Call Out" button is shown for PPM tasks

### 2. Created PPM Follow-up Task API Route

**File**: `src/app/api/tasks/create-ppm-followup/route.ts` (NEW)

- **Purpose**: Creates a follow-up task after PPM callout is placed
- **Features**:
  - Uses service role to bypass RLS policies
  - Creates task with `source_type: 'ppm_followup'`
  - Task expires in 24 hours
  - Allows user to add notes or close off PPM task

### 3. Updated CalloutModal to Create Follow-up Task

**File**: `src/components/modals/CalloutModal.tsx`

- **Change**: Added API call to create PPM follow-up task when `calloutType === 'ppm'`
- **Result**: After placing a PPM callout, a follow-up task is automatically created

### 4. Added PPM Schedule Update Logic

**File**: `src/app/api/tasks/complete/route.ts`

- **Change**: Added logic to update `ppm_schedule` table when PPM task is completed
- **Logic**:
  - Detects PPM tasks by checking `task_data.source_type === 'ppm_overdue'` or `'ppm_followup'`
  - Finds PPM schedule record by `asset_id`
  - Calculates `next_service_date` = completion date + `frequency_months`
  - Updates `last_service_date`, `next_service_date`, and `status = 'upcoming'`

## Expected Flow (After Fixes)

1. ✅ PPM task generated in Today's Tasks (via `generate-daily-tasks` edge function)
2. ✅ User sees only "Place PPM Call Out" button
3. ✅ User places callout
4. ✅ Follow-up task created: "Update PPM Task" (via API route)
5. ✅ When follow-up task is closed, PPM schedule updated:
   - `last_service_date` = today
   - `next_service_date` = today + `frequency_months` (6 or 12 months)
   - `status` = 'upcoming'

## Testing Checklist

- [ ] PPM task appears in Today's Tasks
- [ ] Only "Place PPM Call Out" button is visible (no "View PPM Schedule")
- [ ] Callout can be placed successfully
- [ ] Follow-up task appears in Today's Tasks after callout is placed
- [ ] Follow-up task allows adding notes
- [ ] When follow-up task is closed, PPM schedule is updated with correct next_service_date
- [ ] Next PPM task is generated at the correct future date
