-- RPC function to unarchive an asset
-- Moves asset back from archived state to active
create or replace function unarchive_asset(asset_to_unarchive uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Update the asset to set archived = false and clear archived_at
  update assets 
  set archived = false, archived_at = null
  where id = asset_to_unarchive;
end;
$$;
