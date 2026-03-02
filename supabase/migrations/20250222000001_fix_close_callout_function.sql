-- Fix close_callout function to use app_role instead of role
-- The profiles table uses app_role, not role
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if profiles and callouts tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'callouts') THEN

    CREATE OR REPLACE FUNCTION close_callout(
      p_callout_id UUID,
      p_repair_summary TEXT,
      p_documents JSONB DEFAULT '[]'::jsonb
    )
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $function$
    DECLARE
      v_user_role TEXT;
      v_company_id UUID;
    BEGIN
      -- Get current user role and company
      -- Use app_role (the correct column name in profiles table)
      SELECT p_user.app_role::TEXT, p_user.company_id INTO v_user_role, v_company_id
      FROM public.profiles p_user
      WHERE p_user.id = auth.uid();
      
      IF v_user_role IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
      END IF;
      
      -- Check if user is manager/admin/owner (case-insensitive check)
      -- Note: app_role values are capitalized (Admin, Manager, Staff, Owner)
      IF LOWER(v_user_role) NOT IN ('manager', 'admin', 'owner') THEN
        RAISE EXCEPTION 'Only managers and admins can close callouts';
      END IF;
      
      -- Update the callout
      UPDATE public.callouts 
      SET 
        status = 'closed',
        repair_summary = p_repair_summary,
        documents = COALESCE(p_documents, '[]'::jsonb),
        closed_at = NOW(),
        updated_at = NOW()
      WHERE 
        id = p_callout_id 
        AND company_id = v_company_id
        AND status = 'open';
      
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Callout not found or already closed';
      END IF;
      
      RETURN TRUE;
    END;
    $function$;

    RAISE NOTICE 'Updated close_callout function to use app_role';

  ELSE
    RAISE NOTICE '⚠️ Required tables (profiles, callouts) do not exist yet - skipping function update';
  END IF;
END $$;

