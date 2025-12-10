-- Check what values are allowed for channel_type in messaging_channels

-- Show the check constraint
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'messaging_channels'::regclass
AND contype = 'c'
AND conname LIKE '%channel_type%';

-- Show all check constraints on the table
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'messaging_channels'::regclass
AND contype = 'c';

