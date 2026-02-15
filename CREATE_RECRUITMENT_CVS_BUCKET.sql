-- =====================================================
-- CREATE RECRUITMENT CVS STORAGE BUCKET
-- =====================================================
-- This creates a Supabase Storage bucket for candidate CVs

-- Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('recruitment_cvs', 'recruitment_cvs', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for recruitment_cvs bucket

-- Allow company managers to upload CVs during application process
CREATE POLICY "allow_service_role_upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'recruitment_cvs');

-- Allow company members to view CVs for their company's candidates
CREATE POLICY "company_members_can_view_cvs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'recruitment_cvs' 
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

-- Allow managers to delete CVs
CREATE POLICY "managers_can_delete_cvs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'recruitment_cvs' 
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM public.profiles 
    WHERE id = auth.uid() 
    AND app_role IN ('Admin', 'Owner', 'Manager', 'Area Manager', 'Ops Manager')
  )
);

-- Allow managers to update CVs (e.g., replace)
CREATE POLICY "managers_can_update_cvs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'recruitment_cvs' 
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM public.profiles 
    WHERE id = auth.uid() 
    AND app_role IN ('Admin', 'Owner', 'Manager', 'Area Manager', 'Ops Manager')
  )
);

-- =====================================================
-- NOTES
-- =====================================================
-- Folder structure: {company_id}/candidates/{candidate_id}/{filename.pdf}
-- Example: f99510bc-b290-47c6-8f12-282bea67bd91/candidates/abc123/john_smith_cv.pdf
--
-- The bucket is NOT public - only company members with proper access can view CVs
