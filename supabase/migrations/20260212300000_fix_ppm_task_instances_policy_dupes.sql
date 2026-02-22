-- ============================================================================
-- Fix remaining policy duplicates on ppm_schedules, ppm_service_events,
-- task_instances by expanding any FOR ALL policies then consolidating.
-- Also handles typing_indicators duplicate index.
-- ============================================================================

-- Pass 1: Expand ALL FOR ALL policies that have any other policy on same table
DO $$
DECLARE
  pol RECORD;
  act TEXT;
  new_name TEXT;
  create_sql TEXT;
  roles_str TEXT;
  eff_with_check TEXT;
  expanded_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Expanding remaining FOR ALL policies ===';

  FOR pol IN
    SELECT p.schemaname, p.tablename, p.policyname, p.permissive, p.roles, p.qual, p.with_check
    FROM pg_policies p
    WHERE p.schemaname IN ('public', 'stockly')
      AND p.cmd = 'ALL'
      AND p.permissive = 'PERMISSIVE'
      AND EXISTS (
        SELECT 1 FROM pg_policies p2
        WHERE p2.schemaname = p.schemaname
          AND p2.tablename = p.tablename
          AND p2.policyname != p.policyname
          AND p2.permissive = 'PERMISSIVE'
      )
    ORDER BY p.schemaname, p.tablename, p.policyname
  LOOP
    roles_str := array_to_string(pol.roles, ', ');
    eff_with_check := COALESCE(pol.with_check, pol.qual);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname, pol.schemaname, pol.tablename);

    FOREACH act IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'] LOOP
      new_name := pol.policyname || '_' || lower(act);
      IF length(new_name) > 63 THEN
        new_name := left(new_name, 55) || '_' || left(md5(new_name), 7);
      END IF;

      create_sql := format('CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR %s TO %s',
        new_name, pol.schemaname, pol.tablename, act, roles_str);

      IF act IN ('SELECT', 'DELETE') THEN
        IF pol.qual IS NOT NULL THEN
          create_sql := create_sql || ' USING (' || pol.qual || ')';
        END IF;
      ELSIF act = 'INSERT' THEN
        IF eff_with_check IS NOT NULL THEN
          create_sql := create_sql || ' WITH CHECK (' || eff_with_check || ')';
        END IF;
      ELSIF act = 'UPDATE' THEN
        IF pol.qual IS NOT NULL THEN
          create_sql := create_sql || ' USING (' || pol.qual || ')';
        END IF;
        IF eff_with_check IS NOT NULL THEN
          create_sql := create_sql || ' WITH CHECK (' || eff_with_check || ')';
        END IF;
      END IF;

      EXECUTE create_sql;
    END LOOP;

    expanded_count := expanded_count + 1;
    RAISE NOTICE 'Expanded: %.% -> %', pol.schemaname, pol.tablename, pol.policyname;
  END LOOP;

  RAISE NOTICE '=== %  FOR ALL policies expanded ===', expanded_count;
END $$;

-- Pass 2: Consolidate all remaining duplicates
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
  RAISE NOTICE '=== Consolidating remaining duplicates ===';

  FOR combo IN
    SELECT p.schemaname, p.tablename, p.cmd
    FROM pg_policies p
    WHERE p.schemaname IN ('public', 'stockly')
      AND p.permissive = 'PERMISSIVE'
    GROUP BY p.schemaname, p.tablename, p.cmd
    HAVING count(*) > 1
    ORDER BY p.schemaname, p.tablename, p.cmd
  LOOP
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
          combined_qual := combined_qual || ' OR (' || pol.qual || ')';
        END IF;
      END IF;

      IF pol.with_check IS NULL THEN
        has_unrestricted_check := TRUE;
      ELSIF NOT has_unrestricted_check THEN
        IF combined_check IS NULL THEN
          combined_check := '(' || pol.with_check || ')';
        ELSE
          combined_check := combined_check || ' OR (' || pol.with_check || ')';
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
      create_sql := create_sql || ' USING (' || combined_qual || ')';
    END IF;
    IF combined_check IS NOT NULL THEN
      create_sql := create_sql || ' WITH CHECK (' || combined_check || ')';
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

  RAISE NOTICE '=== Done: % groups consolidated ===', consolidated_count;
END $$;

-- ============================================================================
-- PART 3: Fix typing_indicators duplicate (unique constraint + PK on same cols)
-- Drop the redundant unique constraint, keep the PK
-- ============================================================================
ALTER TABLE IF EXISTS public.typing_indicators
  DROP CONSTRAINT IF EXISTS typing_indicators_channel_profile_unique;
