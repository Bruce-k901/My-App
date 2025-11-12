-- ============================================================================
-- Test: tenant_isolation.sql
-- Purpose: Smoke-test RLS tenant isolation for core tables
-- Run with: psql -f supabase/tests/rls/tenant_isolation.sql
-- ============================================================================

begin;

-- Tenant IDs
select '11111111-1111-1111-1111-111111111111'::uuid as tenant_a \gset
select '22222222-2222-2222-2222-222222222222'::uuid as tenant_b \gset

-- User IDs
select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid as user_a \gset
select 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid as user_b \gset

-- Site IDs
select 'aaaaaaaa-0000-0000-0000-000000000001'::uuid as site_a \gset
select 'bbbbbbbb-0000-0000-0000-000000000001'::uuid as site_b \gset

-- Task IDs
select 'aaaaaaaa-0000-0000-0000-000000000010'::uuid as task_a \gset
select 'bbbbbbbb-0000-0000-0000-000000000010'::uuid as task_b \gset

-- Temperature Log IDs
select 'aaaaaaaa-0000-0000-0000-000000000020'::uuid as temp_a \gset
select 'bbbbbbbb-0000-0000-0000-000000000020'::uuid as temp_b \gset

-- Incident IDs
select 'aaaaaaaa-0000-0000-0000-000000000030'::uuid as incident_a \gset
select 'bbbbbbbb-0000-0000-0000-000000000030'::uuid as incident_b \gset

-- Training Record IDs
select 'aaaaaaaa-0000-0000-0000-000000000040'::uuid as training_a \gset
select 'bbbbbbbb-0000-0000-0000-000000000040'::uuid as training_b \gset

-- Licence IDs
select 'aaaaaaaa-0000-0000-0000-000000000050'::uuid as licence_a \gset
select 'bbbbbbbb-0000-0000-0000-000000000050'::uuid as licence_b \gset

-- Global Document IDs
select 'aaaaaaaa-0000-0000-0000-000000000060'::uuid as doc_a \gset
select 'bbbbbbbb-0000-0000-0000-000000000060'::uuid as doc_global \gset

-- Task Template IDs
select 'aaaaaaaa-0000-0000-0000-000000000070'::uuid as template_a \gset
select 'bbbbbbbb-0000-0000-0000-000000000070'::uuid as template_global \gset

-- Region & Area IDs
select 'aaaaaaaa-0000-0000-0000-000000000080'::uuid as region_a \gset
select 'bbbbbbbb-0000-0000-0000-000000000080'::uuid as region_b \gset
select 'aaaaaaaa-0000-0000-0000-000000000090'::uuid as area_a \gset
select 'bbbbbbbb-0000-0000-0000-000000000090'::uuid as area_b \gset

-- Seed tenant data (service role context)
insert into public.companies (id, name, created_at, updated_at)
values
  (:'tenant_a'::uuid, 'Tenant A', now(), now()),
  (:'tenant_b'::uuid, 'Tenant B', now(), now());

insert into public.company_regions (id, company_id, name)
values
  (:'region_a'::uuid, :'tenant_a'::uuid, 'Region A'),
  (:'region_b'::uuid, :'tenant_b'::uuid, 'Region B');

insert into public.company_areas (id, company_id, region_id, name)
values
  (:'area_a'::uuid, :'tenant_a'::uuid, :'region_a'::uuid, 'Area A'),
  (:'area_b'::uuid, :'tenant_b'::uuid, :'region_b'::uuid, 'Area B');

insert into public.profiles (id, auth_user_id, company_id, app_role, full_name, email, created_at, updated_at)
values
  (:'user_a'::uuid, :'user_a'::uuid, :'tenant_a'::uuid, 'Manager', 'Tenant A Manager', 'manager-a@example.com', now(), now()),
  (:'user_b'::uuid, :'user_b'::uuid, :'tenant_b'::uuid, 'Manager', 'Tenant B Manager', 'manager-b@example.com', now(), now());

insert into public.sites (id, name, company_id, created_at, updated_at)
values
  (:'site_a'::uuid, 'Tenant A HQ', :'tenant_a'::uuid, now(), now()),
  (:'site_b'::uuid, 'Tenant B HQ', :'tenant_b'::uuid, now(), now());

update public.sites
set region_id = :'region_a'::uuid,
    area_id = :'area_a'::uuid
where id = :'site_a'::uuid;

update public.sites
set region_id = :'region_b'::uuid,
    area_id = :'area_b'::uuid
where id = :'site_b'::uuid;

insert into public.site_memberships (id, site_id, auth_user_id)
values
  (gen_random_uuid(), :'site_a'::uuid, :'user_a'::uuid),
  (gen_random_uuid(), :'site_b'::uuid, :'user_b'::uuid);

insert into public.site_members (site_id, user_id)
values
  (:'site_a'::uuid, :'user_a'::uuid),
  (:'site_b'::uuid, :'user_b'::uuid);

insert into public.user_scope_assignments (id, company_id, scope_type, scope_id, auth_user_id, profile_id, role)
values
  (gen_random_uuid(), :'tenant_a'::uuid, 'site', :'site_a'::uuid, :'user_a'::uuid, :'user_a'::uuid, 'manager'),
  (gen_random_uuid(), :'tenant_b'::uuid, 'site', :'site_b'::uuid, :'user_b'::uuid, :'user_b'::uuid, 'manager');

insert into public.user_site_access (company_id, site_id, auth_user_id, profile_id, role)
values
  (:'tenant_a'::uuid, :'site_a'::uuid, :'user_a'::uuid, :'user_a'::uuid, 'manager'),
  (:'tenant_b'::uuid, :'site_b'::uuid, :'user_b'::uuid, :'user_b'::uuid, 'manager');

insert into public.tasks (id, title, company_id, site_id, status, created_at, updated_at)
values
  (:'task_a'::uuid, 'Tenant A Task', :'tenant_a'::uuid, :'site_a'::uuid, 'incomplete', now(), now()),
  (:'task_b'::uuid, 'Tenant B Task', :'tenant_b'::uuid, :'site_b'::uuid, 'incomplete', now(), now());

insert into public.temperature_logs (id, reading, company_id, site_id, recorded_at, recorded_by, status, unit)
values
  (:'temp_a'::uuid, 4.2, :'tenant_a'::uuid, :'site_a'::uuid, now(), :'user_a'::uuid, 'ok', 'celsius'),
  (:'temp_b'::uuid, 7.5, :'tenant_b'::uuid, :'site_b'::uuid, now(), :'user_b'::uuid, 'breach', 'celsius');

insert into public.incidents (id, description, incident_date, site_id, user_id)
values
  (:'incident_a'::uuid, 'Slip and trip', now(), :'site_a'::uuid, :'user_a'::uuid),
  (:'incident_b'::uuid, 'Near miss', now(), :'site_b'::uuid, :'user_b'::uuid);

insert into public.training_records (id, user_id, training_type, completed_date)
values
  (:'training_a'::uuid, :'user_a'::uuid, 'fire_safety', now()),
  (:'training_b'::uuid, :'user_b'::uuid, 'fire_safety', now());

insert into public.licences (id, site_id, licence_type, expiry_date)
values
  (:'licence_a'::uuid, :'site_a'::uuid, 'alcohol', now() + interval '1 year'),
  (:'licence_b'::uuid, :'site_b'::uuid, 'alcohol', now() + interval '1 year');

insert into public.global_documents (id, company_id, title, description, created_at, updated_at, file_url)
values
  (:'doc_a'::uuid, :'tenant_a'::uuid, 'Tenant A Policy', 'Internal policy', now(), now(), 'tenant-a/policy.pdf'),
  (:'doc_global'::uuid, null, 'Global Policy', 'Shared policy', now(), now(), 'global/policy.pdf');

insert into public.task_templates (id, company_id, title, category, frequency, days_of_week, active, created_at, updated_at)
values
  (:'template_a'::uuid, :'tenant_a'::uuid, 'Tenant A Checklist', 'daily_opening', 'daily', ARRAY[1,2,3,4,5,6,7], true, now(), now()),
  (:'template_global'::uuid, null, 'Global Checklist', 'daily_opening', 'daily', ARRAY[1,2,3,4,5,6,7], true, now(), now());

-- ---------------------------------------------------------------------------
-- Tenant A assertions
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = :'user_a';
set local request.jwt.claim.tenant_id = :'tenant_a';
set local request.jwt.claim.company_id = :'tenant_a';

do $$
begin
  if (select count(*) from public.sites) <> 1 then
    raise exception 'Tenant A should see exactly 1 site';
  end if;

  if (select count(*) from public.user_site_access) <> 1 then
    raise exception 'Tenant A should see exactly 1 membership record';
  end if;

  if (select count(*) from public.user_scope_assignments) <> 1 then
    raise exception 'Tenant A should see exactly 1 scope assignment';
  end if;

  if (select count(*) from public.tasks) <> 1 then
    raise exception 'Tenant A should see exactly 1 task';
  end if;

  if (select count(*) from public.temperature_logs) <> 1 then
    raise exception 'Tenant A should see exactly 1 temperature log';
  end if;

  if (select count(*) from public.incidents) <> 1 then
    raise exception 'Tenant A should see exactly 1 incident';
  end if;

  if (select count(*) from public.training_records) <> 1 then
    raise exception 'Tenant A should see exactly 1 training record';
  end if;

  if (select count(*) from public.licences) <> 1 then
    raise exception 'Tenant A should see exactly 1 licence';
  end if;

  if (select count(*) from public.global_documents) <> 2 then
    raise exception 'Tenant A should see tenant + global documents';
  end if;

  if (select count(*) from public.task_templates) <> 2 then
    raise exception 'Tenant A should see tenant + global templates';
  end if;
end;
$$;

do $$
begin
  begin
    insert into public.tasks (id, title, company_id, site_id, status)
    values (gen_random_uuid(), 'Cross Tenant Task', :'tenant_b'::uuid, :'site_b'::uuid, 'incomplete');
    raise exception 'Cross-tenant insert should have failed for tasks';
  exception
    when sqlstate '42501' then
      -- expected permission denied
      null;
    when others then
      raise;
  end;
end;
$$;

reset role;
reset all;

-- ---------------------------------------------------------------------------
-- Tenant B assertions
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = :'user_b';
set local request.jwt.claim.tenant_id = :'tenant_b';
set local request.jwt.claim.company_id = :'tenant_b';

do $$
begin
  if (select count(*) from public.sites) <> 1 then
    raise exception 'Tenant B should see exactly 1 site';
  end if;

  if (select count(*) from public.user_site_access) <> 1 then
    raise exception 'Tenant B should see exactly 1 membership record';
  end if;

  if (select count(*) from public.user_scope_assignments) <> 1 then
    raise exception 'Tenant B should see exactly 1 scope assignment';
  end if;

  if (select count(*) from public.tasks) <> 1 then
    raise exception 'Tenant B should see exactly 1 task';
  end if;

  if (select count(*) from public.temperature_logs) <> 1 then
    raise exception 'Tenant B should see exactly 1 temperature log';
  end if;

  if (select count(*) from public.incidents) <> 1 then
    raise exception 'Tenant B should see exactly 1 incident';
  end if;

  if (select count(*) from public.training_records) <> 1 then
    raise exception 'Tenant B should see exactly 1 training record';
  end if;

  if (select count(*) from public.licences) <> 1 then
    raise exception 'Tenant B should see exactly 1 licence';
  end if;

  if (select count(*) from public.global_documents) <> 2 then
    raise exception 'Tenant B should see tenant + global documents';
  end if;

  if (select count(*) from public.task_templates) <> 2 then
    raise exception 'Tenant B should see tenant + global templates';
  end if;
end;
$$;

do $$
begin
  begin
    insert into public.sites (id, name, company_id)
    values (gen_random_uuid(), 'Cross Tenant Site', :'tenant_a'::uuid);
    raise exception 'Cross-tenant insert should have failed for sites';
  exception
    when sqlstate '42501' then
      null;
    when others then
      raise;
  end;
end;
$$;

reset role;
reset all;

-- Cleanup without committing changes
rollback;

