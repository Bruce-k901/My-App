-- Sync PPM fields from ppm_groups to member assets
-- When a group's dates/contractor/frequency change, all member assets stay aligned

-- ============================================================
-- Trigger A: When ppm_groups PPM fields are updated, sync to all member assets
-- ============================================================
CREATE OR REPLACE FUNCTION sync_ppm_fields_from_group()
RETURNS TRIGGER AS $$
DECLARE
  v_asset_status TEXT;
BEGIN
  -- Map group ppm_status to asset ppm_status (different constraint vocabularies)
  -- assets CHECK: NULL, 'up_to_date', 'due_soon', 'overdue', 'service_booked', 'not_applicable'
  CASE NEW.ppm_status
    WHEN 'overdue'     THEN v_asset_status := 'overdue';
    WHEN 'due_soon'    THEN v_asset_status := 'due_soon';
    WHEN 'upcoming'    THEN v_asset_status := 'up_to_date';
    WHEN 'unscheduled' THEN v_asset_status := NULL;
    ELSE v_asset_status := NULL;
  END CASE;

  UPDATE assets
  SET
    next_service_date    = NEW.next_service_date,
    last_service_date    = NEW.last_service_date,
    ppm_frequency_months = NEW.ppm_frequency_months,
    ppm_contractor_id    = NEW.ppm_contractor_id,
    ppm_status           = v_asset_status
  WHERE ppm_group_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_ppm_fields_from_group
  AFTER UPDATE OF next_service_date, last_service_date, ppm_frequency_months,
                  ppm_contractor_id, ppm_status
  ON ppm_groups
  FOR EACH ROW
  EXECUTE FUNCTION sync_ppm_fields_from_group();

-- ============================================================
-- Trigger B: Enhance existing sync_asset_ppm_group() to also sync PPM fields
-- when an asset is added to or removed from a group
-- ============================================================
CREATE OR REPLACE FUNCTION sync_asset_ppm_group()
RETURNS TRIGGER AS $$
DECLARE
  v_group RECORD;
  v_asset_status TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Look up the group's current PPM fields
    SELECT next_service_date, last_service_date, ppm_frequency_months,
           ppm_contractor_id, ppm_status
    INTO v_group
    FROM ppm_groups
    WHERE id = NEW.ppm_group_id;

    -- Map group status to asset status
    CASE v_group.ppm_status
      WHEN 'overdue'     THEN v_asset_status := 'overdue';
      WHEN 'due_soon'    THEN v_asset_status := 'due_soon';
      WHEN 'upcoming'    THEN v_asset_status := 'up_to_date';
      WHEN 'unscheduled' THEN v_asset_status := NULL;
      ELSE v_asset_status := NULL;
    END CASE;

    UPDATE assets
    SET ppm_group_id       = NEW.ppm_group_id,
        next_service_date    = v_group.next_service_date,
        last_service_date    = v_group.last_service_date,
        ppm_frequency_months = v_group.ppm_frequency_months,
        ppm_contractor_id    = v_group.ppm_contractor_id,
        ppm_status           = v_asset_status
    WHERE id = NEW.asset_id;

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- Clear group link and PPM fields (asset returns to unscheduled)
    UPDATE assets
    SET ppm_group_id       = NULL,
        next_service_date    = NULL,
        last_service_date    = NULL,
        ppm_frequency_months = NULL,
        ppm_contractor_id    = NULL,
        ppm_status           = NULL
    WHERE id = OLD.asset_id;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Backfill: sync PPM fields for assets already in groups
-- ============================================================
UPDATE assets a
SET
  next_service_date    = g.next_service_date,
  last_service_date    = g.last_service_date,
  ppm_frequency_months = g.ppm_frequency_months,
  ppm_contractor_id    = g.ppm_contractor_id,
  ppm_status           = CASE g.ppm_status
                            WHEN 'overdue'  THEN 'overdue'
                            WHEN 'due_soon' THEN 'due_soon'
                            WHEN 'upcoming' THEN 'up_to_date'
                            ELSE NULL
                          END
FROM ppm_groups g
WHERE a.ppm_group_id = g.id
  AND a.ppm_group_id IS NOT NULL;
