# Checklist Schema Updates - Per Dev Brief

## ✅ Changes Made to Match DEV_BRIEF_Checklist_Database.md

### Table Name Updates

| Old Name | New Name (Per Dev Brief) |
|---------|-------------------------|
| `task_fields` | `template_fields` ✅ |
| `task_instances` | `checklist_tasks` ✅ |
| `task_completion_logs` | `task_completion_records` ✅ |
| N/A | `contractor_callouts` ✅ NEW |

### Field Name Updates

**template_fields:**
- Old: `task_template_id` → New: `template_id` ✅
- Old: `display_order` → New: `field_order` ✅
- Old: `field_label` → New: `label` ✅
- Added: `warn_threshold`, `fail_threshold` ✅
- Added: `label_value` for repeatable labels ✅

**checklist_tasks:**
- Old: `task_template_id` → New: `template_id` ✅
- Old: `completed_by_user_id` → New: `completed_by` ✅
- Added: `daypart` field ✅
- Added: `priority` field ✅
- Added: `flagged`, `flag_reason` ✅
- Added: `escalated`, `escalated_to`, `escalation_reason` ✅
- Added: `generated_at`, `expires_at` ✅

**task_completion_records:**
- Old: `task_instance_id` → New: `task_id` ✅
- Old: `completed_by_user_id` → New: `completed_by` ✅
- Old: `field_responses` → New: `completion_data` ✅
- Old: `photos` → New: `evidence_attachments` ✅
- Added: `duration_seconds` ✅
- Added: `sop_acknowledged`, `risk_acknowledged` ✅

### New Table: contractor_callouts

Complete contractor callout system for when tasks fail:
- Links to triggering task and template
- Contractor assignment
- Status tracking (requested → scheduled → in_progress → completed)
- Evidence attachments (completion photos, invoices)
- Priority levels

### Frequency Options Updated

Added: 'quarterly', 'annually' to match dev brief ✅

### Field Types Updated

Added: 'repeatable_record' as a field type ✅

### Compliance Standards Tracked

- Food Safety Act 1990
- HACCP
- Natasha's Law
- Cook Safe
- Health & Safety at Work Act 1974
- RIDDOR
- Manual Handling Regulations
- Fire Safety Order 2005
- Regulatory Reform (Fire Safety) Order 2005

## Files Updated

### Migrations
- ✅ `supabase/migrations/001_create_checklist_schema.sql` - Complete schema with correct table names
- ✅ `supabase/migrations/001_create_checklist_schema.down.sql` - Rollback script
- ✅ `supabase/migrations/002_seed_compliance_library.sql` - Seed migration starter

### Documentation (to be updated)
- ⏳ `supabase/sql/schema.md` - Update table names and relationships
- ⏳ `supabase/sql/queries.sql` - Update queries to use new table names
- ⏳ `TASK_TEMPLATES_SETUP.md` - Update references

## Next Steps

1. Complete seed file for all 18 templates using new table names
2. Update all queries to use `template_fields`, `checklist_tasks`, `task_completion_records`
3. Update TypeScript types once schema is deployed
4. Test migrations locally
5. Deploy to production

## Key Differences from Previous Implementation

| Feature | Previous | Dev Brief |
|---------|----------|-----------|
| Task instances table | `task_instances` | `checklist_tasks` |
| Fields table | `task_fields` | `template_fields` |
| Completion table | `task_completion_logs` | `task_completion_records` |
| Contractor system | Trigger flag only | Full `contractor_callouts` table |
| Repeatable field type | select | repeatable_record |
| Completion data | field_responses JSONB | completion_data JSONB |
| Evidence storage | photos TEXT[] | evidence_attachments TEXT[] |

## Migration Notes

When running migrations, ensure:
1. Run `001_create_checklist_schema.sql` first
2. Then run `002_seed_compliance_library.sql`
3. Verify with queries using new table names
4. Old table names (`task_fields`, `task_instances`) will not exist - these are the NEW table names

