# Task Templates System - Complete File Map & Connections

## 📋 Overview

This document maps all files related to the task template system and shows how they connect to create the complete workflow from template creation → task generation → task completion.

---

## 🔗 Core Data Flow

```
1. Template Creation (MasterTemplateModal)
   ↓
2. Database Storage (task_templates table)
   ↓
3. Task Generation (Cron/Edge Function)
   ↓
4. Task Instances (checklist_tasks table)
   ↓
5. Task Display (Checklist Pages)
   ↓
6. Task Completion (TaskCompletionModal)
   ↓
7. Completion Records (task_completion_records table)
```

---

## 📁 File Organization by Layer

### 🗄️ **DATABASE LAYER**

#### Schema & Migrations

- **`supabase/migrations/001_create_checklist_schema.sql`**
  - Creates core tables: `task_templates`, `template_fields`, `template_repeatable_labels`, `checklist_tasks`, `task_completion_records`
  - Defines relationships, indexes, RLS policies
  - **Connects to**: All application layers

- **`supabase/migrations/001_create_task_template_schema.sql`**
  - Alternative/earlier schema definition for `task_templates`
  - **Connects to**: TypeScript types, MasterTemplateModal

- **`supabase/migrations/20250201000002_add_task_data_to_checklist_tasks.sql`**
  - Adds `task_data` JSONB column to `checklist_tasks` for instance-specific data
  - **Connects to**: Task generation, TaskFromTemplateModal

- **`supabase/migrations/20250202000003_setup_task_generation_cron.sql`**
  - Creates `generate_daily_tasks_direct()` PostgreSQL function
  - Sets up pg_cron job for automated task generation
  - **Connects to**: Database cron, task generation logic

#### Template Seed Data

- **`supabase/migrations/20250202000001_add_sfbb_temperature_template.sql`**
- **`supabase/migrations/20250202000002_add_fridge_freezer_temperature_template.sql`**
- **`supabase/migrations/20250204000001_add_hot_holding_temperature_template.sql`**
  - Seed compliance templates into `task_templates` and related tables
  - **Connects to**: Compliance templates page, template library

---

### ⚙️ **BACKEND/SERVER LAYER**

#### Task Generation Functions

- **`supabase/functions/generate-daily-tasks/index.ts`**
  - Supabase Edge Function for generating tasks
  - Reads `task_templates`, creates `checklist_tasks` instances
  - Handles multiple dayparts and times per daypart
  - **Connects to**: `task_templates` table → `checklist_tasks` table
  - **Called by**: Cron job, manual triggers, API routes

#### API Routes

- **`src/app/api/compliance/import-templates/route.ts`**
  - Imports compliance templates into database
  - **Connects to**: Compliance templates data, `task_templates` table

---

### 🎨 **FRONTEND - TEMPLATE MANAGEMENT**

#### Template Builder

- **`src/components/templates/MasterTemplateModal.tsx`**
  - Main modal for creating/editing task templates
  - Saves to `task_templates` table
  - Handles scheduling, features, fields configuration
  - **Connects to**: `task_templates` table (INSERT/UPDATE)
  - **Used by**: Templates page, Builder page

#### Task Creation from Template

- **`src/components/templates/TaskFromTemplateModal.tsx`**
  - Creates individual `checklist_tasks` from a template
  - Allows customization of template fields
  - Loads library data (equipment, assets, etc.)
  - **Connects to**: `task_templates` (read) → `checklist_tasks` (create)
  - **Used by**: Templates page, Active tasks page

#### Template Display Pages

- **`src/app/dashboard/tasks/templates/page.tsx`**
  - Lists user-created templates (`is_template_library = false`)
  - Shows usage counts, delete functionality
  - Opens `MasterTemplateModal` for editing
  - Opens `TaskFromTemplateModal` for creating tasks
  - **Connects to**: `task_templates` table (SELECT)

- **`src/app/dashboard/tasks/compliance/page.tsx`**
  - Displays compliance library templates (`is_template_library = true`)
  - **Connects to**: `task_templates` table (SELECT)

- **`src/app/dashboard/tasks/templates/builder/page.tsx`**
  - Template builder page
  - Opens `MasterTemplateModal` for new templates
  - **Connects to**: MasterTemplateModal

---

### 📋 **FRONTEND - TASK DISPLAY & COMPLETION**

#### Task List Pages

- **`src/app/dashboard/checklists/page.tsx`**
  - "Today's Tasks" page
  - Fetches `checklist_tasks` for today
  - Joins with `task_templates` for template data
  - Handles task deduplication, daypart sorting
  - **Connects to**: `checklist_tasks` + `task_templates` (JOIN)
  - **Uses**: TaskCard, TaskCompletionModal

- **`src/app/dashboard/tasks/active/page.tsx`**
  - Active tasks list
  - **Connects to**: `checklist_tasks` table

- **`src/app/dashboard/tasks/completed/page.tsx`**
  - Completed tasks list
  - **Connects to**: `checklist_tasks` + `task_completion_records`

#### Task Components

- **`src/components/checklists/TaskCard.tsx`**
  - Displays individual task card
  - Shows task info, template details, status
  - Opens TaskCompletionModal on click
  - **Connects to**: ChecklistTaskWithTemplate type

- **`src/components/checklists/CompletedTaskCard.tsx`**
  - Displays completed task card
  - Shows completion data and evidence
  - **Connects to**: CompletedTaskWithRecord type

- **`src/components/checklists/TaskCompletionModal.tsx`**
  - Modal for completing tasks
  - Handles form fields, evidence uploads, signatures
  - Saves to `task_completion_records` table
  - Updates `checklist_tasks` status
  - **Connects to**: `checklist_tasks` (UPDATE) + `task_completion_records` (INSERT)

---

### 📊 **TYPES & UTILITIES**

#### TypeScript Types

- **`src/types/checklist.ts`**
  - Defines `TaskTemplate`, `TaskTemplateInsert`, `ChecklistTask` types
  - **Used by**: All components working with templates/tasks

- **`src/types/checklist-types.ts`**
  - Defines `ChecklistTaskWithTemplate` (task + template data)
  - **Used by**: Task display components

- **`src/types/supabase.ts`**
  - Auto-generated Supabase types (if available)
  - **Used by**: Database queries throughout app

#### Utility Functions

- **`src/utils/taskTiming.ts`**
  - `calculateTaskTiming()` - calculates due times from dayparts
  - **Used by**: Checklists page, task display

- **`src/lib/task-generation.ts`**
  - Task generation utilities
  - **Used by**: Task generation functions

---

### 📚 **DATA & STATIC FILES**

- **`src/data/compliance-templates.ts`**
  - Static compliance template definitions
  - **Connects to**: Compliance templates page, import API

---

## 🔄 **KEY CONNECTIONS BREAKDOWN**

### 1. **Template Creation Flow**

```
MasterTemplateModal.tsx
  → INSERT INTO task_templates
  → INSERT INTO template_fields (if custom fields)
  → INSERT INTO template_repeatable_labels (if repeatable)
```

### 2. **Task Generation Flow**

```
Cron Job (PostgreSQL) / Edge Function
  → SELECT FROM task_templates (WHERE frequency = 'daily' AND is_active = true)
  → SELECT FROM sites (WHERE active)
  → FOR EACH template + site + daypart-time combination:
      → INSERT INTO checklist_tasks
      → Store template metadata in task_data JSONB
```

### 3. **Task Display Flow**

```
checklists/page.tsx
  → SELECT checklist_tasks.*, task_templates.*
  → JOIN checklist_tasks.template_id = task_templates.id
  → Process and deduplicate
  → Render TaskCard components
```

### 4. **Task Completion Flow**

```
TaskCompletionModal.tsx
  → User fills form with template_fields
  → INSERT INTO task_completion_records (completion_data, evidence)
  → UPDATE checklist_tasks SET status = 'completed'
```

---

## 📊 **Database Relationships**

```
task_templates (1) ──┐
                     │
                     ├──→ (1:N) checklist_tasks
                     │
template_fields (N) ──┘
                     │
template_repeatable_labels (N)
                     │
                     └──→ (1:N) checklist_tasks
                              │
                              └──→ (1:1) task_completion_records
```

---

## 🎯 **Key Files by Function**

### Template Management

- `MasterTemplateModal.tsx` - Create/edit templates
- `src/app/dashboard/tasks/templates/page.tsx` - List templates
- `TaskFromTemplateModal.tsx` - Create tasks from templates

### Task Generation

- `supabase/functions/generate-daily-tasks/index.ts` - Edge function
- `supabase/migrations/20250202000003_setup_task_generation_cron.sql` - Cron job

### Task Display

- `src/app/dashboard/checklists/page.tsx` - Today's tasks
- `src/components/checklists/TaskCard.tsx` - Task card UI
- `src/components/checklists/TaskCompletionModal.tsx` - Complete task

### Database Schema

- `supabase/migrations/001_create_checklist_schema.sql` - Core schema
- `supabase/migrations/20250201000002_add_task_data_to_checklist_tasks.sql` - Task data field

### Types & Utilities

- `src/types/checklist.ts` - TypeScript types
- `src/utils/taskTiming.ts` - Timing calculations

---

## 🔍 **Search Patterns**

To find files related to task templates:

- **Grep**: `task_templates|taskTemplates|TaskTemplate`
- **Grep**: `checklist_tasks|checklistTasks|ChecklistTask`
- **Glob**: `**/*template*.tsx`, `**/*template*.ts`

---

## 📝 **Notes**

1. **Template Library vs User Templates**:
   - `is_template_library = true` → Compliance library (read-only)
   - `is_template_library = false` → User-created (editable)

2. **Task Data Storage**:
   - Template config → `task_templates` table
   - Instance config → `checklist_tasks.task_data` JSONB
   - Completion data → `task_completion_records.completion_data` JSONB

3. **Scheduling**:
   - `recurrence_pattern.daypart_times` stores multiple times per daypart
   - Cron generates tasks daily at 3am UTC
   - Each daypart-time combination creates a separate `checklist_task`

---

**Last Updated**: 2025-02-04
**Generated by**: MCP Test Query
