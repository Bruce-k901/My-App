-- Update checklist_tasks RLS to allow authenticated users with company/site access

begin;

drop policy if exists tenant_select_checklist_tasks on public.checklist_tasks;
create policy tenant_select_checklist_tasks
  on public.checklist_tasks
  for select
  using (
    public.is_service_role()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.company_id = public.checklist_tasks.company_id
    )
    or exists (
      select 1
      from public.user_site_access usa
      where usa.auth_user_id = auth.uid()
        and usa.company_id = public.checklist_tasks.company_id
        and (usa.site_id is null or usa.site_id = public.checklist_tasks.site_id)
    )
  );

drop policy if exists tenant_modify_checklist_tasks on public.checklist_tasks;
create policy tenant_modify_checklist_tasks
  on public.checklist_tasks
  for all
  using (
    public.is_service_role()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.company_id = public.checklist_tasks.company_id
    )
    or exists (
      select 1
      from public.user_site_access usa
      where usa.auth_user_id = auth.uid()
        and usa.company_id = public.checklist_tasks.company_id
        and (usa.site_id is null or usa.site_id = public.checklist_tasks.site_id)
    )
  )
  with check (
    public.is_service_role()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.company_id = public.checklist_tasks.company_id
    )
    or exists (
      select 1
      from public.user_site_access usa
      where usa.auth_user_id = auth.uid()
        and usa.company_id = public.checklist_tasks.company_id
        and (usa.site_id is null or usa.site_id = public.checklist_tasks.site_id)
    )
  );

commit;
