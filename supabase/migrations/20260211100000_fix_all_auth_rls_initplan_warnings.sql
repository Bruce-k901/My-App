-- ============================================================================
-- Migration: Fix ALL auth_rls_initplan Linter Warnings
-- Description: Dynamically finds and fixes every RLS policy in public/stockly
--              schemas where auth.uid(), auth.jwt(), or auth.role() is called
--              without a (select ...) wrapper, causing per-row re-evaluation.
--
-- How it works:
--   1. Queries pg_policies for all policies with bare auth function calls
--   2. Drops each affected policy
--   3. Recreates it with (select auth.uid()) etc. instead of auth.uid()
--   4. All within a single transaction (atomic - all or nothing)
--
-- Safe to run multiple times (idempotent).
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
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
  RAISE NOTICE '=== Starting auth_rls_initplan fix ===';

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
        -- Policy contains auth.uid() / auth.jwt() / auth.role() somewhere
        (qual IS NOT NULL AND qual ~ 'auth\.(uid|jwt|role)\(')
        OR (with_check IS NOT NULL AND with_check ~ 'auth\.(uid|jwt|role)\(')
      )
    ORDER BY schemaname, tablename, policyname
  LOOP
    -- Save originals for comparison
    orig_qual := pol.qual;
    orig_with_check := pol.with_check;

    -- ============================
    -- Fix USING (qual) expression
    -- ============================
    new_qual := pol.qual;
    IF new_qual IS NOT NULL THEN
      -- Step 1: Protect already-wrapped calls with markers
      new_qual := replace(new_qual, '(select auth.uid())',  '###WRAPPED_UID###');
      new_qual := replace(new_qual, '(select auth.jwt())',  '###WRAPPED_JWT###');
      new_qual := replace(new_qual, '(select auth.role())', '###WRAPPED_ROLE###');
      -- Also handle SELECT (uppercase) variant from decompiler
      new_qual := replace(new_qual, '(SELECT auth.uid())',  '###WRAPPED_UID###');
      new_qual := replace(new_qual, '(SELECT auth.jwt())',  '###WRAPPED_JWT###');
      new_qual := replace(new_qual, '(SELECT auth.role())', '###WRAPPED_ROLE###');

      -- Step 2: Wrap remaining bare calls
      new_qual := regexp_replace(new_qual, 'auth\.uid\(\)',  '(select auth.uid())',  'g');
      new_qual := regexp_replace(new_qual, 'auth\.jwt\(\)',  '(select auth.jwt())',  'g');
      new_qual := regexp_replace(new_qual, 'auth\.role\(\)', '(select auth.role())', 'g');

      -- Step 3: Restore markers
      new_qual := replace(new_qual, '###WRAPPED_UID###',  '(select auth.uid())');
      new_qual := replace(new_qual, '###WRAPPED_JWT###',  '(select auth.jwt())');
      new_qual := replace(new_qual, '###WRAPPED_ROLE###', '(select auth.role())');
    END IF;

    -- ============================
    -- Fix WITH CHECK expression
    -- ============================
    new_with_check := pol.with_check;
    IF new_with_check IS NOT NULL THEN
      -- Step 1: Protect already-wrapped calls
      new_with_check := replace(new_with_check, '(select auth.uid())',  '###WRAPPED_UID###');
      new_with_check := replace(new_with_check, '(select auth.jwt())',  '###WRAPPED_JWT###');
      new_with_check := replace(new_with_check, '(select auth.role())', '###WRAPPED_ROLE###');
      new_with_check := replace(new_with_check, '(SELECT auth.uid())',  '###WRAPPED_UID###');
      new_with_check := replace(new_with_check, '(SELECT auth.jwt())',  '###WRAPPED_JWT###');
      new_with_check := replace(new_with_check, '(SELECT auth.role())', '###WRAPPED_ROLE###');

      -- Step 2: Wrap remaining bare calls
      new_with_check := regexp_replace(new_with_check, 'auth\.uid\(\)',  '(select auth.uid())',  'g');
      new_with_check := regexp_replace(new_with_check, 'auth\.jwt\(\)',  '(select auth.jwt())',  'g');
      new_with_check := regexp_replace(new_with_check, 'auth\.role\(\)', '(select auth.role())', 'g');

      -- Step 3: Restore markers
      new_with_check := replace(new_with_check, '###WRAPPED_UID###',  '(select auth.uid())');
      new_with_check := replace(new_with_check, '###WRAPPED_JWT###',  '(select auth.jwt())');
      new_with_check := replace(new_with_check, '###WRAPPED_ROLE###', '(select auth.role())');
    END IF;

    -- ============================
    -- Skip if nothing changed
    -- ============================
    IF new_qual IS NOT DISTINCT FROM orig_qual
       AND new_with_check IS NOT DISTINCT FROM orig_with_check THEN
      skipped_count := skipped_count + 1;
      CONTINUE;
    END IF;

    -- ============================
    -- Drop the old policy
    -- ============================
    EXECUTE format('DROP POLICY %I ON %I.%I',
      pol.policyname, pol.schemaname, pol.tablename);

    -- ============================
    -- Rebuild CREATE POLICY
    -- ============================
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

  RAISE NOTICE '=== Done: % policies fixed, % already correct (skipped) ===', fixed_count, skipped_count;
END $$;
