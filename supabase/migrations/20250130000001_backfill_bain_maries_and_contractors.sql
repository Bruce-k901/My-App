-- Migration: Backfill Bain Maries to all sites
-- Description: Adds a Bain Marie asset to every active site, linked to existing catering equipment contractors
-- Date: 2025-01-30

-- ============================================================================
-- Backfill Bain Maries to all active sites
-- ============================================================================

DO $$
DECLARE
  site_record RECORD;
  bain_marie_exists BOOLEAN;
  catering_contractor_id UUID;
  asset_id UUID;
BEGIN
  -- Loop through all active sites
  FOR site_record IN
    SELECT 
      s.id as site_id,
      s.name as site_name,
      s.company_id,
      s.region
    FROM public.sites s
    WHERE (s.status IS NULL OR s.status = 'active' OR s.status = '')
      AND s.company_id IS NOT NULL
  LOOP
    -- Check if a Bain Marie already exists for this site
    SELECT EXISTS(
      SELECT 1
      FROM public.assets
      WHERE site_id = site_record.site_id
        AND company_id = site_record.company_id
        AND (
          category ILIKE '%bain marie%' OR
          category ILIKE '%hot holding%' OR
          category ILIKE '%hot_holding%' OR
          name ILIKE '%bain marie%' OR
          name ILIKE '%hot holding%'
        )
        AND (archived IS NULL OR archived = false)
      LIMIT 1
    ) INTO bain_marie_exists;

    -- If no Bain Marie exists, create one
    IF NOT bain_marie_exists THEN
      -- Find the catering equipment contractor for this site's company
      -- Look for contractors with category/name/email matching "catering equipment"
      SELECT id INTO catering_contractor_id
      FROM public.contractors
      WHERE company_id = site_record.company_id
        AND (
          category ILIKE '%catering equipment%' OR
          name ILIKE '%catering equipment%' OR
          email ILIKE '%cateringequipment%'
        )
      ORDER BY 
        -- Prioritize region-specific contractors if region is available
        CASE 
          WHEN site_record.region IS NOT NULL AND (
            name ILIKE '%' || site_record.region || '%' OR 
            notes ILIKE '%' || site_record.region || '%' OR
            email ILIKE '%' || LOWER(site_record.region) || '%'
          ) THEN 0 
          ELSE 1 
        END,
        -- Then prioritize by exact category match
        CASE 
          WHEN category ILIKE '%catering equipment%' THEN 0
          ELSE 1
        END
      LIMIT 1;

      -- Create the Bain Marie asset
      INSERT INTO public.assets (
        company_id,
        site_id,
        name,
        category,
        status,
        archived,
        reactive_contractor_id,
        notes,
        created_at,
        updated_at
      ) VALUES (
        site_record.company_id,
        site_record.site_id,
        'Bain Marie - ' || site_record.site_name,
        'Hot Holding',
        'active',
        false,
        catering_contractor_id, -- Link to catering equipment contractor for repairs
        'Auto-created Bain Marie for hot holding compliance checks',
        NOW(),
        NOW()
      )
      RETURNING id INTO asset_id;

      RAISE NOTICE 'Created Bain Marie asset % for site % (company: %, region: %, contractor: %)', 
        asset_id, site_record.site_name, site_record.company_id, site_record.region, catering_contractor_id;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- Summary Report
-- ============================================================================

-- Display summary of what was created
DO $$
DECLARE
  asset_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO asset_count
  FROM public.assets
  WHERE category ILIKE '%hot holding%'
    AND name ILIKE '%bain marie%'
    AND created_at >= NOW() - INTERVAL '1 minute';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Backfill Summary:';
  RAISE NOTICE '  Bain Marie assets created: %', asset_count;
  RAISE NOTICE '========================================';
END $$;

