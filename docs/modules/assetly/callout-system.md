# 🔒 CALLOUT SYSTEM - LOCKED IMPLEMENTATION

**⚠️ CRITICAL: DO NOT MODIFY THIS FLOW WITHOUT UPDATING THIS DOCUMENTATION**

This document describes the complete callout system flow that must be preserved. Any changes to this flow must be documented here and tested thoroughly.

## 📋 Overview

The callout system allows users to create contractor callouts from tasks when temperatures are out of range or when other issues are detected. The system creates:

1. A callout record in the `callouts` table
2. A completed task record with all troubleshooting data (audit trail)
3. A follow-up task for the next day to update callout status

## 🔄 Complete Flow

### 1. **Callout Modal Opening**

- **Trigger**: User clicks "Place Callout" from temperature warning in `TaskCompletionModal`
- **Location**: `src/components/modals/CalloutModal.tsx`
- **Initialization**:
  - Loads contractors for the company
  - Pre-selects contractor based on callout type (PPM, warranty, reactive) and asset's linked contractor
  - Loads troubleshooting questions based on asset category
  - Loads existing callouts for the asset

### 2. **Form Validation**

- **Required Fields**:
  - **Fault Description**: Required for reactive and warranty callouts (NOT required for PPM)
  - **Contractor**: Either selected from dropdown OR custom contractor name entered
  - **Troubleshooting**: Must complete troubleshooting guide (all questions answered)
- **Validation Modal**: Shows all missing fields if validation fails
- **Location**: `handleCreateCallout()` function in `CalloutModal.tsx`

### 3. **Troubleshooting Guide**

- **Component**: `TroubleshootReel` (`src/components/ui/TroubleshootReel.tsx`)
- **Behavior**:
  - Questions loaded based on asset category
  - User answers Yes/No for each question
  - Answers are captured in a Map<number, 'yes' | 'no'>
  - Answers are passed back via `onComplete` callback
- **Storage**: Answers stored in both:
  - `troubleshooting_answers`: Array of 'yes'/'no' values
  - `troubleshooting`: Object mapping questions to answers

### 4. **Photo Upload**

- **Methods**:
  - Camera capture (direct from phone camera)
  - File upload
- **Storage**: Uploaded to Supabase Storage
  - Primary bucket: `callout_documents`
  - Fallback bucket: `sop-photos`
- **Path**: `${companyId}/callouts/${timestamp}_${index}.${ext}`

### 5. **Callout Creation** (`handleConfirmCreateCallout`)

When "Send Callout" button is clicked:

#### Step 5a: Photo Upload

- Uploads all photos to Supabase Storage
- Collects public URLs in `attachmentUrls` array

#### Step 5b: Get User ID

- Ensures user profile ID is available
- Falls back to fetching from auth if needed

#### Step 5c: Determine Contractor ID

- Uses `selectedContractorId` if contractor selected from dropdown
- Falls back to asset's linked contractor based on callout type:
  - PPM → `ppm_contractor_id`
  - Warranty → `warranty_contractor_id`
  - Reactive → `reactive_contractor_id`
- If custom contractor: contractor name/email added to notes, `contractor_id` is null

#### Step 5d: Create Callout Record

- **RPC Method** (preferred): `create_callout()` function
- **Fallback**: Direct insert into `callouts` table
- **Data Stored**:
  - `asset_id`: Asset that needs service
  - `callout_type`: 'reactive', 'warranty', or 'ppm'
  - `priority`: Always 'urgent' (all callouts are urgent)
  - `status`: 'open'
  - `fault_description`: User's description of the issue
  - `notes`: Additional notes + custom contractor info if applicable
  - `attachments`: Array of photo URLs
  - `troubleshooting_complete`: Boolean (true if troubleshooting guide completed)
  - `contractor_id`: Selected contractor ID or null if custom
  - `created_by`: User profile ID

#### Step 5e: Create Callout Report Task (Completed Task Record)

- **Purpose**: Immutable audit trail with all troubleshooting data
- **Table**: `checklist_tasks` + `task_completion_records`
- **Task Data**:
  - `flag_reason`: 'callout_report'
  - `template_id`: null (or dummy UUID if constraint doesn't allow null)
  - `callout_id`: ID of the created callout
  - `callout_type`: Type of callout
  - `asset_id`: Asset ID
  - `asset_name`: Asset name
  - `fault_description`: Fault description
  - `troubleshooting_completed`: Boolean
  - `troubleshooting_questions`: Array of question strings
  - `troubleshooting_answers`: Array of 'yes'/'no' answers
  - `troubleshooting`: Object mapping questions to answers
  - `notes`: Additional notes
  - `photos`: Array of photo URLs
  - `contractor_id`: Contractor ID
  - `contractor_name`: Contractor name
  - `manual_contractor_email`: Email if custom contractor
- **Completion Record**:
  - Stores all above data in `completion_data` JSONB field
  - `evidence_attachments`: Photo URLs
  - `flag_reason`: 'callout_report'
  - `flagged`: true
- **Status**: Immediately marked as 'completed' after record creation

#### Step 5f: Create Follow-Up Task

- **Purpose**: Task for next day to update callout status and upload worksheet
- **Due Date**: TODAY (not tomorrow) - expires in 24 hours
- **Task Data**:
  - `flag_reason`: 'callout_followup'
  - `template_id`: null (or dummy UUID)
  - `callout_id`: ID of the created callout
  - `callout_status`: 'not_yet_visited' (initial status)
  - `asset_id`: Asset ID
  - `asset_name`: Asset name
  - `requires_worksheet_upload`: true
  - `fault_description`: Fault description
- **Status**: 'pending'
- **Priority**: 'high'
- **Expires**: 24 hours from creation

#### Step 5g: Close Modal

- Reset all form fields
- Close modal
- Show success toast

## 📊 Data Flow Diagram

```
User Action: Temperature Out of Range
    ↓
TaskCompletionModal: Show Warning
    ↓
User Clicks "Place Callout"
    ↓
CalloutModal Opens
    ↓
User Fills Form:
  - Fault Description (if reactive/warranty)
  - Contractor Selection
  - Troubleshooting Guide (Yes/No answers)
  - Photos (optional)
  - Notes (optional)
    ↓
User Clicks "Send Callout"
    ↓
Validation Check
    ↓
[If Invalid] → Show Validation Modal
[If Valid] → Continue
    ↓
1. Upload Photos → Supabase Storage
2. Create Callout → callouts table
3. Create Report Task → checklist_tasks (completed)
4. Create Completion Record → task_completion_records
5. Create Follow-Up Task → checklist_tasks (pending)
    ↓
Close Modal → Success
```

## 🔑 Critical Components

### 1. **CalloutModal.tsx**

- **File**: `src/components/modals/CalloutModal.tsx`
- **Key Functions**:
  - `handleCreateCallout()`: Validation and entry point
  - `handleConfirmCreateCallout()`: Main creation flow
  - `validateCalloutForm()`: Form validation
  - `loadContractors()`: Load available contractors
  - `fetchTroubleshootingQuestions()`: Load troubleshooting guide
- **Critical State**:
  - `troubleshootingAnswersMap`: Map of question index → 'yes'/'no'
  - `troubleshootAck`: Boolean indicating troubleshooting completed
  - `selectedContractorId`: Selected contractor from dropdown
  - `manualContractorName`: Custom contractor name
  - `attachments`: Array of photo files

### 2. **TroubleshootReel.tsx**

- **File**: `src/components/ui/TroubleshootReel.tsx`
- **Key Function**: `handleAnswerSelect()`: Captures Yes/No answers
- **Callback**: `onComplete(answers: Map<number, 'yes' | 'no'>)`: Passes answers back
- **⚠️ CRITICAL**: Must pass answers map back, not just completion status

### 3. **CompletedTaskCard.tsx**

- **File**: `src/components/checklists/CompletedTaskCard.tsx`
- **Key Features**:
  - Displays callout report data when `flag_reason === 'callout_report'`
  - Shows asset info, contractor info, troubleshooting Q&A
  - Color coding: Red for issues, Green for no issues
- **⚠️ CRITICAL**: Must check for `callout_report` flag to show callout data

### 4. **TaskCompletionModal.tsx**

- **File**: `src/components/checklists/TaskCompletionModal.tsx`
- **Key Function**: `handleCalloutAction()`: Opens CalloutModal with asset
- **⚠️ CRITICAL**: Must pass asset with all contractor info and temperature data

## 🗄️ Database Schema Requirements

### `callouts` Table

- `id`: UUID (primary key)
- `asset_id`: UUID (references assets)
- `callout_type`: VARCHAR ('reactive', 'warranty', 'ppm')
- `priority`: VARCHAR (default: 'urgent')
- `status`: VARCHAR ('open', 'closed', etc.)
- `fault_description`: TEXT
- `notes`: TEXT
- `attachments`: TEXT[] or JSONB
- `troubleshooting_complete`: BOOLEAN
- `contractor_id`: UUID (nullable, references contractors)
- `created_by`: UUID (references profiles)

### `checklist_tasks` Table

- `flag_reason`: TEXT ('callout_report', 'callout_followup')
- `callout_id`: UUID (nullable, references callouts)
- `template_id`: UUID (nullable - callout tasks don't use templates)
- `task_data`: JSONB (stores callout report data)

### `task_completion_records` Table

- `completion_data`: JSONB (stores all callout report data)
- `evidence_attachments`: TEXT[] (photo URLs)
- `flag_reason`: TEXT ('callout_report')

## 🔒 Locked Behaviors

### 1. **Validation Rules** (DO NOT CHANGE)

- Fault description: Required for reactive/warranty, NOT for PPM
- Contractor: Required (dropdown OR custom)
- Troubleshooting: Required (all questions must be answered)

### 2. **Task Creation** (DO NOT CHANGE)

- Report task: Always created and immediately completed
- Follow-up task: Always created for TODAY (24-hour window)
- Both tasks: Must include `callout_id` in task_data

### 3. **Answer Storage** (DO NOT CHANGE)

- Answers must be stored in TWO formats:
  - `troubleshooting_answers`: Array for sequential access
  - `troubleshooting`: Object for question-based lookup
- Answers must be 'yes' or 'no', not 'completed'

### 4. **Photo Storage** (DO NOT CHANGE)

- Primary bucket: `callout_documents`
- Fallback bucket: `sop-photos`
- Path format: `${companyId}/callouts/${timestamp}_${index}.${ext}`

### 5. **Modal Behavior** (DO NOT CHANGE)

- Modal closes after successful creation
- Form resets on close
- Troubleshooting answers reset on close
- Validation modal shows all missing fields

## 🧪 Testing Checklist

Before making ANY changes to the callout system, verify:

- [ ] Callout modal opens from temperature warning
- [ ] Validation modal shows when fields are missing
- [ ] Troubleshooting guide captures Yes/No answers
- [ ] Photos upload successfully (camera and file picker)
- [ ] Callout record created in database
- [ ] Callout report task created and completed
- [ ] Completion record has all troubleshooting data
- [ ] Follow-up task created for today (24-hour window)
- [ ] Completed task card shows all callout data
- [ ] Asset info displayed in callout report
- [ ] Contractor info displayed (name, email if custom)
- [ ] Troubleshooting Q&A displayed correctly
- [ ] Color coding works (red for issues, green for no issues)
- [ ] Modal closes after successful creation

## 📝 Change Log

### 2025-01-XX: Initial Lock

- Complete callout flow implemented
- Troubleshooting answers captured and stored
- Callout report task creation
- Follow-up task creation
- Completed task card display
- Color coding for issues
- Validation modal

## ⚠️ BREAKING CHANGES

If you need to modify this system:

1. Update this documentation first
2. Test all scenarios in the testing checklist
3. Update any dependent systems
4. Notify team of changes

## 🔗 Related Documentation

- `TEMPERATURE_WARNING_SYSTEM_LOCKED.md`: Temperature warning system
- Task completion flow documentation
- Asset contractor management documentation
