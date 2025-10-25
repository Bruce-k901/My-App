-- RPC function to archive an asset
-- Moves asset from assets table to archived state
create or replace function archive_asset(asset_to_archive uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Update the asset to set archived = true and archived_at timestamp
  update assets 
  set archived = true, archived_at = now()
  where id = asset_to_archive;
  
  -- Optional: You could also move to a separate archived_assets table
  -- insert into archived_assets select *, now() as archived_at from assets where id = asset_to_archive;
  -- delete from assets where id = asset_to_archive;
end;
$$;
