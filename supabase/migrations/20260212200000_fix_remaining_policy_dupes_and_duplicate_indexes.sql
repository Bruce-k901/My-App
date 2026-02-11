-- ============================================================================
-- Migration: Fix remaining policy duplicates + drop duplicate indexes
-- ============================================================================

-- ============================================================================
-- PART 1: Final permissive policy consolidation (catches all remaining)
-- Same logic as 20260212100000 but runs again to catch any stragglers
-- ============================================================================
DO $$
DECLARE
  combo RECORD;
  pol RECORD;
  combined_qual TEXT;
  combined_check TEXT;
  has_unrestricted_qual BOOLEAN;
  has_unrestricted_check BOOLEAN;
  all_roles name[];
  deduped_roles name[];
  create_sql TEXT;
  new_policy_name TEXT;
  policy_count INTEGER;
  consolidated_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Final permissive policy consolidation ===';

  FOR combo IN
    SELECT p.schemaname, p.tablename, p.cmd
    FROM pg_policies p
    WHERE p.schemaname IN ('public', 'stockly')
      AND p.permissive = 'PERMISSIVE'
    GROUP BY p.schemaname, p.tablename, p.cmd
    HAVING count(*) > 1
    ORDER BY p.schemaname, p.tablename, p.cmd
  LOOP
    -- Expand 'public' role in overlap check
    IF NOT EXISTS (
      WITH expanded AS (
        SELECT p2.policyname,
          CASE WHEN 'public' = ANY(p2.roles)
            THEN array_cat(p2.roles, ARRAY['anon','authenticated','service_role']::name[])
            ELSE p2.roles
          END AS expanded_roles
        FROM pg_policies p2
        WHERE p2.schemaname = combo.schemaname
          AND p2.tablename = combo.tablename
          AND p2.cmd = combo.cmd
          AND p2.permissive = 'PERMISSIVE'
      ),
      role_map AS (
        SELECT unnest(expanded_roles) AS r, policyname FROM expanded
      )
      SELECT 1 FROM role_map GROUP BY r HAVING count(DISTINCT policyname) > 1
    ) THEN
      CONTINUE;
    END IF;

    combined_qual := NULL;
    combined_check := NULL;
    has_unrestricted_qual := FALSE;
    has_unrestricted_check := FALSE;
    all_roles := '{}';
    policy_count := 0;

    FOR pol IN
      SELECT policyname, qual, with_check, roles
      FROM pg_policies
      WHERE schemaname = combo.schemaname
        AND tablename = combo.tablename
        AND cmd = combo.cmd
        AND permissive = 'PERMISSIVE'
      ORDER BY policyname
    LOOP
      policy_count := policy_count + 1;
      all_roles := all_roles || pol.roles;

      IF pol.qual IS NULL THEN
        has_unrestricted_qual := TRUE;
      ELSIF NOT has_unrestricted_qual THEN
        IF combined_qual IS NULL THEN
          combined_qual := '(' || pol.qual || ')';
        ELSE
          combined_qual := combined_qual || E'\n    OR (' || pol.qual || ')';
        END IF;
      END IF;

      IF pol.with_check IS NULL THEN
        has_unrestricted_check := TRUE;
      ELSIF NOT has_unrestricted_check THEN
        IF combined_check IS NULL THEN
          combined_check := '(' || pol.with_check || ')';
        ELSE
          combined_check := combined_check || E'\n    OR (' || pol.with_check || ')';
        END IF;
      END IF;

      EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
        pol.policyname, combo.schemaname, combo.tablename);
    END LOOP;

    IF has_unrestricted_qual THEN combined_qual := NULL; END IF;
    IF has_unrestricted_check THEN combined_check := NULL; END IF;

    IF 'public' = ANY(all_roles) THEN
      deduped_roles := ARRAY['public']::name[];
    ELSE
      SELECT array_agg(r ORDER BY r) INTO deduped_roles
      FROM (SELECT DISTINCT unnest(all_roles) AS r) sub;
    END IF;

    new_policy_name := combo.tablename || '_' || lower(combo.cmd) || '_policy';
    IF length(new_policy_name) > 63 THEN
      new_policy_name := left(new_policy_name, 55) || '_' || left(md5(new_policy_name), 7);
    END IF;

    create_sql := format('CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR %s TO %s',
      new_policy_name, combo.schemaname, combo.tablename, combo.cmd,
      array_to_string(deduped_roles, ', '));

    IF combined_qual IS NOT NULL THEN
      create_sql := create_sql || E' USING (\n    ' || combined_qual || E'\n  )';
    END IF;
    IF combined_check IS NOT NULL THEN
      create_sql := create_sql || E' WITH CHECK (\n    ' || combined_check || E'\n  )';
    END IF;

    BEGIN
      EXECUTE create_sql;
      consolidated_count := consolidated_count + 1;
      RAISE NOTICE 'Merged % policies: %.% [%] -> %',
        policy_count, combo.schemaname, combo.tablename, combo.cmd, new_policy_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed: %.% [%]: %',
        combo.schemaname, combo.tablename, combo.cmd, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '=== Policy consolidation done: % groups merged ===', consolidated_count;
END $$;

-- ============================================================================
-- PART 2: Drop duplicate indexes
-- For each pair, keep the one that backs a constraint (PK/unique).
-- If neither backs a constraint, keep the one with the shorter name.
-- ============================================================================
DO $$
DECLARE
  dup RECORD;
  idx RECORD;
  keep_indexrelid OID;
  keep_name TEXT;
  dropped_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Dropping duplicate indexes ===';

  -- Find groups of indexes with identical column definitions
  FOR dup IN
    SELECT
      n.nspname AS schemaname,
      c.relname AS tablename,
      i.indrelid,
      i.indkey::text AS key_cols,
      i.indexprs IS NOT NULL AS has_exprs,
      i.indpred IS NOT NULL AS has_pred,
      array_agg(ic.relname ORDER BY ic.relname) AS index_names,
      array_agg(i.indexrelid ORDER BY ic.relname) AS index_oids,
      count(*) AS cnt
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indrelid
    JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('public', 'stockly')
    GROUP BY n.nspname, c.relname, i.indrelid, i.indkey::text,
             (i.indexprs IS NOT NULL), (i.indpred IS NOT NULL)
    HAVING count(*) > 1
    ORDER BY n.nspname, c.relname
  LOOP
    keep_indexrelid := NULL;
    keep_name := NULL;

    -- First pass: find an index that backs a constraint (prefer PK > unique)
    FOR idx IN
      SELECT ic.relname AS indexname, i.indexrelid,
             i.indisprimary, i.indisunique,
             EXISTS (
               SELECT 1 FROM pg_constraint pc
               WHERE pc.conindid = i.indexrelid
             ) AS is_constraint
      FROM pg_index i
      JOIN pg_class ic ON ic.oid = i.indexrelid
      WHERE i.indrelid = dup.indrelid
        AND i.indkey::text = dup.key_cols
      ORDER BY i.indisprimary DESC, -- prefer PK
               EXISTS (SELECT 1 FROM pg_constraint pc WHERE pc.conindid = i.indexrelid) DESC,
               length(ic.relname), -- then shorter name
               ic.relname
    LOOP
      IF keep_indexrelid IS NULL THEN
        keep_indexrelid := idx.indexrelid;
        keep_name := idx.indexname;
      ELSE
        -- Drop this duplicate
        BEGIN
          EXECUTE format('DROP INDEX IF EXISTS %I.%I', dup.schemaname, idx.indexname);
          dropped_count := dropped_count + 1;
          RAISE NOTICE 'Dropped duplicate: %.% (keeping %)', dup.schemaname, idx.indexname, keep_name;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'Cannot drop %.%: % (may back a constraint)',
            dup.schemaname, idx.indexname, SQLERRM;
        END;
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE '=== Done: % duplicate indexes dropped ===', dropped_count;
END $$;
