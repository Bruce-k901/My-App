-- Create a security definer function to bypass RLS
-- This function will insert the channel with elevated privileges

CREATE OR REPLACE FUNCTION public.create_messaging_channel(
  p_channel_type TEXT,
  p_company_id UUID,
  p_name TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_channel_id UUID;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Insert the channel (bypasses RLS due to SECURITY DEFINER)
  INSERT INTO messaging_channels (
    channel_type,
    company_id,
    created_by,
    name,
    entity_id,
    entity_type
  )
  VALUES (
    p_channel_type,
    p_company_id,
    v_user_id,
    p_name,
    p_entity_id,
    p_entity_type
  )
  RETURNING id INTO v_channel_id;
  
  RETURN v_channel_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_messaging_channel(TEXT, UUID, TEXT, UUID, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.create_messaging_channel IS 
'Creates a messaging channel bypassing RLS. Use this if RLS policies are causing issues.';

