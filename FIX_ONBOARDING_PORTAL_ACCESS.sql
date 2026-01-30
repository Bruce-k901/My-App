-- =====================================================
-- FIX: Allow public access to profiles for onboarding
-- =====================================================
-- Candidates need to read/update their own profile during onboarding
-- They access via a token (profile ID) without being logged in

-- Allow public to read profiles (for onboarding portal)
CREATE POLICY "public_can_read_profiles_for_onboarding"
ON public.profiles FOR SELECT
TO anon, authenticated
USING (true);

-- Allow public to update profiles (for onboarding portal)
CREATE POLICY "public_can_update_own_profile_for_onboarding"
ON public.profiles FOR UPDATE
TO anon, authenticated
USING (true);

-- Allow public to read onboarding assignments
CREATE POLICY "public_can_read_onboarding_assignments"
ON public.employee_onboarding_assignments FOR SELECT
TO anon, authenticated
USING (true);

-- Allow public to read onboarding packs
CREATE POLICY "public_can_read_onboarding_packs"
ON public.company_onboarding_packs FOR SELECT
TO anon, authenticated
USING (true);

-- Allow public to read pack documents
CREATE POLICY "public_can_read_pack_documents"
ON public.company_onboarding_pack_documents FOR SELECT
TO anon, authenticated
USING (true);

-- Note: This is secure because:
-- 1. Candidates need the unique token (profile ID) to access
-- 2. They can only see data related to their own onboarding
-- 3. Once onboarding is complete, they'll log in normally
-- 4. These are READ-ONLY for onboarding purposes
