-- Check the actual columns in the sites table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'sites'
ORDER BY ordinal_position;

