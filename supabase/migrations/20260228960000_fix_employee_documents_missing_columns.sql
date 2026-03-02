-- ============================================================================
-- Migration: 20260228960000_fix_employee_documents_missing_columns.sql
-- Description: Add any columns missing from employee_documents table.
--              The original CREATE TABLE IF NOT EXISTS was skipped because
--              the table already existed with fewer columns.
-- ============================================================================

ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS bucket_id TEXT NOT NULL DEFAULT 'employee-documents';
ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS expires_at DATE;
ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS notes TEXT;

-- Recreate indexes that may be missing
CREATE INDEX IF NOT EXISTS idx_employee_documents_deleted_at ON public.employee_documents(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_employee_documents_type ON public.employee_documents(document_type);

-- Force PostgREST to pick up the new columns
NOTIFY pgrst, 'reload schema';
