-- ============================================================================
-- Migration: Fix remaining auth_rls_initplan warnings (current_setting)
-- Description: The previous initplan fix (20260211100000) handled auth.uid(),
--              auth.jwt(), and auth.role() but missed current_setting() calls.
--              This fixes any RLS policies with bare current_setting() calls
--              by wrapping them in (select current_setting(...)).
-- ============================================================================

DO $$
DECLARE
  pol RECORD;
  orig_qual TEXT;
  orig_with_check TEXT;
  new_qual TEXT;
  new_with_check TEXT;
  create_sql TEXT;
  roles_str TEXT;
  fixed_count INTEGER := 0;
  skipped_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Starting current_setting() initplan fix ===';

  FOR pol IN
    SELECT
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname IN ('public', 'stockly')
      AND (
        (qual IS NOT NULL AND qual ~ 'current_setting\(')
        OR (with_check IS NOT NULL AND with_check ~ 'current_setting\(')
      )
    ORDER BY schemaname, tablename, policyname
  LOOP
    orig_qual := pol.qual;
    orig_with_check := pol.with_check;

    -- ============================
    -- Fix USING (qual) expression
    -- ============================
    new_qual := pol.qual;
    IF new_qual IS NOT NULL THEN
      -- Step 1: Protect already-wrapped current_setting calls
      new_qual := regexp_replace(new_qual,
        '\(select current_setting\(',
        '(select ###CS_MARKER###(',
        'gi');

      -- Step 2: Wrap bare current_setting calls
      new_qual := regexp_replace(new_qual,
        'current_setting\(([^)]+)\)',
        '(select current_setting(\1))',
        'g');

      -- Step 3: Restore markers
      new_qual := replace(new_qual, '###CS_MARKER###', 'current_setting');
    END IF;

    -- ============================
    -- Fix WITH CHECK expression
    -- ============================
    new_with_check := pol.with_check;
    IF new_with_check IS NOT NULL THEN
      -- Step 1: Protect already-wrapped
      new_with_check := regexp_replace(new_with_check,
        '\(select current_setting\(',
        '(select ###CS_MARKER###(',
        'gi');

      -- Step 2: Wrap bare calls
      new_with_check := regexp_replace(new_with_check,
        'current_setting\(([^)]+)\)',
        '(select current_setting(\1))',
        'g');

      -- Step 3: Restore markers
      new_with_check := replace(new_with_check, '###CS_MARKER###', 'current_setting');
    END IF;

    -- Skip if nothing changed
    IF new_qual IS NOT DISTINCT FROM orig_qual
       AND new_with_check IS NOT DISTINCT FROM orig_with_check THEN
      skipped_count := skipped_count + 1;
      CONTINUE;
    END IF;

    -- Drop the old policy
    EXECUTE format('DROP POLICY %I ON %I.%I',
      pol.policyname, pol.schemaname, pol.tablename);

    -- Rebuild policy
    roles_str := array_to_string(pol.roles, ', ');

    create_sql := format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      pol.policyname,
      pol.schemaname,
      pol.tablename,
      pol.permissive,
      pol.cmd,
      roles_str
    );

    IF new_qual IS NOT NULL THEN
      create_sql := create_sql || ' USING (' || new_qual || ')';
    END IF;

    IF new_with_check IS NOT NULL THEN
      create_sql := create_sql || ' WITH CHECK (' || new_with_check || ')';
    END IF;

    EXECUTE create_sql;

    fixed_count := fixed_count + 1;
    RAISE NOTICE 'Fixed: %.% -> %', pol.schemaname, pol.tablename, pol.policyname;
  END LOOP;

  RAISE NOTICE '=== Done: % policies fixed, % already correct ===', fixed_count, skipped_count;
END $$;
