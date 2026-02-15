-- Remove duplicate migration entries that were marked as applied
-- but the SQL hasn't actually been executed yet
-- This allows the CLI to properly apply them

DELETE FROM supabase_migrations.schema_migrations
WHERE version IN (
    '20250115000000',
    '20250131000012',
    '20250212000001',
    '20250215000000',
    '20250220000000',
    '20250220000001',
    '20250221000001',
    '20250221000003',
    '20250315000001',
    '20250320000001',
    '20250320000002'
);

-- Verify removal
SELECT version, name 
FROM supabase_migrations.schema_migrations
WHERE version IN (
    '20250115000000',
    '20250131000012',
    '20250212000001',
    '20250215000000',
    '20250220000000',
    '20250220000001',
    '20250221000001',
    '20250221000003',
    '20250315000001',
    '20250320000001',
    '20250320000002'
);
