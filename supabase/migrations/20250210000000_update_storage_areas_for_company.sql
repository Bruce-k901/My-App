-- ============================================================================
-- Migration: Update Storage Areas for Company-Based Structure
-- Description: Updates stockly.storage_areas table to use company_id instead of site_id,
--              adds division and description fields per implementation spec
--              Updates public.storage_areas view to reflect changes
-- ============================================================================

DO $$
BEGIN
  -- Only proceed if stockly.storage_areas table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'stockly' AND table_name = 'storage_areas') THEN

    -- Add company_id column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'stockly' 
      AND table_name = 'storage_areas' 
      AND column_name = 'company_id'
    ) THEN
      -- Add company_id column (nullable initially for migration)
      ALTER TABLE stockly.storage_areas 
      ADD COLUMN company_id UUID;
      
      -- Populate company_id from site_id if sites table exists
      IF EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_schema = 'public' AND table_name = 'sites') THEN
        UPDATE stockly.storage_areas sa
        SET company_id = s.company_id
        FROM public.sites s
        WHERE sa.site_id = s.id AND sa.company_id IS NULL;
      END IF;
      
      -- Make company_id NOT NULL after population (only if we have data)
      -- Check if there are any rows with NULL company_id first
      IF NOT EXISTS (SELECT 1 FROM stockly.storage_areas WHERE company_id IS NULL) THEN
        ALTER TABLE stockly.storage_areas 
        ALTER COLUMN company_id SET NOT NULL;
      END IF;
      
      -- Add foreign key constraint
      IF EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_schema = 'public' AND table_name = 'companies') THEN
        -- Drop existing constraint if it exists
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE table_schema = 'stockly' 
          AND table_name = 'storage_areas' 
          AND constraint_name = 'storage_areas_company_id_fkey'
        ) THEN
          ALTER TABLE stockly.storage_areas
          DROP CONSTRAINT storage_areas_company_id_fkey;
        END IF;
        
        ALTER TABLE stockly.storage_areas
        ADD CONSTRAINT storage_areas_company_id_fkey
        FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
      END IF;
      
      -- Create index
      CREATE INDEX IF NOT EXISTS idx_storage_areas_company 
      ON stockly.storage_areas(company_id);
    END IF;

    -- Add division column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'stockly' 
      AND table_name = 'storage_areas' 
      AND column_name = 'division'
    ) THEN
      ALTER TABLE stockly.storage_areas 
      ADD COLUMN division TEXT;
    END IF;

    -- Add description column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'stockly' 
      AND table_name = 'storage_areas' 
      AND column_name = 'description'
    ) THEN
      ALTER TABLE stockly.storage_areas 
      ADD COLUMN description TEXT;
    END IF;

    -- Update unique constraint to use company_id instead of site_id
    -- Drop old constraint if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'stockly' 
      AND table_name = 'storage_areas' 
      AND constraint_name = 'storage_areas_site_id_name_key'
    ) THEN
      ALTER TABLE stockly.storage_areas 
      DROP CONSTRAINT storage_areas_site_id_name_key;
    END IF;
    
    -- Add new unique constraint on company_id and name (if company_id is NOT NULL)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'stockly' 
      AND table_name = 'storage_areas' 
      AND constraint_name = 'unique_storage_area_name_per_company'
    ) THEN
      -- Only add constraint if company_id column exists and is NOT NULL
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'stockly' 
        AND table_name = 'storage_areas' 
        AND column_name = 'company_id'
        AND is_nullable = 'NO'
      ) THEN
        ALTER TABLE stockly.storage_areas 
        ADD CONSTRAINT unique_storage_area_name_per_company 
        UNIQUE(company_id, name);
      END IF;
    END IF;

  END IF;
END $$;

-- Drop and recreate the public view to include new columns
-- Only if stockly.storage_areas table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'stockly' AND table_name = 'storage_areas') THEN
    DROP VIEW IF EXISTS public.storage_areas CASCADE;

    EXECUTE $sql_view1$
      CREATE VIEW public.storage_areas AS
      SELECT 
        id,
        company_id,
        name,
        division,
        description,
        is_active,
        sort_order,
        created_at,
        updated_at
      FROM stockly.storage_areas;
    $sql_view1$;

    -- Set view to be security invoker (uses permissions of the querying user)
    ALTER VIEW public.storage_areas SET (security_invoker = true);

    -- Enable RLS on the underlying table
    ALTER TABLE stockly.storage_areas ENABLE ROW LEVEL SECURITY;
  ELSE
    RAISE NOTICE 'stockly.storage_areas table does not exist - skipping view creation';
  END IF;
END $$;

-- Drop existing policies on stockly.storage_areas if they exist
-- Only if stockly.storage_areas table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'stockly' AND table_name = 'storage_areas') THEN
    DROP POLICY IF EXISTS "Users can view their company's storage areas" ON stockly.storage_areas;
    DROP POLICY IF EXISTS "Managers can insert storage areas" ON stockly.storage_areas;
    DROP POLICY IF EXISTS "Managers can update storage areas" ON stockly.storage_areas;
    DROP POLICY IF EXISTS "Managers can delete storage areas" ON stockly.storage_areas;
    DROP POLICY IF EXISTS "storage_areas_site" ON stockly.storage_areas;

    -- RLS Policies on stockly.storage_areas
    -- Check if profiles table exists before creating policies
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    
    -- Users can view their company's storage areas
    CREATE POLICY "Users can view their company's storage areas"
      ON stockly.storage_areas FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
          AND p.company_id = stockly.storage_areas.company_id
        )
      );

    -- Managers can insert storage areas
    CREATE POLICY "Managers can insert storage areas"
      ON stockly.storage_areas FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
          AND p.company_id = stockly.storage_areas.company_id
          AND p.app_role IS NOT NULL
          AND LOWER(p.app_role::text) IN ('owner', 'admin', 'manager', 'general_manager', 'area_manager')
        )
      );

    -- Managers can update storage areas
    CREATE POLICY "Managers can update storage areas"
      ON stockly.storage_areas FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
          AND p.company_id = stockly.storage_areas.company_id
          AND p.app_role IS NOT NULL
          AND LOWER(p.app_role::text) IN ('owner', 'admin', 'manager', 'general_manager', 'area_manager')
        )
      );

    -- Managers can delete storage areas
    CREATE POLICY "Managers can delete storage areas"
      ON stockly.storage_areas FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
          AND p.company_id = stockly.storage_areas.company_id
          AND p.app_role IS NOT NULL
          AND LOWER(p.app_role::text) IN ('owner', 'admin', 'manager', 'general_manager', 'area_manager')
        )
      );
    END IF;
  END IF;
END $$;

-- Add storage_area_id to ingredients_library table if it doesn't exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name = 'ingredients_library') 
     AND EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_schema = 'stockly' AND table_name = 'storage_areas') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'ingredients_library' 
      AND column_name = 'storage_area_id'
    ) THEN
      ALTER TABLE public.ingredients_library 
      ADD COLUMN storage_area_id UUID;
      
      -- Add foreign key constraint to stockly.storage_areas
      ALTER TABLE public.ingredients_library
      ADD CONSTRAINT ingredients_library_storage_area_id_fkey
      FOREIGN KEY (storage_area_id) REFERENCES stockly.storage_areas(id) ON DELETE SET NULL;
      
      CREATE INDEX IF NOT EXISTS idx_ingredients_storage_area 
      ON public.ingredients_library(storage_area_id);
    END IF;
  END IF;
END $$;

-- Create or replace trigger for updated_at on stockly.storage_areas
-- Only if stockly.storage_areas table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'stockly' AND table_name = 'storage_areas') THEN
    DROP TRIGGER IF EXISTS update_storage_areas_updated_at ON stockly.storage_areas;

    -- Check if update_updated_at_column function exists
    IF EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = 'update_updated_at_column'
    ) THEN
      CREATE TRIGGER update_storage_areas_updated_at
        BEFORE UPDATE ON stockly.storage_areas
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Comment the table
    COMMENT ON TABLE stockly.storage_areas IS 'Physical storage locations for inventory management and stock counting';
  END IF;
END $$;

-- Grant permissions on the view (only if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views 
             WHERE table_schema = 'public' AND table_name = 'storage_areas') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.storage_areas TO authenticated;
  END IF;
END $$;
