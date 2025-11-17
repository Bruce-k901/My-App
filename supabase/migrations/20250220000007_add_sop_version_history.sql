-- Add version history support to sop_entries
-- This allows tracking changes, who made them, and when

BEGIN;

-- Add parent_id to link versions together (null for original, UUID for versions)
ALTER TABLE sop_entries 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES sop_entries(id) ON DELETE SET NULL;

-- Add version_number as integer for easier sorting (1, 2, 3, etc.)
ALTER TABLE sop_entries 
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;

-- Add change_notes to track what changed in this version
ALTER TABLE sop_entries 
ADD COLUMN IF NOT EXISTS change_notes TEXT;

-- Create index for parent_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_sop_entries_parent_id ON sop_entries(parent_id);

-- Create index for ref_code and version_number for version queries
CREATE INDEX IF NOT EXISTS idx_sop_entries_ref_code_version ON sop_entries(ref_code, version_number);

-- Function to get the latest version of an SOP by ref_code
CREATE OR REPLACE FUNCTION get_latest_sop_version(p_ref_code TEXT, p_company_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  ref_code TEXT,
  version TEXT,
  version_number INTEGER,
  status TEXT,
  author TEXT,
  category TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    se.id,
    se.title,
    se.ref_code,
    se.version,
    se.version_number,
    se.status,
    se.author,
    se.category,
    se.created_at,
    se.updated_at,
    se.created_by,
    se.updated_by
  FROM sop_entries se
  WHERE se.ref_code = p_ref_code
    AND se.company_id = p_company_id
    AND se.status != 'Archived'
  ORDER BY se.version_number DESC
  LIMIT 1;
END;
$$;

-- Function to get all versions of an SOP by ref_code
CREATE OR REPLACE FUNCTION get_sop_versions(p_ref_code TEXT, p_company_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  ref_code TEXT,
  version TEXT,
  version_number INTEGER,
  status TEXT,
  author TEXT,
  category TEXT,
  change_notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  updated_by_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    se.id,
    se.title,
    se.ref_code,
    se.version,
    se.version_number,
    se.status,
    se.author,
    se.category,
    se.change_notes,
    se.created_at,
    se.updated_at,
    se.created_by,
    se.updated_by,
    p.full_name as updated_by_name
  FROM sop_entries se
  LEFT JOIN profiles p ON se.updated_by = p.id
  WHERE se.ref_code = p_ref_code
    AND se.company_id = p_company_id
  ORDER BY se.version_number DESC;
END;
$$;

COMMIT;

