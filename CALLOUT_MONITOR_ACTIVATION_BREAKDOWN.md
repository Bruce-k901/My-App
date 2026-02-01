# Callout / Monitor Activation – Full Breakdown

## Overview

The **callout** and **monitor** flows let users react to out-of-range temperatures or failed inspections by either:

- **Monitor** – Create a follow-up task to re-check later (no contractor).
- **Callout** – Create a contractor callout (with or without the full CalloutModal flow).

There are **two completion flows** (new vs legacy) and **several entry points** (task completion, template features, workflows). This doc covers all of them.

---

## 1. Entry Points Summary

| Context                                       | Trigger                                     | Monitor                                                                 | Callout                                                   | Files                                                           |
| --------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------- |
| **Today's Tasks (active flow)**               | User completes task with out-of-range temps | OutOfRangeActionModal → `createMonitoringTask()`                        | OutOfRangeActionModal → `createCallout()` (simple insert) | TaskCompletionModalNew, useTaskSubmission                       |
| **Legacy completion modal**                   | User clicks "Place Callout" or "Monitor"    | MonitorDurationModal → `createMonitoringTask()`                         | Opens **CalloutModal** (full form)                        | TaskCompletionModal.OLD, CalloutModal                           |
| **Template creation (TaskFromTemplateModal)** | Temp out of range or Pass/Fail "Fail"       | MonitorCalloutModal → `onMonitorCallout(true, …)`                       | MonitorCalloutModal → `onMonitorCallout(…, true)`         | TemperatureLoggingFeature, PassFailFeature, MonitorCalloutModal |
| **Workflow (measurement/inspection)**         | Template `workflowConfig.escalationRules`   | `escalateMeasurement` / `escalateInspection` → `createMonitoringTask()` | Same → `createCallout()`                                  | measurement-escalate, inspection-escalate                       |
| **Asset card**                                | User clicks "Place callout" on asset        | N/A                                                                     | Opens CalloutModal                                        | AssetCard, CalloutModal                                         |
| **Messaging**                                 | Convert message to callout                  | N/A                                                                     | ConvertToCalloutModal → insert `callouts`                 | MessageThread, ConvertToCalloutModal                            |

---

## 2. Active Flow: Today's Tasks (New Completion Modal)

This is the flow used when completing a task from the Today's Tasks page.

### 2.1 Which modal is used

- **Page**: `src/app/dashboard/todays_tasks/page.tsx`
- **Import**: `TaskCompletionModal` from `@/components/checklists/TaskCompletionModal`
- **Actual component**: `TaskCompletionModal.tsx` re-exports **TaskCompletionModalNew** from `@/components/tasks/TaskCompletionModalNew`

So the **active** completion UI is **TaskCompletionModalNew**, not TaskCompletionModal.OLD.

### 2.2 Flow steps

1. **User opens task**  
   Clicks a task on Today's Tasks → `TaskCompletionModalNew` opens with `task` and template/asset data.

2. **Out-of-range detection**  
   In `TaskCompletionModalNew`, `outOfRangeAssets` is derived from:
   - `temperatures` (per asset)
   - `assetTempRanges` (min/max per asset from template/task data)
   - Logic: `(range.min !== null && temp < range.min) || (range.max !== null && temp > range.max)`

   See: `TaskCompletionModalNew.tsx` (useMemo for `outOfRangeAssets`).

3. **User clicks "Complete Task"**  
   Handler is `handleSubmitClick`:
   - If there are out-of-range assets and not every one has an action chosen → **OutOfRangeActionModal** is shown.
   - Otherwise → `handleSubmit()` runs (builds payload and calls `submitTask`).

4. **OutOfRangeActionModal**
   - **File**: `src/components/tasks/components/OutOfRangeActionModal.tsx`
   - User must choose **Monitor** or **Callout** for each out-of-range asset.
   - Buttons: "Monitor – Check again later" and "Callout – Immediate action".
   - On "Continue": `onComplete(actionsList)` with `{ assetId, assetName, action: 'monitor' | 'callout' }`.

5. **After actions are set**  
   `handleOutOfRangeComplete` in TaskCompletionModalNew:
   - Calls `setOutOfRangeAction(item.assetId, item.action)` for each asset.
   - Closes the modal and, after a short delay, calls `handleSubmit()`.

6. **Submission**  
   `handleSubmit()` builds a `TaskCompletionPayload` including:
   - `outOfRangeAssets`: array of `{ assetId, assetName, temperature, min, max, action, monitoringDuration?, calloutNotes? }`
   - Actions come from `outOfRangeActions` (the Map set in step 5).

7. **useTaskSubmission.submitTask**
   - **File**: `src/hooks/tasks/useTaskSubmission.ts`
   - For each `outOfRangeAsset`:
     - **action === 'monitor'** → `createMonitoringTask(...)`
     - **action === 'callout'** → `createCallout(...)`
   - Then task is marked completed (and photos/temperature records handled as usual).

### 2.3 createMonitoringTask (new flow)

- **File**: `src/hooks/tasks/useTaskSubmission.ts`
- Inserts into `checklist_tasks`:
  - `template_id`, `company_id`, `site_id` from context/task
  - `custom_name`: `Re-check: ${outOfRangeAsset.assetName}`
  - `due_date` / `due_time`: now + `monitoringDuration` (default 60 minutes)
  - `status: 'pending'`, `priority: 'urgent'`, `flagged: true`, `flag_reason: 'monitoring'`
  - `task_data`: `source_type: 'monitoring'`, `selectedAssets`, `equipment_config`, `parent_task_id`, `monitoring_duration`, `original_temperature`

### 2.4 createCallout (new flow)

- **File**: `src/hooks/tasks/useTaskSubmission.ts`
- **No CalloutModal.** Direct insert into `callouts`:
  - `company_id`, `site_id`, `asset_id`, `callout_type: 'reactive'`
  - `fault_description`: e.g. `Temperature out of range: X°C (Range: min to max)`
  - `notes`: optional `calloutNotes`
  - `status: 'open'`, `priority: 'urgent'`
  - `reported_by`, `reported_at` (profile id and timestamp)

So in the **active** path, callout is a simple record; no troubleshooting, no contractor selection, no report/follow-up tasks.

---

## 3. Legacy Flow: TaskCompletionModal.OLD + CalloutModal

When the **legacy** completion modal is used (e.g. if something still imports TaskCompletionModal.OLD), "Place Callout" opens the **full** CalloutModal. "Monitor" uses a duration modal then creates a monitoring task.

### 3.1 Where it’s triggered

- **File**: `src/components/checklists/TaskCompletionModal.OLD.tsx`
- Temperature (and similar) UI shows:
  - **Monitor** → calls `handleMonitorAction(assetId)` (or no asset).
  - **Place Callout** → calls `handleCalloutAction(assetId)`.

### 3.2 handleMonitorAction (legacy)

- Sets `outOfRangeAssetId` if assetId provided.
- Opens **MonitorDurationModal** (duration in minutes).
- On confirm, calls `createMonitoringTask(durationMinutes)` which inserts a `checklist_tasks` row with `flag_reason: 'monitoring'` and due time = now + duration.

### 3.3 handleCalloutAction (legacy)

- Resolves the **asset** (from `selectedAssets` or DB: `assets` + site + contractors).
- Builds an **asset object for the modal** (id, name, site_name, contractor names/ids, etc.).
- Sets `setCalloutAsset(assetForCallout)` and `setShowCalloutModal(true)`.
- Optionally queues another callout if a modal is already open.
- Also used for fire-alarm and emergency-lighting failures (placeholder asset if no asset found).

### 3.4 CalloutModal (full flow)

- **File**: `src/components/modals/CalloutModal.tsx`
- **Props**: `open`, `onClose`, `asset`, `requireTroubleshoot`, `initialCalloutType`.
- User fills: fault description (if reactive/warranty), contractor (dropdown or custom), troubleshooting (TroubleshootReel), photos, notes.
- **Send Callout** → `handleCreateCallout()` → validation → `handleConfirmCreateCallout()`.

**handleConfirmCreateCallout** (and the rest of the locked flow) is documented in **CALLOUT_SYSTEM_LOCKED.md**. In short it:

1. Uploads photos (e.g. `callout_documents` or `sop-photos`).
2. Gets user profile ID.
3. Resolves contractor (selected, asset’s reactive/ppm/warranty, or custom in notes).
4. Creates callout:
   - Prefer **RPC** `create_callout(...)` when `asset.id` exists.
   - Else direct insert into `callouts` with same conceptual fields.
5. Creates **callout report task** (completed) and completion record.
6. Creates **follow-up task** (pending, due today, 24h window).
7. Closes modal and resets form.

So in the **legacy** path, callout is the full process (troubleshooting, contractor, report task, follow-up task).

---

## 4. Template Creation: TaskFromTemplateModal + MonitorCalloutModal

Used when **configuring** a task from a template (Compliance/Templates), not when completing a task.

### 4.1 When the modal appears

- **Temperature**  
  **File**: `src/components/templates/features/TemperatureLoggingFeature.tsx`
  - On temp change, if value is:
    - **Out of min/max range** → `setMonitorCalloutModal({ isOpen: true, assetId, assetName, temp, tempRange })`.
    - **Above fail threshold** (if `failThreshold`) → same modal.
    - **Above warn threshold** (if `warnThreshold`) and `onMonitorCallout` → **no modal**; calls `onMonitorCallout(true, false, message, assetId, temp, tempRange)` (monitor only).
  - When user confirms the modal → `handleMonitorCalloutConfirm(monitor, callout, notes)` → `onMonitorCallout(monitor, callout, notes, assetId, temp, tempRange)`.

- **Pass/Fail**  
  **File**: `src/components/templates/features/PassFailFeature.tsx`
  - User selects "Fail" → `setShowMonitorCallout(true)` → **MonitorCalloutModal**.
  - On confirm → `onMonitorCallout(monitor, callout, notes)`.

### 4.2 MonitorCalloutModal

- **File**: `src/components/templates/features/MonitorCalloutModal.tsx`
- UI: checkboxes "Monitor" and "Callout", optional notes, trigger message (e.g. temperature or "Task marked as FAIL").
- **Confirm** → `onConfirm(monitor, callout, notes)`.

### 4.3 TaskFromTemplateModal.handleMonitorCallout

- **File**: `src/components/templates/TaskFromTemplateModal.tsx`
- **Signature**: `handleMonitorCallout(monitor, callout, notes?, assetId?, temp?, tempRange?)`
- **Behavior**: Only logs and/or stores for the **configuration** being edited. It does **not** create any `checklist_tasks` or `callouts`; it’s for future use when the task is created from the template (e.g. in task_data or similar).

So in template creation, **monitor/callout is only chosen and passed up**; no DB writes for callout/monitor in this path.

---

## 5. Workflow Escalation (measurement / inspection)

Used when a template has `workflowConfig.escalationRules` and the code path runs the workflow (e.g. from legacy completion or other triggers).

### 5.1 Measurement (e.g. temperature)

- **File**: `src/components/checklists/workflows/measurement-escalate.ts`
- **Entry**: `escalateMeasurement(params, durationMinutes?)`
- Uses `isOutOfRange(...)` and `outOfRangeAction` from config:
  - **`outOfRangeAction === 'callout'` or severity `'critical'`** → `createCallout(params)` (insert into `callouts`; workflow uses its own helper).
  - **`outOfRangeAction === 'monitor'`** → `createMonitoringTask(params, duration)` (insert into `checklist_tasks` with `flag_reason: 'monitoring'`).

### 5.2 Inspection (e.g. pass/fail)

- **File**: `src/components/checklists/workflows/inspection-escalate.ts`
- **Entry**: `escalateInspection(params, durationMinutes?)`
- If `inspectionResult === 'pass'` → no escalation.
- Otherwise uses `outOfRangeAction`:
  - **`monitor`** → `createMonitoringTask(...)`
  - Else → `createCallout(...)` (insert into `contractor_callouts` in this file – note different table than `callouts` in other flows).

Workflow runner: `src/components/checklists/workflows/index.ts` (e.g. `runWorkflow` with type `measurement` or `inspection`).

---

## 6. Other Callout Entry Points (no monitor)

- **AssetCard**  
  "Place callout" opens **CalloutModal** with that asset (same full flow as legacy completion).

- **Messaging – ConvertToCalloutModal**  
  Converts a message to a callout by inserting into `callouts` (no full CalloutModal flow like legacy).

---

## 7. Files Reference

| Purpose                                      | File(s)                                                                                                          |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Today's Tasks page**                       | `src/app/dashboard/todays_tasks/page.tsx`                                                                        |
| **Completion modal (active)**                | `src/components/checklists/TaskCompletionModal.tsx` (wrapper), `src/components/tasks/TaskCompletionModalNew.tsx` |
| **Out-of-range choice (active)**             | `src/components/tasks/components/OutOfRangeActionModal.tsx`                                                      |
| **Submit + create monitor/callout (active)** | `src/hooks/tasks/useTaskSubmission.ts` (`createMonitoringTask`, `createCallout`)                                 |
| **Legacy completion modal**                  | `src/components/checklists/TaskCompletionModal.OLD.tsx`                                                          |
| **Full callout form**                        | `src/components/modals/CalloutModal.tsx`                                                                         |
| **Monitor duration (legacy)**                | `MonitorDurationModal` (used from TaskCompletionModal.OLD)                                                       |
| **Template – temperature**                   | `src/components/templates/features/TemperatureLoggingFeature.tsx`                                                |
| **Template – pass/fail**                     | `src/components/templates/features/PassFailFeature.tsx`                                                          |
| **Template – monitor/callout choice**        | `src/components/templates/features/MonitorCalloutModal.tsx`                                                      |
| **Template – handler (no DB)**               | `TaskFromTemplateModal.tsx` → `handleMonitorCallout`                                                             |
| **Workflow – measurement**                   | `src/components/checklists/workflows/measurement-escalate.ts`                                                    |
| **Workflow – inspection**                    | `src/components/checklists/workflows/inspection-escalate.ts`                                                     |
| **Workflow runner**                          | `src/components/checklists/workflows/index.ts`                                                                   |
| **Feature flags**                            | `src/lib/template-features.ts` (`monitorCallout`)                                                                |
| **Locked callout flow**                      | `CALLOUT_SYSTEM_LOCKED.md`                                                                                       |

---

## 8. Flow Diagrams

### 8.1 Active flow (Today's Tasks)

```
User completes task with out-of-range temps
  → TaskCompletionModalNew
  → User clicks "Complete Task"
  → If outOfRangeAssets and not all actions set → OutOfRangeActionModal
  → User selects Monitor or Callout per asset → Continue
  → handleSubmit() → useTaskSubmission.submitTask(payload)
  → For each outOfRangeAsset:
       monitor → createMonitoringTask() → insert checklist_tasks (flag_reason: 'monitoring')
       callout → createCallout()         → insert callouts (simple)
  → Mark task completed
```

### 8.2 Legacy flow (Place Callout)

```
User in TaskCompletionModal.OLD, temp out of range or fail
  → User clicks "Place Callout"
  → handleCalloutAction(assetId)
  → Resolve asset (and contractors) → setCalloutAsset(...), setShowCalloutModal(true)
  → CalloutModal opens
  → User fills fault, contractor, troubleshooting, photos
  → Send Callout → handleConfirmCreateCallout()
  → create_callout RPC or insert callouts
  → Create callout report task (completed) + follow-up task (pending)
  → Close modal
```

### 8.3 Template creation (no DB for monitor/callout)

```
User in TaskFromTemplateModal, temp out of range or Pass/Fail "Fail"
  → TemperatureLoggingFeature or PassFailFeature
  → MonitorCalloutModal (Monitor / Callout checkboxes)
  → onConfirm(monitor, callout, notes)
  → TaskFromTemplateModal.handleMonitorCallout(...)
  → Only logging / state; no createMonitoringTask or createCallout
```

---

## 9. Summary

- **Monitor** = create a follow-up **checklist_tasks** row (re-check later). No contractor.
- **Callout** = create a **callouts** row; in the legacy path also open **CalloutModal** (troubleshooting, contractor, report task, follow-up task).
- **Active path** (Today's Tasks): TaskCompletionModalNew → OutOfRangeActionModal → useTaskSubmission → direct `createMonitoringTask` or simple `createCallout` insert. No CalloutModal.
- **Legacy path**: TaskCompletionModal.OLD → "Place Callout" opens CalloutModal and runs the full flow in CALLOUT_SYSTEM_LOCKED.md; "Monitor" uses MonitorDurationModal then creates one monitoring task.
- **Template creation**: MonitorCalloutModal only collects the user’s choice; TaskFromTemplateModal’s handleMonitorCallout does not create tasks or callouts.
- **Workflows**: measurement-escalate and inspection-escalate create monitor/callout via their own helpers (different tables for inspection callout: `contractor_callouts`).
