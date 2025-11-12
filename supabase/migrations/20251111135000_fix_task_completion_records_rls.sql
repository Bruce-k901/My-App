-- ============================================================================
-- Migration: 20251111135000_fix_task_completion_records_rls.sql
-- Description: Fix RLS policy for task_completion_records to allow inserts
-- ============================================================================

-- Create a SECURITY DEFINER function to get user's company_id (bypasses RLS)
create or replace function public.get_user_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id 
  from public.profiles 
  where id = auth.uid() or auth_user_id = auth.uid()
  limit 1;
$$;

-- Update the modify policy - use the function to bypass profiles RLS
-- Also add explicit INSERT policy for better debugging
drop policy if exists tenant_modify_task_completion_records on public.task_completion_records;
drop policy if exists tenant_insert_task_completion_records on public.task_completion_records;

-- Separate INSERT policy (most permissive for debugging)
create policy tenant_insert_task_completion_records
  on public.task_completion_records
  for insert
  with check (
    public.is_service_role()
    or matches_current_tenant(company_id)
    or company_id = public.get_user_company_id()
  );

-- UPDATE/DELETE policy
create policy tenant_modify_task_completion_records
  on public.task_completion_records
  for all
  using (
    public.is_service_role()
    or matches_current_tenant(company_id)
    or company_id = public.get_user_company_id()
  );

