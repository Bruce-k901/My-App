-- Complete Task System Migration
-- Creates all tables, indexes, policies, and seeds 18 templates

-- ============================================================================
-- PART 1: CREATE TABLES
-- ============================================================================

-- Include all table creation files
\i supabase/sql/create_task_templates_table.sql
\i supabase/sql/create_task_tables.sql
\i supabase/sql/create_task_repeatable_labels.sql

-- ============================================================================
-- PART 2: SEED TEMPLATES
-- ============================================================================

-- Include seed files
\i supabase/sql/seed_task_templates.sql
\i supabase/sql/seed_task_templates_part2.sql

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count seeded templates
SELECT COUNT(*) as total_templates FROM task_templates WHERE is_template_library = true;

-- Count templates by category
SELECT category, COUNT(*) as count 
FROM task_templates 
WHERE is_template_library = true 
GROUP BY category 
ORDER BY category;

-- Count templates with repeatable fields
SELECT COUNT(*) as templates_with_repeatable_fields 
FROM task_templates 
WHERE repeatable_field_name IS NOT NULL 
AND is_template_library = true;

-- Show all templates with their field counts
SELECT 
  tt.name,
  tt.category,
  tt.frequency,
  COUNT(tf.id) as field_count,
  COUNT(trl.id) as repeatable_label_count
FROM task_templates tt
LEFT JOIN task_fields tf ON tf.task_template_id = tt.id
LEFT JOIN task_repeatable_labels trl ON trl.task_template_id = tt.id
WHERE tt.is_template_library = true
GROUP BY tt.id, tt.name, tt.category, tt.frequency
ORDER BY tt.category, tt.name;

