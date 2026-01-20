-- Add version history support to risk_assessments
-- This allows tracking changes, who made them, and when (similar to SOPs)
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if risk_assessments table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'risk_assessments') THEN

    -- Add parent_id to link versions together (null for original, UUID for versions)
    ALTER TABLE risk_assessments 
    ADD COLUMN IF NOT EXISTS parent_id UUID;

    -- Add foreign key constraint if column was just added
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'risk_assessments_parent_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'risk_assessments'
    ) THEN
      ALTER TABLE risk_assessments
      ADD CONSTRAINT risk_assessments_parent_id_fkey
      FOREIGN KEY (parent_id) REFERENCES risk_assessments(id) ON DELETE SET NULL;
    END IF;

    -- Add version_number as integer for easier sorting (1, 2, 3, etc.)
    ALTER TABLE risk_assessments 
    ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;

    -- Add change_notes to track what changed in this version
    ALTER TABLE risk_assessments 
    ADD COLUMN IF NOT EXISTS change_notes TEXT;

    -- Create index for parent_id for faster lookups
    CREATE INDEX IF NOT EXISTS idx_risk_assessments_parent_id ON risk_assessments(parent_id);

    -- Create index for ref_code and version_number for version queries
    CREATE INDEX IF NOT EXISTS idx_risk_assessments_ref_code_version ON risk_assessments(ref_code, version_number);

    -- Function to get the latest version of an RA by ref_code
    CREATE OR REPLACE FUNCTION get_latest_ra_version(p_ref_code TEXT, p_company_id UUID)
    RETURNS TABLE (
      id UUID,
      title TEXT,
      ref_code TEXT,
      version_number INTEGER,
      status TEXT,
      template_type TEXT,
      assessor_name TEXT,
      assessment_date DATE,
      review_date DATE,
      next_review_date DATE,
      created_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ,
      created_by UUID
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $function$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'risk_assessments') THEN
        RETURN QUERY
        SELECT 
          ra.id,
          ra.title,
          ra.ref_code,
          ra.version_number,
          ra.status,
          ra.template_type,
          ra.assessor_name,
          ra.assessment_date,
          ra.review_date,
          ra.next_review_date,
          ra.created_at,
          ra.updated_at,
          ra.created_by
        FROM risk_assessments ra
        WHERE ra.ref_code = p_ref_code
          AND ra.company_id = p_company_id
          AND ra.status != 'Archived'
        ORDER BY ra.version_number DESC
        LIMIT 1;
      END IF;
    END;
    $function$;

    -- Function to get all versions of an RA by ref_code
    CREATE OR REPLACE FUNCTION get_ra_versions(p_ref_code TEXT, p_company_id UUID)
    RETURNS TABLE (
      id UUID,
      title TEXT,
      ref_code TEXT,
      version_number INTEGER,
      status TEXT,
      template_type TEXT,
      change_notes TEXT,
      assessment_date DATE,
      review_date DATE,
      next_review_date DATE,
      created_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ,
      created_by UUID,
      created_by_name TEXT
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $function$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'risk_assessments')
         AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        RETURN QUERY
        SELECT 
          ra.id,
          ra.title,
          ra.ref_code,
          ra.version_number,
          ra.status,
          ra.template_type,
          ra.change_notes,
          ra.assessment_date,
          ra.review_date,
          ra.next_review_date,
          ra.created_at,
          ra.updated_at,
          ra.created_by,
          p.full_name as created_by_name
        FROM risk_assessments ra
        LEFT JOIN profiles p ON ra.created_by = p.id
        WHERE ra.ref_code = p_ref_code
          AND ra.company_id = p_company_id
        ORDER BY ra.version_number DESC;
      END IF;
    END;
    $function$;

  ELSE
    RAISE NOTICE '⚠️ risk_assessments table does not exist yet - skipping version history columns addition';
  END IF;
END $$;

