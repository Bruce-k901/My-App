-- ============================================================================
-- Migration: 20260228950000_insert_employee_document_rpc.sql
-- Description: RPC function for inserting employee documents.
--              Bypasses PostgREST schema cache issues by using raw SQL.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.insert_employee_document(
  p_company_id UUID,
  p_profile_id UUID,
  p_document_type TEXT,
  p_title TEXT,
  p_file_path TEXT,
  p_mime_type TEXT DEFAULT NULL,
  p_file_size BIGINT DEFAULT NULL,
  p_expires_at DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_uploaded_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.employee_documents (
    company_id, profile_id, document_type, title,
    file_path, mime_type, file_size,
    expires_at, notes, uploaded_by
  ) VALUES (
    p_company_id, p_profile_id, p_document_type, p_title,
    p_file_path, p_mime_type, p_file_size,
    p_expires_at, p_notes, p_uploaded_by
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Also force PostgREST to reload so future .from() calls work
NOTIFY pgrst, 'reload schema';
