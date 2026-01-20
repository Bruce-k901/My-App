# Preventing Task Data Loss in Production

## 🚨 Critical Issue

The `site_checklists` table stores user-configured recurring task patterns ("My Tasks"). This data was lost due to a migration that used `DROP TABLE IF EXISTS site_checklists CASCADE;`.

## ✅ Safeguards Implemented

### 1. Soft Delete Support
- Added `archived_at` column to `site_checklists`
- Use `archive_site_checklist()` function instead of DELETE
- Data is preserved in `site_checklists_archive` table

### 2. Automatic Backup
- Trigger automatically backs up data before hard delete
- All deletions are logged in `site_checklists_archive`
- Can restore using `restore_site_checklist_from_archive()`

### 3. Migration Guidelines

**❌ NEVER DO THIS:**
```sql
DROP TABLE IF EXISTS site_checklists CASCADE;
TRUNCATE site_checklists;
DELETE FROM site_checklists; -- Without WHERE clause
```

**✅ ALWAYS DO THIS:**
```sql
-- For single deletion
SELECT archive_site_checklist('uuid-here', 'Reason for deletion');

-- For bulk operations, use WHERE clause and archive individually
-- Or create a migration that uses archive function
```

### 4. Recovery Procedures

#### Restore a Single Checklist
```sql
SELECT restore_site_checklist_from_archive('uuid-here');
```

#### View Archived Items
```sql
SELECT * FROM site_checklists_archive 
WHERE archived_at > NOW() - INTERVAL '30 days'
ORDER BY archived_at DESC;
```

#### Restore All Recently Archived
```sql
-- Restore all items archived in last 24 hours
DO $$
DECLARE
  v_record RECORD;
BEGIN
  FOR v_record IN 
    SELECT DISTINCT id 
    FROM site_checklists_archive 
    WHERE archived_at > NOW() - INTERVAL '24 hours'
  LOOP
    PERFORM restore_site_checklist_from_archive(v_record.id);
  END LOOP;
END $$;
```

## 🔒 Production Deployment Checklist

Before deploying any migration that touches `site_checklists`:

1. ✅ **Backup First**
   ```sql
   -- Create manual backup
   CREATE TABLE site_checklists_backup_YYYYMMDD AS 
   SELECT * FROM site_checklists;
   ```

2. ✅ **Review Migration**
   - Check for `DROP TABLE`, `TRUNCATE`, or unqualified `DELETE`
   - Ensure migrations are idempotent (can run multiple times safely)
   - Use `IF EXISTS` checks for schema changes

3. ✅ **Test in Development**
   - Test migration on development database first
   - Verify data integrity after migration
   - Check that user configurations are preserved

4. ✅ **Use Soft Deletes**
   - Always use `archive_site_checklist()` function
   - Never hard delete user data

5. ✅ **Monitor After Deployment**
   - Check `site_checklists_archive` for unexpected deletions
   - Verify task generation still works
   - Check user reports of missing configurations

## 📋 Migration Template (Safe)

```sql
-- ============================================================================
-- Migration: [Description]
-- Date: YYYY-MM-DD
-- ============================================================================
-- SAFE MIGRATION TEMPLATE
-- ============================================================================

BEGIN;

-- Step 1: Check if table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'site_checklists'
  ) THEN
    RAISE EXCEPTION 'site_checklists table does not exist';
  END IF;
END $$;

-- Step 2: Add column (example - use IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'site_checklists' 
    AND column_name = 'new_column'
  ) THEN
    ALTER TABLE site_checklists 
    ADD COLUMN new_column TEXT;
  END IF;
END $$;

-- Step 3: Update data (if needed)
-- UPDATE site_checklists SET ... WHERE ...;

-- Step 4: Verify
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM site_checklists;
  RAISE NOTICE 'site_checklists count: %', v_count;
END $$;

COMMIT;
```

## 🚫 What NOT to Do

1. **Never use DROP TABLE in migrations** - Always use ALTER TABLE
2. **Never use TRUNCATE** - Use soft delete or archive
3. **Never DELETE without WHERE** - Always specify conditions
4. **Never skip backups** - Always backup before destructive operations
5. **Never deploy untested migrations** - Test in development first

## 📞 Emergency Recovery

If data is lost:

1. Check `site_checklists_archive` table
2. Use `restore_site_checklist_from_archive()` function
3. If archive is empty, check database backups
4. Contact database administrator for point-in-time recovery

## 🔍 Monitoring Queries

```sql
-- Check for unexpected deletions
SELECT 
  DATE(archived_at) as date,
  COUNT(*) as deleted_count,
  archived_reason
FROM site_checklists_archive
WHERE archived_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(archived_at), archived_reason
ORDER BY date DESC;

-- Check active vs archived
SELECT 
  (SELECT COUNT(*) FROM site_checklists WHERE archived_at IS NULL) as active,
  (SELECT COUNT(*) FROM site_checklists_archive) as archived;
```
