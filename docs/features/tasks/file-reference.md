# Task-Related Files Reference

Complete list of all files related to the task system in the codebase.

## 📄 Frontend Pages (`src/app/dashboard/tasks/`)

### Main Pages

- `src/app/dashboard/tasks/page.tsx` - Main tasks page
- `src/app/dashboard/tasks/layout.tsx` - Tasks layout with navigation
- `src/app/dashboard/tasks/view/[taskId]/page.tsx` - Task detail/view page

### Sub-Pages

- `src/app/dashboard/tasks/templates/page.tsx` - Task templates listing
- `src/app/dashboard/tasks/compliance-templates/page.tsx` - Compliance templates
- `src/app/dashboard/tasks/my-tasks/page.tsx` - User's assigned tasks
- `src/app/dashboard/tasks/scheduled/page.tsx` - Scheduled tasks
- `src/app/dashboard/tasks/completed/page.tsx` - Completed tasks
- `src/app/dashboard/tasks/drafts/page.tsx` - Draft tasks
- `src/app/dashboard/tasks/compliance/page.tsx` - Compliance tasks
- `src/app/dashboard/tasks/settings/page.tsx` - Task settings

---

## 🧩 Components (`src/components/`)

### Templates

- `src/components/templates/MasterTemplateModal.tsx` - Template builder modal

### Checklists

- `src/components/checklists/TaskCard.tsx` - Task card component
- `src/components/checklists/TaskCompletionModal.tsx` - Task completion modal
- `src/components/checklists/MonitorDurationModal.tsx` - Monitor duration modal

### Checklist Workflows (`src/components/checklists/workflows/`)

- `src/components/checklists/workflows/simple-confirm.ts`
- `src/components/checklists/workflows/document-track.ts`
- `src/components/checklists/workflows/checklist-verify.ts`
- `src/components/checklists/workflows/inspection-escalate.ts`
- `src/components/checklists/workflows/measurement-escalate.ts`
- `src/components/checklists/workflows/index.ts`

### Compliance Templates (`src/components/compliance/`)

- `src/components/compliance/TemperatureCheckTemplate.tsx`
- `src/components/compliance/FireAlarmTestTemplate.tsx`
- `src/components/compliance/HotHoldingTemplate.tsx`
- `src/components/compliance/EmergencyLightingTemplate.tsx`
- `src/components/compliance/PATTestingTemplate.tsx`
- `src/components/compliance/ProbeCalibrationTemplate.tsx`
- `src/components/compliance/ExtractionServiceTemplate.tsx`

### Modals

- `src/components/modals/CalloutModal.tsx` - Callout/contractor notification modal

---

## 🔧 Utilities & Libraries (`src/lib/`, `src/utils/`)

- `src/lib/task-generation.ts` - Task generation logic and utilities
- `src/utils/taskTiming.ts` - Task timing utilities

---

## 🔌 API Routes (`src/app/api/`)

### Task Generation

- `src/app/api/admin/generate-tasks/route.ts` - Admin task generation endpoint

### Compliance Tasks

- `src/app/api/compliance/tasks/route.ts` - Compliance task operations
- `src/app/api/compliance/templates/route.ts` - Compliance template operations
- `src/app/api/compliance/complete/route.ts` - Task completion endpoint
- `src/app/api/compliance/clone/route.ts` - Template cloning
- `src/app/api/compliance/deploy/route.ts` - Template deployment
- `src/app/api/compliance/import-templates/route.ts` - Template import
- `src/app/api/compliance/out-of-range/route.ts` - Out of range handling

---

## 🗄️ Database Schema & Migrations (`supabase/`)

### Migrations

- `supabase/migrations/001_create_task_template_schema.sql` - Initial task template schema
- `supabase/migrations/001_create_task_template_schema.down.sql` - Rollback migration
- `supabase/migrations/001_create_checklist_schema.sql` - Checklist schema
- `supabase/migrations/20250123000000_create_task_system.sql` - Task system creation
- `supabase/migrations/20250127000000_add_task_cleanup_function.sql` - Task cleanup function
- `supabase/migrations/20250128000002_add_callout_followup_tasks.sql` - Callout followup tasks
- `supabase/migrations/20250129000001_add_checklist_tasks_delete_policy.sql` - Delete policy

### SQL Scripts (`supabase/sql/`)

- `supabase/sql/create_task_templates_table.sql` - Task templates table
- `supabase/sql/create_task_tables.sql` - Task tables creation
- `supabase/sql/create_task_repeatable_labels.sql` - Repeatable labels table
- `supabase/sql/seed_task_templates.sql` - Seed task templates (part 1)
- `supabase/sql/seed_task_templates_part2.sql` - Seed task templates (part 2)
- `supabase/sql/tasks.sql` - General tasks SQL
- `supabase/sql/tasks_details.sql` - Task details SQL
- `supabase/sql/task_events.sql` - Task events SQL
- `supabase/sql/task_library.sql` - Task library SQL
- `supabase/sql/storage_task_photos.sql` - Task photo storage
- `supabase/sql/README_TASK_SYSTEM.md` - Task system documentation
- `supabase/sql/full_drop_task_system.sql` - Full system drop script

### Database Functions

- `supabase/functions/generate-daily-tasks/index.ts` - Daily task generation edge function
- `supabase/functions/clone_templates_to_sites/index.ts` - Template cloning function

---

## 📝 Documentation Files

### Setup & Planning

- `TASK_TEMPLATES_SETUP.md` - Task templates setup guide
- `TASK_TEMPLATES_CONSTRAINT_FIX.md` - Constraint fix documentation
- `TASK_SYSTEM_CONSOLIDATION_PLAN.md` - System consolidation plan
- `TASK_SYSTEM_CONSOLIDATION_COMPLETE.md` - Consolidation completion
- `TASK_REFINEMENTS_COMPLETE.md` - Refinements documentation
- `TASK_LIST_REDESIGN_COMPLETE.md` - List redesign completion
- `DRAFT_TASKS_PAGE_COMPLETE.md` - Draft tasks page completion

### Cleanup & Maintenance

- `COMPLETE_TASK_CLEANUP_SUMMARY.md` - Task cleanup summary
- `CLEANUP_ALL_TASKS_KEEP_SFBB.sql` - Cleanup script (keep SFBB)
- `DELETE_ALL_TASKS.sql` - Delete all tasks script
- `QUICK_CLEANUP_KEEP_SFBB.sql` - Quick cleanup script

### SQL Fixes

- `check_and_create_task_templates.sql` - Template creation check
- `fix_task_templates_table.sql` - Template table fixes

---

## 📊 Summary Statistics

- **Frontend Pages**: 11 files
- **Components**: 15+ files
- **API Routes**: 8 files
- **Database Migrations**: 7 files
- **SQL Scripts**: 13+ files
- **Documentation**: 10+ files
- **Utilities**: 2 files

**Total: ~70+ task-related files**

---

## 🗂️ Key Tables (Database)

1. `task_templates` - Template blueprints
2. `task_fields` - Template field definitions
3. `task_instances` - Scheduled task instances
4. `task_completion_logs` - Completion records
5. `task_repeatable_labels` - Repeatable field labels
6. `checklist_tasks` - Checklist-specific tasks
7. `task_completion_records` - Completion tracking

---

## 🔄 Main Features

1. **Template Builder** - Create reusable task templates
2. **Task Generation** - Automatic task scheduling
3. **Task Completion** - Record completion with evidence
4. **Compliance Templates** - Pre-built compliance tasks
5. **Task Workflows** - Various workflow patterns
6. **Contractor Callouts** - Automatic contractor notifications
7. **Task Timing** - Scheduling and timing utilities
