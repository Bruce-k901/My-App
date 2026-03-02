-- RPC function to archive an asset
-- Moves asset from assets table to archived state
-- Also removes PPM schedule entries for the archived asset
create or replace function archive_asset(asset_to_archive uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Delete PPM schedule entries for this asset
  -- This prevents PPM tasks from being generated for archived assets
  delete from ppm_schedule
  where asset_id = asset_to_archive;
  
  -- Update the asset to set archived = true and archived_at timestamp
  update assets 
  set archived = true, archived_at = now()
  where id = asset_to_archive;
  
  -- Optional: You could also move to a separate archived_assets table
  -- insert into archived_assets select *, now() as archived_at from assets where id = asset_to_archive;
  -- delete from assets where id = asset_to_archive;
end;
$$;

-- Trigger function to automatically remove PPM schedules when an asset is archived
-- This handles cases where assets are archived via direct UPDATE statements
create or replace function remove_ppm_on_asset_archive()
returns trigger
language plpgsql
security definer
as $$
begin
  -- If asset is being archived (archived changed from false to true)
  if (new.archived = true and (old.archived is null or old.archived = false)) then
    -- Delete all PPM schedule entries for this asset
    delete from ppm_schedule
    where asset_id = new.id;
  end if;
  
  return new;
end;
$$;

-- Create trigger to automatically remove PPM schedules when assets are archived
drop trigger if exists trigger_remove_ppm_on_archive on assets;
create trigger trigger_remove_ppm_on_archive
  before update on assets
  for each row
  execute function remove_ppm_on_asset_archive();
