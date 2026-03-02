-- ============================================================================
-- CHECK REMOTE MIGRATION STATUS
-- ============================================================================
-- Run this in Supabase SQL Editor to see what migrations are currently
-- applied on the remote database
-- ============================================================================

SELECT 
    version,
    name
FROM supabase_migrations.schema_migrations
ORDER BY version ASC;

-- Count total migrations
SELECT COUNT(*) as total_migrations 
FROM supabase_migrations.schema_migrations;

