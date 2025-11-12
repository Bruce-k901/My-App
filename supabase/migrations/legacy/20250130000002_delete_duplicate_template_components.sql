-- Migration: Delete duplicate templates that match the original special template components
-- These templates were auto-imported from src/data/compliance-templates.ts
-- but are duplicates of the original React component templates

-- Delete templates that match the original template component names/slugs
-- Using slugs is more reliable than names since names might vary

DELETE FROM public.template_fields
WHERE template_id IN (
  SELECT id FROM public.task_templates
  WHERE slug IN (
    'sfbb-temperature-checks',
    'hot-holding-temps',
    'fire-alarm-test',
    'emergency-lighting-test',
    'pat-testing',
    'probe-calibration',
    'extraction-service'
  )
  AND is_template_library = true
);

DELETE FROM public.task_templates
WHERE slug IN (
  'sfbb-temperature-checks',
  'hot-holding-temps',
  'fire-alarm-test',
  'emergency-lighting-test',
  'pat-testing',
  'probe-calibration',
  'extraction-service'
)
AND is_template_library = true;

-- Note: The getAllTemplates() function in src/data/compliance-templates.ts 
-- has been updated to return an empty array to prevent future auto-imports.
-- The original React component templates remain intact and are rendered
-- at the top of the compliance templates page.
