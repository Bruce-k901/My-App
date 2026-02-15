-- Test inserting a contractor directly to verify columns work
-- This will help us see if the issue is with PostgREST or the table structure

-- First, check the actual table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'contractors'
ORDER BY ordinal_position;

-- Try a test insert (replace with your actual company_id)
-- This will show if the columns accept data
/*
INSERT INTO public.contractors (
  company_id,
  name,
  contact_name,
  email,
  phone,
  category,
  address
) VALUES (
  'YOUR_COMPANY_ID_HERE'::uuid,
  'Test Contractor',
  'Test Contact',
  'test@example.com',
  '1234567890',
  'Test Category',
  'Test Address'
) RETURNING id, name, contact_name, category, address;
*/

