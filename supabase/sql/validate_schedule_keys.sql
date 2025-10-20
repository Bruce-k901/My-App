-- Function to validate operating schedule keys
-- Ensures that schedule keys follow proper casing (e.g., "Monday" not "monday" or "MONDAY")
-- and prevents duplicate entries with different casing

create or replace function validate_schedule_keys()
returns trigger as $$
begin
  -- Check if operating_schedule exists and is not null
  if new.operating_schedule is not null then
    -- Check for invalid key casing (keys that are neither all lowercase nor proper case)
    if exists (
      select 1
      from jsonb_object_keys(new.operating_schedule) as key
      where key != initcap(key) and key != lower(key)
    ) then
      raise exception 'Invalid schedule key casing. Keys must be properly capitalized (e.g., "Monday", not "monday" or "MONDAY")';
    end if;

    -- Check for duplicate days with different casing
    -- This compares the count of unique lowercase keys vs total keys
    if (
      select count(distinct lower(key))
      from jsonb_object_keys(new.operating_schedule) as key
    ) != (
      select count(key)
      from jsonb_object_keys(new.operating_schedule) as key
    ) then
      raise exception 'Duplicate schedule keys with different casing detected. Each day should appear only once.';
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

-- Create trigger to run validation before insert or update on sites table
create trigger check_schedule_keys
  before insert or update on sites
  for each row execute function validate_schedule_keys();

-- Add a comment for documentation
comment on function validate_schedule_keys() is 'Validates operating_schedule keys to prevent duplicate days with different casing and enforce proper capitalization';
comment on trigger check_schedule_keys on sites is 'Ensures operating_schedule data integrity by validating key casing and preventing duplicates';