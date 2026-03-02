-- Migration: Auto-create COSHH data sheet entries when chemicals are added
-- This ensures that when a chemical is added to Stockly, a card appears in COSHH Data page

-- Step 1: Make file_name and file_url nullable to allow placeholder entries
DO $$
BEGIN
  -- Check if columns exist and are NOT NULL
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'coshh_data_sheets' 
      AND column_name = 'file_name'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.coshh_data_sheets 
      ALTER COLUMN file_name DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'coshh_data_sheets' 
      AND column_name = 'file_url'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.coshh_data_sheets 
      ALTER COLUMN file_url DROP NOT NULL;
  END IF;
END $$;

-- Step 2: Create function to auto-create COSHH data sheet entry
-- Only proceed if required tables exist
DO $$
BEGIN
  -- Check if required tables exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'chemicals_library'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'coshh_data_sheets'
  ) THEN
    RAISE NOTICE 'chemicals_library or coshh_data_sheets tables do not exist - skipping auto_create_coshh_for_chemical function and trigger';
    RETURN;
  END IF;

  -- Create function using EXECUTE
  EXECUTE $sql_func1$
    CREATE OR REPLACE FUNCTION auto_create_coshh_for_chemical()
    RETURNS TRIGGER AS $func$
    BEGIN
      -- Only create if one doesn't already exist for this chemical
      IF NOT EXISTS (
        SELECT 1 
        FROM coshh_data_sheets 
        WHERE chemical_id = NEW.id 
          AND status = 'Active'
      ) THEN
        INSERT INTO coshh_data_sheets (
          company_id,
          chemical_id,
          product_name,
          manufacturer,
          document_type,
          file_name,
          file_url,
          status,
          verification_status,
          created_at,
          updated_at
        ) VALUES (
          NEW.company_id,
          NEW.id,
          NEW.product_name,
          NEW.manufacturer,
          'COSHH',
          NULL, -- file_name will be set when user uploads
          NULL, -- file_url will be set when user uploads
          'Active',
          'Pending',
          NOW(),
          NOW()
        );
      END IF;
      
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  $sql_func1$;

  -- Step 3: Create trigger on chemicals_library insert
  DROP TRIGGER IF EXISTS trg_auto_create_coshh_on_chemical_insert ON chemicals_library;

  CREATE TRIGGER trg_auto_create_coshh_on_chemical_insert
    AFTER INSERT ON chemicals_library
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_coshh_for_chemical();

  -- Step 4: Add comment explaining the trigger
  COMMENT ON FUNCTION auto_create_coshh_for_chemical() IS 
    'Automatically creates a placeholder COSHH data sheet entry when a chemical is added to the library. The user can then upload the actual data sheet file.';

END $$;
