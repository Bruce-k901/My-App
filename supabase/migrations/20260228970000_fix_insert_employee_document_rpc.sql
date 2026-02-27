-- ============================================================================
-- Fix RPC: add file_name parameter (NOT NULL column in employee_documents)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.insert_employee_document(
  p_company_id UUID,
  p_profile_id UUID,
  p_document_type TEXT,
  p_title TEXT,
  p_file_path TEXT,
  p_file_name TEXT DEFAULT NULL,
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
  v_has_file_name BOOLEAN;
BEGIN
  -- Check if file_name column exists (table schema varies between deployments)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employee_documents' AND column_name = 'file_name'
  ) INTO v_has_file_name;

  IF v_has_file_name THEN
    INSERT INTO public.employee_documents (
      company_id, profile_id, document_type, title,
      file_path, file_name, mime_type, file_size,
      expires_at, notes, uploaded_by
    ) VALUES (
      p_company_id, p_profile_id, p_document_type, p_title,
      p_file_path, COALESCE(p_file_name, p_title), p_mime_type, p_file_size,
      p_expires_at, p_notes, p_uploaded_by
    )
    RETURNING id INTO v_id;
  ELSE
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
  END IF;

  RETURN v_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
