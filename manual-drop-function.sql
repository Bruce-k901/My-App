-- Manual drop of custom_access_token function
-- This should be executed directly in the database to remove the function

DROP FUNCTION IF EXISTS public.custom_access_token(jsonb);

-- Also drop any related grants or dependencies
REVOKE ALL ON FUNCTION public.custom_access_token(jsonb) FROM supabase_auth_admin;
REVOKE ALL ON FUNCTION public.custom_access_token(jsonb) FROM postgres;
REVOKE ALL ON FUNCTION public.custom_access_token(jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.custom_access_token(jsonb) FROM authenticated;

-- Verify the function is gone
SELECT routine_name, routine_schema 
FROM information_schema.routines 
WHERE routine_name = 'custom_access_token' 
AND routine_schema = 'public';