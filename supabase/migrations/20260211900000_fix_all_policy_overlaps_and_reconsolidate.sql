-- ============================================================================
-- Migration: Fix FOR ALL policy overlaps + re-consolidate
--
-- Problem: A FOR ALL policy covers SELECT, INSERT, UPDATE, DELETE. When a
--          table also has per-action policies (FOR SELECT, FOR INSERT, etc.),
--          the linter flags them as multiple permissive policies.
--
-- Solution (2 passes):
--   Pass 1: Expand conflicting FOR ALL policies into 4 per-action policies
--   Pass 2: Consolidate all duplicate per-action policies (OR conditions)
-- ============================================================================

-- ============================================================================
-- PASS 1: Expand FOR ALL policies that conflict with per-action policies
-- ============================================================================
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
  RAISE NOTICE '=== Pass 1: Expanding conflicting FOR ALL policies ===';

  FOR pol IN
    SELECT p.schemaname, p.tablename, p.policyname, p.permissive, p.roles, p.qual, p.with_check
    FROM pg_policies p
    WHERE p.schemaname IN ('public', 'stockly')
      AND p.cmd = 'ALL'
      AND p.permissive = 'PERMISSIVE'
    ORDER BY p.schemaname, p.tablename, p.policyname
  LOOP
    -- Only expand if this ALL policy conflicts with other permissive policies
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies p2
      WHERE p2.schemaname = pol.schemaname
        AND p2.tablename = pol.tablename
        AND p2.policyname != pol.policyname
        AND p2.permissive = 'PERMISSIVE'
        AND p2.roles && pol.roles  -- overlapping roles
    ) THEN
      CONTINUE;
    END IF;

    roles_str := array_to_string(pol.roles, ', ');
    eff_with_check := COALESCE(pol.with_check, pol.qual);

    -- Drop the ALL policy
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname, pol.schemaname, pol.tablename);

    -- Create 4 specific action policies
    FOREACH act IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'] LOOP
      new_name := pol.policyname || '_' || lower(act);
      IF length(new_name) > 63 THEN
        new_name := left(new_name, 55) || '_' || left(md5(new_name), 7);
      END IF;

      create_sql := format('CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR %s TO %s',
        new_name, pol.schemaname, pol.tablename, act, roles_str);

      -- SELECT/DELETE use USING only
      -- INSERT uses WITH CHECK only
      -- UPDATE uses both USING and WITH CHECK
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
    RAISE NOTICE 'Expanded: %.% -> % (ALL -> SELECT/INSERT/UPDATE/DELETE)',
      pol.schemaname, pol.tablename, pol.policyname;
  END LOOP;

  RAISE NOTICE '=== Pass 1 done: % FOR ALL policies expanded ===', expanded_count;
END $$;

-- ============================================================================
-- PASS 2: Re-consolidate all duplicate permissive policies
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
  RAISE NOTICE '=== Pass 2: Consolidating duplicate permissive policies ===';

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

    RAISE NOTICE 'Consolidating %.% [%]: % policies -> %',
      combo.schemaname, combo.tablename, combo.cmd, combo.cnt,
      array_to_string(combo.policy_names, ', ');

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
        IF combined_with_check IS NULL THEN
          combined_with_check := '(' || pol.with_check || ')';
        ELSE
          combined_with_check := combined_with_check || E'\n    OR (' || pol.with_check || ')';
        END IF;
      END IF;

      EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
        pol.policyname, combo.schemaname, combo.tablename);
    END LOOP;

    IF has_unrestricted_qual THEN
      combined_qual := NULL;
    END IF;
    IF has_unrestricted_check THEN
      combined_with_check := NULL;
    END IF;

    new_policy_name := combo.tablename || '_' || lower(combo.cmd) || '_policy';
    IF length(new_policy_name) > 63 THEN
      new_policy_name := left(new_policy_name, 55) || '_' || left(md5(combo.tablename || combo.cmd), 7);
    END IF;

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
      RAISE EXCEPTION 'Failed to create % on %.%: %',
        new_policy_name, combo.schemaname, combo.tablename, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '=== Pass 2 done: % policy groups consolidated ===', consolidated_count;
END $$;
