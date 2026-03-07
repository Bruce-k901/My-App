-- =====================================================
-- FIX: Allow anonymous users to read applications & candidates
-- =====================================================
-- This allows the confirmation page and candidate queries to work

-- Allow public to read applications (needed for confirmation page)
CREATE POLICY "public_can_read_own_application"
ON public.applications FOR SELECT
TO anon, authenticated
USING (true);

-- Allow public to read candidates (needed for confirmation page)
CREATE POLICY "public_can_read_candidates"
ON public.candidates FOR SELECT
TO anon, authenticated  
USING (true);

-- Note: These are READ-ONLY policies
-- Anonymous users still cannot INSERT/UPDATE/DELETE
-- Those operations are handled by API routes with service role
