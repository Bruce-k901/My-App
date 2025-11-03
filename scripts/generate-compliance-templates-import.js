const fs = require('fs');
const path = require('path');

// Read the parsed JSON
const dataPath = path.join(__dirname, '..', 'data', 'compliance_checklist_parsed.json');
const tasks = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Helper function to create slug from name
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100); // Limit length
}

// Map categories
const categoryMap = {
  'Food Safety': 'food_safety',
  'Health & Safety': 'h_and_s',
  'Fire Safety': 'fire',
  'Cleaning': 'cleaning',
  'Compliance': 'compliance'
};

// Map frequencies
const frequencyMap = {
  'Daily': 'daily',
  'Weekly': 'weekly',
  'Monthly': 'monthly',
  'Quarterly': 'quarterly',
  'Biannual': 'quarterly', // Two times per year, using quarterly as closest match
  'Annual': 'annually',
  'As Occurs': 'triggered',
  'Ongoing': 'daily' // Default ongoing to daily
};

// Function to parse evidence types
function parseEvidenceTypes(evidenceStr) {
  if (!evidenceStr || !evidenceStr.trim()) return [];
  
  // Split by comma or semicolon, trim, and filter empty
  return evidenceStr
    .split(/[,;]/)
    .map(e => e.trim())
    .filter(e => e.length > 0);
}

// Escape SQL strings
function escapeSQL(str) {
  if (!str) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

// Generate SQL with DO block for company_id handling
const insertStatements = [];

tasks.forEach((task, index) => {
  const category = categoryMap[task.Category] || 'compliance';
  const frequency = frequencyMap[task.Frequency] || 'monthly';
  const slug = createSlug(task['Task Name']);
  const evidenceTypes = parseEvidenceTypes(task['Linked Evidence'] || '');
  
  // Build evidence_types array SQL
  const evidenceTypesSQL = evidenceTypes.length > 0 
    ? `ARRAY[${evidenceTypes.map(e => `'${e.replace(/'/g, "''")}'`).join(', ')}]`
    : `ARRAY[]::TEXT[]`;

  const sql = `    INSERT INTO public.task_templates (
      company_id,
      name,
      slug,
      description,
      category,
      audit_category,
      frequency,
      instructions,
      evidence_types,
      is_critical,
      is_active,
      is_template_library,
      created_at,
      updated_at
    ) VALUES (
      v_company_id,
      ${escapeSQL(task['Task Name'])},
      ${escapeSQL(`${slug}-${index + 1}`)},
      ${escapeSQL(task['Description / Notes'])},
      ${escapeSQL(category)},
      ${escapeSQL(task['Sub-Category'])},
      ${escapeSQL(frequency)},
      ${escapeSQL(task['Description / Notes'])},
      ${evidenceTypesSQL},
      FALSE,
      TRUE,
      TRUE,
      NOW(),
      NOW()
    );`;

  insertStatements.push(sql);
});

// Generate full SQL migration
const fullSQL = `-- EHO Compliance Checklist Import
-- Generated from: EHO_Compliance_Checklist.xlsx
-- Total tasks: ${tasks.length}
-- Date: ${new Date().toISOString().split('T')[0]}

-- This migration imports EHO compliance tasks into the task_templates table
-- 
-- Usage Options:
-- 1. Import for ALL companies: Uncomment the "FOR all companies" section below
-- 2. Import for SPECIFIC company: Replace 'YOUR_COMPANY_ID' with actual UUID in the single company section
-- 
-- To find your company_id:
--   SELECT id, name FROM public.companies;

DO $$
DECLARE
  v_company_id UUID;
BEGIN
  -- OPTION 1: Import for a single specific company (default - recommended)
  -- Replace 'YOUR_COMPANY_ID_HERE' with your actual company_id UUID
  -- Example: v_company_id := '550e8400-e29b-41d4-a716-446655440000'::UUID;
  
  -- v_company_id := 'YOUR_COMPANY_ID_HERE'::UUID;
  
  -- Uncomment the above line and add your company_id, then comment out OPTION 2 below
  
  -- OPTION 2: Import for ALL companies (uncomment to use)
  -- FOR v_company_id IN SELECT id FROM public.companies LOOP
  
  -- For now, we'll require manual company_id setting for safety
  -- If you want to import for all companies, uncomment the FOR loop above
  -- and add END LOOP; after the INSERT statements
  
  RAISE NOTICE 'Please set v_company_id before running this migration';
  RAISE EXCEPTION 'Company ID not set. Please edit this migration and set v_company_id.';
  
  -- Placeholder - this will error until company_id is set
  v_company_id := NULL;

${insertStatements.join('\n')}

  -- END LOOP; -- Uncomment if using OPTION 2 (FOR loop)

END $$;

-- Verification query (run after migration to check results)
-- Replace YOUR_COMPANY_ID with your actual company_id
/*
SELECT 
  category,
  audit_category,
  COUNT(*) as task_count
FROM public.task_templates
WHERE company_id = 'YOUR_COMPANY_ID'::UUID
  AND is_template_library = TRUE
GROUP BY category, audit_category
ORDER BY category, audit_category;
*/

-- Summary by category
-- Replace YOUR_COMPANY_ID with your actual company_id
/*
SELECT 
  category,
  COUNT(*) as total_tasks
FROM public.task_templates
WHERE company_id = 'YOUR_COMPANY_ID'::UUID
  AND is_template_library = TRUE
GROUP BY category
ORDER BY category;
*/
`;

// Write SQL file
const outputPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250128000004_import_eho_compliance_checklist.sql');
fs.writeFileSync(outputPath, fullSQL);

// Also create a simpler version with explicit company_id placeholder for manual editing
const simpleSQL = `-- EHO Compliance Checklist Import (Simple Version)
-- Generated from: EHO_Compliance_Checklist.xlsx
-- Total tasks: ${tasks.length}
-- 
-- INSTRUCTIONS:
-- 1. Find your company_id: SELECT id, name FROM public.companies;
-- 2. Replace 'YOUR_COMPANY_ID_HERE' below with your company_id UUID
-- 3. Run this script in Supabase SQL Editor

${tasks.map((task, index) => {
  const category = categoryMap[task.Category] || 'compliance';
  const frequency = frequencyMap[task.Frequency] || 'monthly';
  const slug = createSlug(task['Task Name']);
  const evidenceTypes = parseEvidenceTypes(task['Linked Evidence'] || '');
  const evidenceTypesSQL = evidenceTypes.length > 0 
    ? `ARRAY[${evidenceTypes.map(e => `'${e.replace(/'/g, "''")}'`).join(', ')}]`
    : `ARRAY[]::TEXT[]`;

  return `INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'YOUR_COMPANY_ID_HERE'::UUID,
  ${escapeSQL(task['Task Name'])},
  ${escapeSQL(`${slug}-${index + 1}`)},
  ${escapeSQL(task['Description / Notes'])},
  ${escapeSQL(category)},
  ${escapeSQL(task['Sub-Category'])},
  ${escapeSQL(frequency)},
  ${escapeSQL(task['Description / Notes'])},
  ${evidenceTypesSQL},
  FALSE, TRUE, TRUE, NOW(), NOW()
);`;
}).join('\n\n')}
`;

const simpleOutputPath = path.join(__dirname, '..', 'supabase', 'sql', 'import_eho_compliance_checklist_simple.sql');
fs.writeFileSync(simpleOutputPath, simpleSQL);

console.log(`✅ Generated SQL migration: ${outputPath}`);
console.log(`✅ Generated simple SQL script: ${simpleOutputPath}`);
console.log(`📊 Total tasks to import: ${tasks.length}`);
console.log('\n📋 Category breakdown:');
const categoryBreakdown = {};
tasks.forEach(t => {
  const cat = categoryMap[t.Category] || 'compliance';
  categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
});
Object.entries(categoryBreakdown).forEach(([cat, count]) => {
  console.log(`   ${cat}: ${count}`);
});
console.log('\n⚠️  IMPORTANT: Before running the migration, edit it to set your company_id!');
