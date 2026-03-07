-- When an asset is archived, remove it from its PPM group
-- The DELETE on ppm_group_assets fires the existing sync_asset_ppm_group()
-- trigger which clears ppm_group_id and PPM fields on the asset

CREATE OR REPLACE FUNCTION remove_archived_asset_from_ppm_group()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act when archived changes from false/null to true
  IF NEW.archived = true AND (OLD.archived IS NULL OR OLD.archived = false) THEN
    DELETE FROM ppm_group_assets WHERE asset_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_remove_archived_asset_from_ppm_group
  AFTER UPDATE OF archived ON assets
  FOR EACH ROW
  WHEN (NEW.archived = true)
  EXECUTE FUNCTION remove_archived_asset_from_ppm_group();
