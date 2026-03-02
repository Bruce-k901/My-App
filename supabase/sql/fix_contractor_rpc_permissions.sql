-- Fix permissions for contractor RPC functions to ensure they bypass RLS
-- This ensures SECURITY DEFINER functions can write to contractors table

-- Grant table permissions to postgres role (function owner)
-- This allows SECURITY DEFINER functions to bypass RLS
GRANT ALL ON public.contractors TO postgres;
GRANT ALL ON public.contractors TO service_role;

-- Ensure functions are owned by postgres (which has superuser privileges)
-- This allows them to bypass RLS completely
DO $$
BEGIN
  -- Change ownership if functions exist
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'insert_contractor_simple') THEN
    ALTER FUNCTION public.insert_contractor_simple OWNER TO postgres;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_contractor_simple') THEN
    ALTER FUNCTION public.update_contractor_simple OWNER TO postgres;
  END IF;
END $$;

-- Verify RLS is enabled (it should be, but check)
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;

-- Note: SECURITY DEFINER functions run with the privileges of the function owner (postgres)
-- Postgres role has superuser privileges, so RLS policies are bypassed
-- This is the correct approach for administrative functions

