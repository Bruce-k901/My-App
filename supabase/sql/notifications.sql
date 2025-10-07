-- Notifications table for in-app feed and digests
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  site_id uuid,
  type text not null check (type in ('incident','temperature','task','maintenance','digest')),
  title text not null,
  message text not null,
  severity text not null check (severity in ('info','warning','critical')),
  recipient_role text check (recipient_role in ('staff','manager','admin')),
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

-- Company isolation: only see notifications for your company
create policy if not exists notifications_select_company
  on public.notifications for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.company_id = notifications.company_id
    )
  );

create policy if not exists notifications_insert_company
  on public.notifications for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.company_id = notifications.company_id
    )
  );

create policy if not exists notifications_update_company
  on public.notifications for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.company_id = notifications.company_id
    )
  ) with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.company_id = notifications.company_id
    )
  );

-- Helpful indexes
create index if not exists idx_notifications_company_created on public.notifications(company_id, created_at desc);
create index if not exists idx_notifications_site_created on public.notifications(site_id, created_at desc);
create index if not exists idx_notifications_status on public.notifications(status);

-- Triggers: insert notifications for incidents and failed temperature logs
create or replace function public.notify_on_incident()
returns trigger language plpgsql as $$
begin
  insert into public.notifications(company_id, site_id, type, title, message, severity, recipient_role)
  values (
    new.company_id,
    new.site_id,
    'incident',
    coalesce(new.type, 'Incident'),
    coalesce(new.description, 'New incident recorded.'),
    case when new.severity = 'high' then 'critical' else 'warning' end,
    'manager'
  );
  return new;
end;$$;

drop trigger if exists trg_notify_on_incident on public.incidents;
create trigger trg_notify_on_incident
after insert on public.incidents
for each row execute function public.notify_on_incident();

create or replace function public.notify_on_failed_temperature()
returns trigger language plpgsql as $$
declare
  asset_name text;
begin
  if new.status = 'failed' then
    select name into asset_name from public.assets where id = new.asset_id;
    insert into public.notifications(company_id, site_id, type, title, message, severity, recipient_role)
    values (
      new.company_id,
      new.site_id,
      'temperature',
      'Temperature Warning',
      format('Reading %s%s for %s at %s flagged as FAILED', new.reading, coalesce(new.unit,'°C'), coalesce(asset_name,'asset'), new.recorded_at),
      'warning',
      'manager'
    );
  end if;
  return new;
end;$$;

drop trigger if exists trg_notify_on_failed_temperature on public.temperature_logs;
create trigger trg_notify_on_failed_temperature
after insert on public.temperature_logs
for each row execute function public.notify_on_failed_temperature();