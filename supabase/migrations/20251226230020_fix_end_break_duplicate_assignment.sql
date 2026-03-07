-- Fix end_break function: remove duplicate break_end assignment
-- The function was trying to set break_end = now() and then break_end = NULL
-- in the same UPDATE statement, which causes "multiple assignments to same column" error

CREATE OR REPLACE FUNCTION end_break(p_profile_id UUID)
RETURNS BOOLEAN AS $function$
DECLARE
  v_break_minutes INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'time_entries') THEN
    RETURN false;
  END IF;

  -- Calculate break duration and add to total, then clear break_start
  -- Note: We don't need to set break_end = now() first since we calculate
  -- the duration directly from break_start using now()
  UPDATE time_entries SET
    total_break_minutes = total_break_minutes + 
      EXTRACT(EPOCH FROM (now() - break_start))::INTEGER / 60,
    break_start = NULL,
    break_end = NULL,
    updated_at = now()
  WHERE profile_id = p_profile_id 
    AND status = 'active'
    AND break_start IS NOT NULL;
  
  RETURN FOUND;
END;
$function$ LANGUAGE plpgsql;

