# Task Templates Database Schema

## Overview

The task template system provides a plug-and-play compliance library with 18 pre-built templates covering food safety, health & safety, fire, cleaning, and compliance audit requirements.

## Entity Relationship Diagram

```
┌─────────────────────┐
│  task_templates     │
│  ─────────────────   │
│  id (PK)            │
│  company_id (FK)    │────┐
│  name               │    │
│  slug               │    │
│  category           │    │
│  frequency          │    │
│  repeatable_field   │    │
│  ...                │    │
└──────────┬──────────┘    │
           │               │
           │               │
    ┌──────┴──────┐        │
    │             │        │
    ▼             ▼        │
┌──────────┐  ┌──────────────┐
│task_fields│  │task_repeat │
│───────────│  │able_labels  │
│id (PK)   │  │id (PK)       │
│template_ │  │template_id(FK│
│id (FK)   │  │label_text    │
│field_name│  │order         │
│field_type│  └──────────────┘
│...       │
└──────────┘
           │
           │
           ▼
┌─────────────────────┐
│  task_instances     │
│  ─────────────────   │
│  id (PK)            │
│  template_id (FK)   │
│  company_id (FK)    │────────┐
│  scheduled_date     │        │
│  status             │        │
│  assigned_to_user   │        │
│  ...                │        │
└──────────┬──────────┘        │
           │                    │
           │                    │
           ▼                    │
┌─────────────────────┐         │
│task_completion_logs │         │
│────────────────────│         │
│id (PK)             │         │
│instance_id (FK)    │         │
│field_responses     │         │
│photos              │         │
│signatures          │         │
│completed_at        │         │
│...                 │         │
└────────────────────┘         │
                                │
                                │
                                ▼
                          ┌──────────┐
                          │companies │
                          │profiles  │
                          │sites     │
                          │assets    │
                          └──────────┘
```

## Tables

### 1. task_templates

**Purpose**: Core library templates for compliance tasks

**Key Columns**:

- `id` (UUID, PK) - Unique identifier
- `company_id` (UUID, FK) - NULL for global templates, company_id for custom
- `name` (TEXT) - Template name
- `slug` (TEXT) - Unique identifier per company
- `category` (TEXT) - 'food_safety', 'h_and_s', 'fire', 'cleaning', 'compliance'
- `frequency` (TEXT) - 'daily', 'weekly', 'monthly', 'triggered', 'once'
- `dayparts` (TEXT[]) - ['before_open', 'during_service', 'after_service']
- `assigned_to_role` (TEXT) - Role for assignment
- `repeatable_field_name` (TEXT) - For multi-record tasks
- `evidence_types` (TEXT[]) - Required evidence: ['photo', 'temperature', 'pass_fail', 'signature']
- `is_critical` (BOOLEAN) - Critical compliance flag
- `triggers_contractor_on_failure` (BOOLEAN) - Auto-notify contractor on failure
- `is_template_library` (BOOLEAN) - Part of plug-and-play library

**Constraints**:

- CHECK on category values
- CHECK on frequency values
- UNIQUE on (company_id, slug)

**Indexes**:

- `idx_task_templates_company_category` - Company + category filtering
- `idx_task_templates_library` - Library template filtering
- `idx_task_templates_slug` - Unique slug lookup
- `idx_task_templates_frequency` - Frequency-based queries

### 2. task_fields

**Purpose**: Dynamic fields for task templates

**Key Columns**:

- `id` (UUID, PK)
- `task_template_id` (UUID, FK) - References task_templates
- `field_name` (TEXT) - Internal field name
- `field_label` (TEXT) - Display label
- `field_type` (TEXT) - 'text', 'number', 'temperature', 'checkbox', 'pass_fail', 'select', 'date', 'signature'
- `is_required` (BOOLEAN) - Required field flag
- `min_value` (NUMERIC) - Minimum validation
- `max_value` (NUMERIC) - Maximum validation
- `options` (JSONB) - Options for select fields
- `display_order` (INTEGER) - Field ordering in form
- `help_text` (TEXT) - Help text for users

**Constraints**:

- CHECK on field_type values

**Indexes**:

- `idx_task_fields_template` - Lookup by template
- `idx_task_fields_order` - Ordering by template

### 3. task_instances

**Purpose**: Individual scheduled task instances

**Key Columns**:

- `id` (UUID, PK)
- `task_template_id` (UUID, FK) - References task_templates
- `company_id` (UUID, FK) - References companies
- `scheduled_date` (DATE) - Scheduled date
- `scheduled_time` (TIME) - Scheduled time
- `due_datetime` (TIMESTAMPTZ) - Due datetime
- `assigned_to_user_id` (UUID, FK) - References profiles
- `site_id` (UUID, FK) - References sites
- `asset_id` (UUID, FK) - References assets
- `status` (TEXT) - 'pending', 'in_progress', 'completed', 'skipped', 'overdue', 'failed'
- `completed_at` (TIMESTAMPTZ) - Completion timestamp
- `completed_by_user_id` (UUID, FK) - References profiles
- `failure_reason` (TEXT) - Failure reason
- `contractor_notified` (BOOLEAN) - Contractor notification flag

**Constraints**:

- CHECK on status values

**Indexes**:

- `idx_task_instances_template` - Lookup by template
- `idx_task_instances_company` - Company filtering
- `idx_task_instances_scheduled` - Date queries
- `idx_task_instances_status` - Status filtering
- `idx_task_instances_assigned` - Assignment lookup

### 4. task_completion_logs

**Purpose**: Actual completion data with field values and evidence

**Key Columns**:

- `id` (UUID, PK)
- `task_instance_id` (UUID, FK) - References task_instances
- `field_responses` (JSONB) - {field_name: value, ...}
- `photos` (TEXT[]) - Photo URLs
- `signatures` (JSONB) - Signature data
- `completed_by_user_id` (UUID, FK) - References profiles
- `completed_at` (TIMESTAMPTZ) - Completion timestamp
- `completion_location` (JSONB) - GPS coordinates
- `passed` (BOOLEAN) - Pass/fail result
- `failure_reason` (TEXT) - Failure reason
- `notes` (TEXT) - Completion notes

**Indexes**:

- `idx_task_completion_logs_instance` - Lookup by instance
- `idx_task_completion_logs_completed` - Date queries
- `idx_task_completion_logs_user` - User lookup
- `idx_task_completion_logs_passed` - Failure analysis

### 5. task_repeatable_labels

**Purpose**: Predefined labels for repeatable fields

**Key Columns**:

- `id` (UUID, PK)
- `task_template_id` (UUID, FK) - References task_templates
- `label_text` (TEXT) - Label text
- `display_order` (INTEGER) - Ordering
- `is_active` (BOOLEAN) - Active flag

**Indexes**:

- `idx_task_repeatable_labels_template` - Lookup by template
- `idx_task_repeatable_labels_order` - Ordering

## Relationships

### Foreign Keys

1. **task_templates**
   - `company_id` → companies.id
   - `assigned_to_user_id` → profiles.id
   - `site_id` → sites.id
   - `asset_id` → assets.id
   - `linked_sop_id` → sops.id

2. **task_fields**
   - `task_template_id` → task_templates.id (CASCADE DELETE)

3. **task_instances**
   - `task_template_id` → task_templates.id (CASCADE DELETE)
   - `company_id` → companies.id
   - `assigned_to_user_id` → profiles.id
   - `site_id` → sites.id
   - `asset_id` → assets.id
   - `completed_by_user_id` → profiles.id

4. **task_completion_logs**
   - `task_instance_id` → task_instances.id (CASCADE DELETE)
   - `completed_by_user_id` → profiles.id

5. **task_repeatable_labels**
   - `task_template_id` → task_templates.id (CASCADE DELETE)

## Indexes by Use Case

### Filtering Templates

- `idx_task_templates_company_category` - List templates by company and category
- `idx_task_templates_library` - List library templates
- `idx_task_templates_frequency` - Filter by frequency

### Task Instances

- `idx_task_instances_status` - Find pending/overdue tasks
- `idx_task_instances_assigned` - Find tasks assigned to user
- `idx_task_instances_scheduled` - Query by date range

### Completion Logs

- `idx_task_completion_logs_completed` - Query by completion date
- `idx_task_completion_logs_passed` - Find failures for reporting

## RLS Policies

All tables have Row Level Security enabled with policies that:

1. **SELECT**: Users can only see templates/instances for their company (or global templates)
2. **INSERT**: Users can create items for their company
3. **UPDATE**: Users can update items for their company
4. **DELETE**: Only owners/admins can delete templates

## Data Flow

1. **Template Creation**: Admin creates/clones template → Creates task_templates row → Adds task_fields → Adds task_repeatable_labels (if needed)
2. **Task Scheduling**: System creates task_instances from templates → Assigns to users/sites → Sets scheduled date/time
3. **Task Completion**: User completes task → Creates task_completion_logs → Fills field_responses → Uploads photos/signatures → Updates task_instances status
4. **Failure Handling**: If task fails → Checks triggers_contractor_on_failure → Notifies contractor → Logs failure_reason

## Field Types Supported

- **text**: Text input
- **number**: Numeric input with min/max validation
- **temperature**: Temperature input with range validation
- **checkbox**: Boolean checkbox
- **pass_fail**: Pass/Fail selector
- **select**: Dropdown with options
- **date**: Date picker
- **signature**: Signature capture

## Evidence Types

- **photo**: Photo upload required
- **temperature**: Temperature reading required
- **pass_fail**: Pass/fail check required
- **text_note**: Text note required
- **signature**: Signature required

## Compliance Standards Tracked

- Food Safety Act 1990
- HACCP
- Natasha's Law
- Cook Safe
- Health & Safety at Work Act 1974
- RIDDOR
- Manual Handling Regulations
- Fire Safety Order 2005
- Regulatory Reform (Fire Safety) Order 2005
- Environmental Health requirements
