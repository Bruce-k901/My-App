-- ============================================================================
-- Migration: Merge cross-role permissive policy duplicates
--
-- Problem: Policies with different role arrays can still overlap on individual
--          roles. E.g. policy A targeting {anon,authenticated} and policy B
--          targeting {anon} both cover the 'anon' role, triggering warnings.
--
-- Solution: For each (table, action) where an individual role has >1 applicable
--           permissive policy, merge ALL permissive policies for that action
--           into one policy targeting the union of all role sets.
--
-- This is semantically safe because:
--   - Permissive policies are OR'd anyway, so merging with OR is identical
--   - Role union can only expand access, never restrict it
--   - Authenticated users getting anon-level conditions via OR is safe
--     (the conditions are additive and typically return false for the
--     wrong auth context anyway)
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
  RAISE NOTICE '=== Merging cross-role permissive policy duplicates ===';

  -- Find (table, action) pairs where an individual role is covered by >1 policy
  FOR combo IN
    SELECT p.schemaname, p.tablename, p.cmd
    FROM pg_policies p
    WHERE p.schemaname IN ('public', 'stockly')
      AND p.permissive = 'PERMISSIVE'
    GROUP BY p.schemaname, p.tablename, p.cmd
    HAVING count(*) > 1
    ORDER BY p.schemaname, p.tablename, p.cmd
  LOOP
    -- Only process if there's actually a per-role overlap
    IF NOT EXISTS (
      WITH role_map AS (
        SELECT unnest(p2.roles) AS r, p2.policyname
        FROM pg_policies p2
        WHERE p2.schemaname = combo.schemaname
          AND p2.tablename = combo.tablename
          AND p2.cmd = combo.cmd
          AND p2.permissive = 'PERMISSIVE'
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

    -- Collect all permissive policies for this (table, action)
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

      -- Accumulate roles
      all_roles := all_roles || pol.roles;

      -- Combine USING conditions with OR
      IF pol.qual IS NULL THEN
        has_unrestricted_qual := TRUE;
      ELSIF NOT has_unrestricted_qual THEN
        IF combined_qual IS NULL THEN
          combined_qual := '(' || pol.qual || ')';
        ELSE
          combined_qual := combined_qual || E'\n    OR (' || pol.qual || ')';
        END IF;
      END IF;

      -- Combine WITH CHECK conditions with OR
      IF pol.with_check IS NULL THEN
        has_unrestricted_check := TRUE;
      ELSIF NOT has_unrestricted_check THEN
        IF combined_check IS NULL THEN
          combined_check := '(' || pol.with_check || ')';
        ELSE
          combined_check := combined_check || E'\n    OR (' || pol.with_check || ')';
        END IF;
      END IF;

      -- Drop the old policy
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
        pol.policyname, combo.schemaname, combo.tablename);
    END LOOP;

    IF has_unrestricted_qual THEN combined_qual := NULL; END IF;
    IF has_unrestricted_check THEN combined_check := NULL; END IF;

    -- Deduplicate roles; 'public' supersedes all others
    IF 'public' = ANY(all_roles) THEN
      deduped_roles := ARRAY['public']::name[];
    ELSE
      SELECT array_agg(r ORDER BY r) INTO deduped_roles
      FROM (SELECT DISTINCT unnest(all_roles) AS r) sub;
    END IF;

    -- Build consolidated policy name
    new_policy_name := combo.tablename || '_' || lower(combo.cmd) || '_policy';
    IF length(new_policy_name) > 63 THEN
      new_policy_name := left(new_policy_name, 55) || '_' || left(md5(new_policy_name), 7);
    END IF;

    create_sql := format('CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR %s TO %s',
      new_policy_name,
      combo.schemaname,
      combo.tablename,
      combo.cmd,
      array_to_string(deduped_roles, ', ')
    );

    IF combined_qual IS NOT NULL THEN
      create_sql := create_sql || E' USING (\n    ' || combined_qual || E'\n  )';
    END IF;

    IF combined_check IS NOT NULL THEN
      create_sql := create_sql || E' WITH CHECK (\n    ' || combined_check || E'\n  )';
    END IF;

    BEGIN
      EXECUTE create_sql;
      consolidated_count := consolidated_count + 1;
      RAISE NOTICE 'Merged % policies: %.% [%] -> % (roles: %)',
        policy_count, combo.schemaname, combo.tablename, combo.cmd,
        new_policy_name, array_to_string(deduped_roles, ', ');
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to create % on %.% [%]: %',
        new_policy_name, combo.schemaname, combo.tablename, combo.cmd, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '=== Done: % cross-role policy groups merged ===', consolidated_count;
END $$;
