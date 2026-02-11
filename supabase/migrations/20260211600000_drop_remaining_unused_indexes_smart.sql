-- ============================================================================
-- Migration: Drop remaining unused indexes (refined smart approach)
--
-- Previous migration preserved ALL FK-covering indexes, but many of those
-- have duplicate coverage (another index on the same table covers the same
-- FK columns). This migration drops unused indexes UNLESS they are the ONLY
-- index covering a foreign key on that table.
--
-- Logic per unused index:
--   1. Find all FK constraints whose columns are covered by this index
--   2. For each such FK, check if at least one OTHER index also covers it
--   3. If every FK covered by this index has alternative coverage → DROP
--   4. If any FK would be left uncovered → KEEP
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  fk RECORD;
  has_alternative BOOLEAN;
  all_fks_covered BOOLEAN;
  dropped_count INTEGER := 0;
  kept_count INTEGER := 0;
  no_fk_dropped INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Refined unused index cleanup (round 4) ===';

  FOR r IN
    SELECT
      s.schemaname,
      s.relname AS tablename,
      s.indexrelname AS indexname,
      i.indexrelid,
      i.indrelid,
      i.indkey
    FROM pg_stat_user_indexes s
    JOIN pg_index i ON i.indexrelid = s.indexrelid
    WHERE s.idx_scan = 0           -- never used
      AND NOT i.indisunique        -- not a unique constraint
      AND NOT i.indisprimary       -- not a primary key
      AND s.schemaname IN ('public', 'stockly')
    ORDER BY s.schemaname, s.relname, s.indexrelname
  LOOP
    -- Check if this index covers ANY foreign key
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      WHERE c.conrelid = r.indrelid
        AND c.contype = 'f'
        AND c.conkey <@ r.indkey[0:array_length(c.conkey, 1) - 1]
    ) THEN
      -- No FK coverage at all → safe to drop
      BEGIN
        EXECUTE format('DROP INDEX IF EXISTS %I.%I', r.schemaname, r.indexname);
        no_fk_dropped := no_fk_dropped + 1;
        RAISE NOTICE 'Dropped (no FK): %.%', r.schemaname, r.indexname;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to drop %.%: %', r.schemaname, r.indexname, SQLERRM;
      END;
      CONTINUE;
    END IF;

    -- This index covers at least one FK. Check each FK it covers
    -- to see if there's at least one OTHER index also covering it.
    all_fks_covered := TRUE;

    FOR fk IN
      SELECT c.oid AS constraint_oid, c.conkey
      FROM pg_constraint c
      WHERE c.conrelid = r.indrelid
        AND c.contype = 'f'
        AND c.conkey <@ r.indkey[0:array_length(c.conkey, 1) - 1]
    LOOP
      -- Is there another index (not this one) that also covers this FK?
      has_alternative := EXISTS (
        SELECT 1
        FROM pg_index other_idx
        WHERE other_idx.indrelid = r.indrelid
          AND other_idx.indexrelid != r.indexrelid  -- different index
          AND fk.conkey <@ other_idx.indkey[0:array_length(fk.conkey, 1) - 1]
      );

      IF NOT has_alternative THEN
        all_fks_covered := FALSE;
        EXIT;  -- no need to check further
      END IF;
    END LOOP;

    IF all_fks_covered THEN
      -- Every FK this index covers has alternative coverage → safe to drop
      BEGIN
        EXECUTE format('DROP INDEX IF EXISTS %I.%I', r.schemaname, r.indexname);
        dropped_count := dropped_count + 1;
        RAISE NOTICE 'Dropped (redundant FK): %.%', r.schemaname, r.indexname;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to drop %.%: %', r.schemaname, r.indexname, SQLERRM;
      END;
    ELSE
      -- At least one FK has no alternative coverage → keep
      kept_count := kept_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '=== Done: % non-FK dropped, % redundant-FK dropped, % sole-FK-coverage kept ===',
    no_fk_dropped, dropped_count, kept_count;
END $$;
