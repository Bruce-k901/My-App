-- Migration: Note about Pest Control Contractor Setup
-- Description: This is a documentation/note migration - does not create tables
-- Purpose: Reminds about setting up pest control contractors for the pest control inspection template

-- This migration file serves as documentation and a reminder
-- The actual contractor setup should be done through the UI or manual SQL

/*
 * PEST CONTROL CONTRACTOR SETUP REQUIREMENTS
 * ===========================================
 * 
 * The Weekly Pest Control Device Inspection template requires pest control contractors
 * to be set up in the contractors table. When a pest inspection fails (pass_fail = 'fail'),
 * the system will attempt to create a contractor callout.
 * 
 * To set up pest control contractors:
 * 
 * 1. Via UI (Recommended):
 *    - Navigate to the Contractors page
 *    - Add a new contractor
 *    - Set Category: 'food_safety' (or appropriate category)
 *    - Set Region: Match your site's region
 *    - Set Type: 'pest_control' (if available) or use appropriate type
 *    - Add contact information
 * 
 * 2. Via SQL (Manual):
 *    INSERT INTO public.contractors (
 *      company_id,
 *      name,
 *      category,
 *      region,
 *      type,
 *      email,
 *      phone,
 *      is_active
 *    ) VALUES (
 *      'your-company-id',
 *      'Pest Control Company Name',
 *      'food_safety',
 *      'your-region',
 *      'pest_control', -- or 'reactive' if type column doesn't support 'pest_control'
 *      'email@example.com',
 *      '123-456-7890',
 *      true
 *    );
 * 
 * IMPORTANT NOTES:
 * - The contractor_type in task_templates is set to 'pest_control'
 * - Ensure contractors match the site's region and category
 * - Contractors must have is_active = true to be used
 * - If no contractor is found, the callout will still be created but without a contractor assigned
 * 
 * To verify contractors are set up:
 * SELECT * FROM contractors 
 * WHERE category = 'food_safety' 
 *   AND (type = 'pest_control' OR name ILIKE '%pest%')
 *   AND is_active = true;
 */

-- This migration file is informational only - no actual schema changes
SELECT 'Pest Control Contractor Setup Documentation' AS note;


