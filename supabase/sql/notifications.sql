-- Notifications table for in-app feed and digests
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  site_id uuid,
  user_id uuid references auth.users(id) on delete set null,
  ppm_id uuid references ppm_schedule(id) on delete cascade,
  asset_id uuid references assets_redundant(id) on delete cascade,
  type text not null check (type in ('incident','temperature','task','maintenance','digest','ppm_due_soon','ppm_overdue','ppm_completed')),
  title text not null,
  message text not null,
  severity text not null check (severity in ('info','warning','critical')),
  recipient_role text check (recipient_role in ('staff','manager','admin')),
  status text not null default 'active' check (status in ('active','archived')),
  read boolean default false,
  email_sent boolean default false,
  due_date date,
  priority text default 'medium' check (priority in ('low','medium','high','urgent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
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
create index if not exists idx_notifications_ppm_id on public.notifications(ppm_id);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_type on public.notifications(type);
create index if not exists idx_notifications_read on public.notifications(read);
create index if not exists idx_notifications_due_date on public.notifications(due_date);
create index if not exists idx_notifications_company_unread on public.notifications(company_id, read) where read = false;

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

-- PPM Notification Functions
-- Function to create PPM notifications
create or replace function public.create_ppm_notification(
  p_company_id uuid,
  p_user_id uuid,
  p_ppm_id uuid,
  p_asset_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_due_date date default null,
  p_priority text default 'medium'
)
returns uuid language plpgsql security definer as $$
declare
  notification_id uuid;
begin
  -- Check if notification already exists for this PPM and type today
  select id into notification_id
  from public.notifications
  where ppm_id = p_ppm_id 
    and type = p_type 
    and created_at::date = current_date;

  -- If notification doesn't exist, create it
  if notification_id is null then
    insert into public.notifications (
      company_id,
      user_id,
      ppm_id,
      asset_id,
      type,
      title,
      message,
      due_date,
      priority,
      severity
    ) values (
      p_company_id,
      p_user_id,
      p_ppm_id,
      p_asset_id,
      p_type,
      p_title,
      p_message,
      p_due_date,
      p_priority,
      case p_priority
        when 'urgent' then 'critical'
        when 'high' then 'warning'
        else 'info'
      end
    ) returning id into notification_id;
  end if;

  return notification_id;
end;
$$;

-- Function to mark notifications as read
create or replace function public.mark_notification_read(notification_id uuid)
returns boolean language plpgsql security definer as $$
begin
  update public.notifications 
  set read = true, updated_at = now()
  where id = notification_id;
  
  return found;
end;
$$;

-- Function to clear completed PPM notifications
create or replace function public.clear_ppm_notifications(p_ppm_id uuid)
returns void language plpgsql security definer as $$
begin
  -- Mark existing notifications as read when PPM is completed
  update public.notifications 
  set read = true, updated_at = now()
  where ppm_id = p_ppm_id 
    and type in ('ppm_due_soon', 'ppm_overdue')
    and read = false;
end;
$$;

-- Function to generate daily PPM notifications
create or replace function public.generate_daily_ppm_notifications()
returns integer language plpgsql security definer as $$
declare
  ppm_record record;
  notification_count integer := 0;
  days_until_due integer;
  notification_type text;
  notification_title text;
  notification_message text;
  notification_priority text;
begin
  -- Loop through all active PPM schedules
  for ppm_record in
    select 
      ps.*,
      a.name as asset_name,
      a.category as asset_category,
      a.company_id,
      s.name as site_name,
      c.name as contractor_name,
      ucr.user_id as assigned_user_id
    from public.ppm_schedule ps
    join public.assets a on ps.asset_id = a.id
    join public.sites s on a.site_id = s.id
    left join public.contractors c on ps.contractor_id = c.id
    left join public.user_company_roles ucr on ucr.company_id = a.company_id 
      and ucr.role in ('admin', 'owner', 'manager')
    where ps.status in ('scheduled', 'due_soon', 'overdue')
      and ps.next_service_date is not null
  loop
    -- Calculate days until due
    days_until_due := ppm_record.next_service_date - current_date;
    
    -- Determine notification type and priority
    if days_until_due < 0 then
      notification_type := 'ppm_overdue';
      notification_priority := 'urgent';
      notification_title := 'PPM Overdue: ' || ppm_record.asset_name;
      notification_message := 'PPM for ' || ppm_record.asset_name || ' at ' || ppm_record.site_name || 
                             ' is ' || abs(days_until_due) || ' days overdue. Immediate attention required.';
    elsif days_until_due <= 14 then
      notification_type := 'ppm_due_soon';
      notification_priority := case 
        when days_until_due <= 3 then 'high'
        when days_until_due <= 7 then 'medium'
        else 'low'
      end;
      notification_title := 'PPM Due Soon: ' || ppm_record.asset_name;
      notification_message := 'PPM for ' || ppm_record.asset_name || ' at ' || ppm_record.site_name || 
                             ' is due in ' || days_until_due || ' days.';
    else
      continue; -- Skip if more than 14 days away
    end if;

    -- Create notification
    perform public.create_ppm_notification(
      ppm_record.company_id,
      ppm_record.assigned_user_id,
      ppm_record.id,
      ppm_record.asset_id,
      notification_type,
      notification_title,
      notification_message,
      ppm_record.next_service_date,
      notification_priority
    );

    notification_count := notification_count + 1;
  end loop;

  return notification_count;
end;
$$;

-- Function to create PPM tasks for due/overdue PPMs
CREATE OR REPLACE FUNCTION create_ppm_tasks()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_count INTEGER := 0;
  ppm_record RECORD;
BEGIN
  -- Create tasks for PPMs that are due soon or overdue and don't already have a task
  FOR ppm_record IN
    SELECT 
      p.id,
      p.company_id,
      p.site_id,
      p.asset_id,
      p.next_service_date,
      p.contractor_id,
      a.name as asset_name,
      a.location as asset_location
    FROM ppm_schedule p
    JOIN assets a ON a.id = p.asset_id
    WHERE p.next_service_date <= CURRENT_DATE + INTERVAL '14 days'
      AND p.status IN ('scheduled', 'due_soon', 'overdue')
      AND a.archived = false  -- Exclude archived assets
      AND NOT EXISTS (
        SELECT 1 FROM tasks t 
        WHERE t.linked_ppm_id = p.id 
          AND t.status != 'completed'
      )
  LOOP
    -- Insert new PPM task
    INSERT INTO tasks (
      company_id,
      site_id,
      name,
      task_type,
      linked_ppm_id,
      linked_asset_id,
      due_date,
      assigned_to,
      status,
      notes
    ) VALUES (
      ppm_record.company_id,
      ppm_record.site_id,
      'PPM Service: ' || ppm_record.asset_name || 
        CASE 
          WHEN ppm_record.asset_location IS NOT NULL 
          THEN ' (' || ppm_record.asset_location || ')'
          ELSE ''
        END,
      'ppm',
      ppm_record.id,
      ppm_record.asset_id,
      ppm_record.next_service_date,
      ppm_record.contractor_id,
      CASE 
        WHEN ppm_record.next_service_date < CURRENT_DATE THEN 'overdue'
        WHEN ppm_record.next_service_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'urgent'
        ELSE 'pending'
      END,
      'Automatically generated PPM task for scheduled maintenance'
    );
    
    task_count := task_count + 1;
  END LOOP;
  
  RETURN task_count;
END;
$$;

-- Trigger function to sync PPM status when task is completed
CREATE OR REPLACE FUNCTION sync_ppm_task_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If this is a PPM task being marked as completed
  IF NEW.task_type = 'ppm' AND NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.linked_ppm_id IS NOT NULL THEN
    -- Update the PPM schedule status to completed
    UPDATE ppm_schedule 
    SET 
      status = 'completed',
      last_service_date = NEW.completed_at::date,
      next_service_date = CASE 
        WHEN frequency_days IS NOT NULL 
        THEN (NEW.completed_at::date + (frequency_days || ' days')::interval)::date
        ELSE next_service_date
      END
    WHERE id = NEW.linked_ppm_id;
    
    -- Clear any outstanding PPM notifications for this PPM
    UPDATE notifications 
    SET status = 'read'
    WHERE ppm_id = NEW.linked_ppm_id 
      AND type IN ('ppm_due_soon', 'ppm_overdue')
      AND status = 'unread';
  END IF;
  
  -- If PPM task is being marked as incomplete, revert PPM status
  IF NEW.task_type = 'ppm' AND NEW.status != 'completed' AND OLD.status = 'completed' AND NEW.linked_ppm_id IS NOT NULL THEN
    UPDATE ppm_schedule 
    SET 
      status = CASE 
        WHEN next_service_date < CURRENT_DATE THEN 'overdue'
        WHEN next_service_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'due_soon'
        ELSE 'scheduled'
      END,
      last_service_date = NULL
    WHERE id = NEW.linked_ppm_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for PPM task completion sync
DROP TRIGGER IF EXISTS sync_ppm_task_completion_trigger ON tasks;
CREATE TRIGGER sync_ppm_task_completion_trigger
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_ppm_task_completion();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notifications_updated_at_trigger
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();