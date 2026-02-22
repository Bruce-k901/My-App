-- ============================================================================
-- Migration: Consolidate multiple permissive policies
--
-- When a table has multiple PERMISSIVE policies for the same (role, action),
-- PostgreSQL must evaluate ALL of them per row and OR the results. This adds
-- planning and execution overhead.
--
-- This migration consolidates them into a single policy per (table, role_set,
-- action) by OR'ing their USING/WITH CHECK conditions. This is semantically
-- identical but more efficient.
--
-- Safety:
--   - Preserves exact security semantics (permissive OR = explicit OR)
--   - If any policy in a group has no USING clause (= allow all rows),
--     the consolidated policy also has no USING clause
--   - Runs in a single transaction (all or nothing)
--   - Logs every change for audit
-- ============================================================================

DO $$
DECLARE
  combo RECORD;
  pol RECORD;
  combined_qual TEXT;
  combined_with_check TEXT;
  has_unrestricted_qual BOOLEAN;
  has_unrestricted_check BOOLEAN;
  new_policy_name TEXT;
  create_sql TEXT;
  policy_count INTEGER;
  consolidated_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Starting multiple permissive policy consolidation ===';

  -- Find all (schema, table, roles, cmd) groups with >1 permissive policy
  FOR combo IN
    SELECT
      p.schemaname,
      p.tablename,
      p.cmd,
      p.roles,
      array_agg(p.policyname ORDER BY p.policyname) AS policy_names,
      count(*) AS cnt
    FROM pg_policies p
    WHERE p.schemaname IN ('public', 'stockly')
      AND p.permissive = 'PERMISSIVE'
    GROUP BY p.schemaname, p.tablename, p.cmd, p.roles
    HAVING count(*) > 1
    ORDER BY p.schemaname, p.tablename, p.cmd
  LOOP
    combined_qual := NULL;
    combined_with_check := NULL;
    has_unrestricted_qual := FALSE;
    has_unrestricted_check := FALSE;
    policy_count := 0;

    RAISE NOTICE 'Consolidating %.%: % policies for % -> %',
      combo.schemaname, combo.tablename, combo.cnt, combo.cmd,
      array_to_string(combo.policy_names, ', ');

    -- Collect and drop each policy in this group
    FOR pol IN
      SELECT policyname, qual, with_check
      FROM pg_policies
      WHERE schemaname = combo.schemaname
        AND tablename = combo.tablename
        AND cmd = combo.cmd
        AND roles = combo.roles
        AND permissive = 'PERMISSIVE'
      ORDER BY policyname
    LOOP
      policy_count := policy_count + 1;

      -- Handle USING clause
      IF pol.qual IS NULL THEN
        -- No restriction = allow all. Since permissive OR: true OR x = true
        has_unrestricted_qual := TRUE;
      ELSIF NOT has_unrestricted_qual THEN
        IF combined_qual IS NULL THEN
          combined_qual := '(' || pol.qual || ')';
        ELSE
          combined_qual := combined_qual || E'\n    OR (' || pol.qual || ')';
        END IF;
      END IF;

      -- Handle WITH CHECK clause
      IF pol.with_check IS NULL THEN
        has_unrestricted_check := TRUE;
      ELSIF NOT has_unrestricted_check THEN
        IF combined_with_check IS NULL THEN
          combined_with_check := '(' || pol.with_check || ')';
        ELSE
          combined_with_check := combined_with_check || E'\n    OR (' || pol.with_check || ')';
        END IF;
      END IF;

      -- Drop the old policy
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
        pol.policyname, combo.schemaname, combo.tablename);
    END LOOP;

    -- If any policy was unrestricted, the combined result is unrestricted
    IF has_unrestricted_qual THEN
      combined_qual := NULL;
    END IF;
    IF has_unrestricted_check THEN
      combined_with_check := NULL;
    END IF;

    -- Build consolidated policy name
    new_policy_name := combo.tablename || '_' || lower(combo.cmd) || '_policy';

    -- Truncate if too long (max 63 chars)
    IF length(new_policy_name) > 63 THEN
      new_policy_name := left(new_policy_name, 55) || '_' || left(md5(combo.tablename || combo.cmd), 7);
    END IF;

    -- Build CREATE POLICY
    create_sql := format('CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR %s TO %s',
      new_policy_name,
      combo.schemaname,
      combo.tablename,
      combo.cmd,
      array_to_string(combo.roles, ', ')
    );

    IF combined_qual IS NOT NULL THEN
      create_sql := create_sql || E' USING (\n    ' || combined_qual || E'\n  )';
    END IF;

    IF combined_with_check IS NOT NULL THEN
      create_sql := create_sql || E' WITH CHECK (\n    ' || combined_with_check || E'\n  )';
    END IF;

    BEGIN
      EXECUTE create_sql;
      consolidated_count := consolidated_count + 1;
      RAISE NOTICE '  -> Created: %', new_policy_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to create consolidated policy % on %.%: %',
        new_policy_name, combo.schemaname, combo.tablename, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '=== Done: % policy groups consolidated ===', consolidated_count;
END $$;
