-- ============================================================================
-- Migration: 20251111141000_fix_task_completion_records_select_rls.sql
-- Description: Fix SELECT RLS policy for task_completion_records to allow reads
-- ============================================================================

-- Ensure the helper function exists (it should be created in 20251111135000, but create it here if missing)
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

-- Update the SELECT policy to use the same logic as INSERT (more permissive)
drop policy if exists tenant_select_task_completion_records on public.task_completion_records;

create policy tenant_select_task_completion_records
  on public.task_completion_records
  for select
  using (
    public.is_service_role()
    or matches_current_tenant(company_id)
    or company_id = public.get_user_company_id()
  );

