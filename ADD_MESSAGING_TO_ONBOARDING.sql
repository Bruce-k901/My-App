-- ============================================================================
-- FUNCTION: Add user to default messaging channel when profile is created
-- This ensures all users have messaging access from the start
-- ============================================================================

-- Create function to add user to default company channel
CREATE OR REPLACE FUNCTION public.add_user_to_default_messaging_channel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_channel_id UUID;
BEGIN
  -- Only proceed if user has a company_id
  IF NEW.company_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Find or create default company-wide channel
  SELECT id INTO default_channel_id
  FROM public.messaging_channels
  WHERE company_id = NEW.company_id
    AND channel_type = 'site'
    AND is_auto_created = true
  LIMIT 1;
  
  -- If no default channel exists, create one
  IF default_channel_id IS NULL THEN
    DECLARE
      auth_user_id UUID;
      constraint_refs_users BOOLEAN;
    BEGIN
      -- Check what the constraint actually references
      SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu 
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'messaging_channels'
          AND tc.constraint_name = 'messaging_channels_created_by_fkey'
          AND ccu.table_schema = 'auth'
          AND ccu.table_name = 'users'
      ) INTO constraint_refs_users;
      
      -- If constraint references auth.users, find matching auth user
      IF constraint_refs_users THEN
        SELECT id INTO auth_user_id
        FROM auth.users
        WHERE id = NEW.id
        LIMIT 1;
        
        -- If no matching auth user, try to find any admin in the company
        IF auth_user_id IS NULL THEN
          SELECT au.id INTO auth_user_id
          FROM public.profiles p
          JOIN auth.users au ON au.id = p.id
          WHERE p.company_id = NEW.company_id
            AND p.app_role IN ('Admin', 'Owner')
          LIMIT 1;
        END IF;
      ELSE
        -- Constraint references profiles, use profile id directly
        auth_user_id := NEW.id;
      END IF;
      
      -- Only create channel if we have a valid user
      IF auth_user_id IS NOT NULL THEN
        INSERT INTO public.messaging_channels (
          company_id,
          channel_type,
          name,
          description,
          created_by,
          is_auto_created
        )
        VALUES (
          NEW.company_id,
          'site',
          'General',
          'Company-wide messaging channel',
          auth_user_id,
          true
        )
        RETURNING id INTO default_channel_id;
      END IF;
    END;
  END IF;
  
  -- Add user as member (reactivate if previously left)
  INSERT INTO public.messaging_channel_members (
    channel_id,
    profile_id,
    member_role
  )
  VALUES (
    default_channel_id,
    NEW.id,
    CASE
      WHEN NEW.app_role IN ('Admin', 'Owner') THEN 'admin'
      ELSE 'member'
    END
  )
  ON CONFLICT (channel_id, profile_id) DO UPDATE SET left_at = NULL;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run when profile is created/updated with company_id
DROP TRIGGER IF EXISTS on_profile_company_set ON public.profiles;
CREATE TRIGGER on_profile_company_set
  AFTER INSERT OR UPDATE OF company_id ON public.profiles
  FOR EACH ROW
  WHEN (NEW.company_id IS NOT NULL)
  EXECUTE FUNCTION public.add_user_to_default_messaging_channel();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.add_user_to_default_messaging_channel() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.add_user_to_default_messaging_channel() IS 
'Automatically adds users to default messaging channel when they are assigned to a company';
