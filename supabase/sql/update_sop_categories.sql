-- Update sop_entries.category to support all SOP types
-- Drop the old constraint and add a new one with all categories

-- First, drop the existing constraint
ALTER TABLE sop_entries DROP CONSTRAINT IF EXISTS sop_entries_category_check;

-- Add the new constraint with all SOP categories
ALTER TABLE sop_entries ADD CONSTRAINT sop_entries_category_check 
CHECK (category IN (
  'Food Prep',
  'Service (FOH)',
  'Drinks',
  'Hot Beverages',
  'Cold Beverages',
  'Cleaning',
  'Opening',
  'Closing'
));

-- Verify the constraint
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'sop_entries_category_check';

