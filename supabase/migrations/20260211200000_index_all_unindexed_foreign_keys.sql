-- ============================================================================
-- Migration: Index ALL Unindexed Foreign Keys
-- Description: Dynamically finds every foreign key constraint in public/stockly
--              schemas that lacks a covering index and creates one.
--
-- Why: Unindexed FKs cause sequential scans on JOIN, DELETE cascade, and
--      ON UPDATE cascade operations. Adding indexes makes these O(log n).
--
-- How it works:
--   1. Queries pg_constraint for all FK constraints
--   2. Checks pg_index for a covering index on the FK columns
--   3. Creates a btree index for any missing ones
--   4. Uses IF NOT EXISTS so it's safe to run multiple times (idempotent)
--
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  idx_name TEXT;
  col_names TEXT;
  create_sql TEXT;
  created_count INTEGER := 0;
  skipped_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Starting unindexed foreign key scan ===';

  FOR r IN
    SELECT
      con.conname AS fkey_name,
      nsp.nspname AS schema_name,
      cls.relname AS table_name,
      con.conkey AS fkey_col_nums,
      -- Build column name list from attribute numbers
      (
        SELECT string_agg(att.attname, ', ' ORDER BY ord.pos)
        FROM unnest(con.conkey) WITH ORDINALITY AS ord(attnum, pos)
        JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ord.attnum
      ) AS column_names,
      -- Build column name array for index check
      (
        SELECT array_agg(att.attname ORDER BY ord.pos)
        FROM unnest(con.conkey) WITH ORDINALITY AS ord(attnum, pos)
        JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ord.attnum
      ) AS column_name_array,
      con.conrelid
    FROM pg_constraint con
    JOIN pg_class cls ON cls.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
    WHERE con.contype = 'f'  -- foreign key
      AND nsp.nspname IN ('public', 'stockly')
    ORDER BY nsp.nspname, cls.relname, con.conname
  LOOP
    -- Check if a covering index already exists for these columns
    -- An index "covers" the FK if its leading columns match the FK columns
    IF EXISTS (
      SELECT 1
      FROM pg_index idx
      JOIN pg_class idx_cls ON idx_cls.oid = idx.indexrelid
      WHERE idx.indrelid = r.conrelid
        AND (
          -- The index's leading columns must include all FK columns (in order)
          r.fkey_col_nums <@ idx.indkey[0:array_length(r.fkey_col_nums, 1) - 1]
        )
    ) THEN
      skipped_count := skipped_count + 1;
      CONTINUE;
    END IF;

    -- Build index name: idx_{table}_{col1}_{col2}_fkey
    idx_name := 'idx_' || r.table_name || '_' || replace(r.column_names, ', ', '_');

    -- Truncate if too long (max identifier length is 63 chars)
    IF length(idx_name) > 63 THEN
      idx_name := left(idx_name, 55) || '_' || left(md5(r.fkey_name), 7);
    END IF;

    -- Build CREATE INDEX statement
    create_sql := format(
      'CREATE INDEX IF NOT EXISTS %I ON %I.%I (%s)',
      idx_name,
      r.schema_name,
      r.table_name,
      r.column_names
    );

    BEGIN
      EXECUTE create_sql;
      created_count := created_count + 1;
      RAISE NOTICE 'Created: %s.% (%s)', r.schema_name, r.table_name, r.column_names;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create index on %.%(%s): %', r.schema_name, r.table_name, r.column_names, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '=== Done: % indexes created, % already indexed (skipped) ===', created_count, skipped_count;
END $$;
