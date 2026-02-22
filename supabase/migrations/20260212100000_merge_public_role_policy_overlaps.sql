-- ============================================================================
-- Migration: Merge policies where 'public' role overlaps with specific roles
--
-- Problem: A policy targeting TO PUBLIC (roles={public}) covers ALL roles
--          including anon and authenticated. But our previous consolidation
--          compared roles arrays literally, so {public} didn't match
--          {authenticated} even though they overlap on the authenticated role.
--
-- Solution: Expand 'public' to include all Supabase roles in the overlap
--           check, then merge overlapping policies.
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
  RAISE NOTICE '=== Merging public-role policy overlaps ===';

  FOR combo IN
    SELECT p.schemaname, p.tablename, p.cmd
    FROM pg_policies p
    WHERE p.schemaname IN ('public', 'stockly')
      AND p.permissive = 'PERMISSIVE'
    GROUP BY p.schemaname, p.tablename, p.cmd
    HAVING count(*) > 1
    ORDER BY p.schemaname, p.tablename, p.cmd
  LOOP
    -- Check for per-role overlap, expanding 'public' to cover all roles
    IF NOT EXISTS (
      WITH expanded AS (
        SELECT
          p2.policyname,
          CASE
            WHEN 'public' = ANY(p2.roles)
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
        SELECT unnest(expanded_roles) AS r, policyname
        FROM expanded
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

    -- If any policy targeted 'public', the merged one targets 'public'
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
      RAISE EXCEPTION 'Failed: %.% [%]: %',
        combo.schemaname, combo.tablename, combo.cmd, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '=== Done: % cross-role policy groups merged ===', consolidated_count;
END $$;
