-- Add is_archived field to global_documents table
-- This allows documents to be archived instead of deleted

-- Add is_archived column if it doesn't exist
ALTER TABLE public.global_documents
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_global_documents_is_archived 
ON public.global_documents(company_id, is_archived);

-- Update existing documents to be non-archived (default)
UPDATE public.global_documents
SET is_archived = false
WHERE is_archived IS NULL;

