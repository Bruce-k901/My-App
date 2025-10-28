# Task System Database Setup

## Overview

Complete compliance task template system with 18 pre-built templates covering food safety, health & safety, fire, cleaning, and compliance audit requirements.

## Tables Created

1. **task_templates** - Core library templates with scheduling, assignment, and compliance metadata
2. **task_fields** - Dynamic fields for templates (temperature, pass/fail, signatures, etc.)
3. **task_instances** - Individual scheduled task instances from templates
4. **task_completion_logs** - Actual completion data with field responses and evidence
5. **task_repeatable_labels** - Predefined labels for repeatable fields (e.g., fridge names)

## Apply Migrations

Run these SQL files in order in your Supabase SQL editor:

```sql
-- 1. Create all tables
\i supabase/sql/create_task_templates_table.sql
\i supabase/sql/create_task_tables.sql
\i supabase/sql/create_task_repeatable_labels.sql

-- 2. Seed templates
\i supabase/sql/seed_task_templates.sql
\i supabase/sql/seed_task_templates_part2.sql
```

Or use the consolidated migration:

```sql
\i supabase/migrations/20250123000000_create_task_system.sql
```

## Verification

After applying migrations, run these queries to verify:

```sql
-- Count templates
SELECT COUNT(*) FROM task_templates WHERE is_template_library = true;
-- Should return: 18

-- Count by category
SELECT category, COUNT(*) FROM task_templates
WHERE is_template_library = true
GROUP BY category;

-- Show templates with field counts
SELECT
  tt.name,
  tt.category,
  COUNT(tf.id) as fields,
  COUNT(trl.id) as repeatable_labels
FROM task_templates tt
LEFT JOIN task_fields tf ON tf.task_template_id = tt.id
LEFT JOIN task_repeatable_labels trl ON trl.task_template_id = tt.id
WHERE tt.is_template_library = true
GROUP BY tt.id, tt.name, tt.category
ORDER BY tt.category, tt.name;
```

## Template Summary

**Food Safety (6):**

- FS-001: Fridge Temperature Check (repeatable: fridge names)
- FS-002: Hot Hold Temperature Check (repeatable: hot hold units)
- FS-003: Allergen Board Verification (CRITICAL)
- FS-004: Stock Rotation & FIFO
- FS-005: Delivery Acceptance Check
- FS-006: Deep Clean Checklist

**Health & Safety (3):**

- HS-001: Pre-Opening Safety Walkthrough (CRITICAL)
- HS-002: Incident & Accident Report (CRITICAL)
- HS-003: Manual Handling Safety Check

**Fire & Security (3):**

- FR-001: Fire Alarm Test (CRITICAL)
- FR-002: Emergency Exit Check (CRITICAL)
- FR-003: Fire Extinguisher Inspection (repeatable: locations)

**Cleaning & Maintenance (3):**

- CL-001: FOH Deep Clean Checklist
- CL-002: Pest Control Log
- CL-003: Equipment PPM (triggers contractor)

**Compliance & Audit (3):**

- CP-001: Monthly Compliance Audit (CRITICAL)
- CP-002: SOP Review & Update
- CP-003: Training Records Review

## Key Features

- ✅ 18 fully-configured templates
- ✅ Repeatable fields for multi-record tasks (fridges, hot holds, extinguishers)
- ✅ Critical compliance flags (9 templates marked critical)
- ✅ Evidence types (photos, temperatures, signatures, pass/fail)
- ✅ Contractor triggers on failure
- ✅ Scheduling (daily, weekly, monthly, triggered)
- ✅ Field validation (min/max values, required fields)
- ✅ RLS policies for security
- ✅ Proper indexing for performance

## Next Steps

1. Apply migrations to your Supabase database
2. Verify templates are seeded correctly
3. Build frontend components for:
   - Template library browser
   - Task instance scheduler
   - Completion form builder
   - Reporting dashboard
4. Integrate with contractor system for failure notifications
