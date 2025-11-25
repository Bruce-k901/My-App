-- Check what status values are currently allowed
SELECT con.conname, pg_get_constraintdef(con.oid) as constraint_definition
FROM pg_constraint con 
JOIN pg_class rel ON rel.oid = con.conrelid 
WHERE rel.relname = 'tasks' 
AND con.conname LIKE '%status%';

-- This will show you what the constraint allows
-- Common issue: constraint might allow 'todo' but code sends 'pending', or vice versa
