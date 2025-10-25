-- Custom Access Token Hook - COMPLETELY DISABLED FOR ROLLBACK
-- This function has been removed to restore basic authentication functionality
-- The function was causing "output claims field is missing" errors

-- Drop the function to ensure it's not called
DROP FUNCTION IF EXISTS public.custom_access_token(jsonb);

-- Also revoke any existing permissions
DO $$
BEGIN
    -- Revoke permissions if function exists
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'custom_access_token') THEN
        REVOKE ALL ON FUNCTION public.custom_access_token(jsonb) FROM supabase_auth_admin;
        REVOKE ALL ON FUNCTION public.custom_access_token(jsonb) FROM postgres;
        REVOKE ALL ON FUNCTION public.custom_access_token(jsonb) FROM anon;
        REVOKE ALL ON FUNCTION public.custom_access_token(jsonb) FROM authenticated;
    END IF;
END $$;