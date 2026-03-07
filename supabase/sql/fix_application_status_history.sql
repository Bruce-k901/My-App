-- Fix update_application_status function to properly append to array
-- The function should append history entries to an array, not merge objects

CREATE OR REPLACE FUNCTION update_application_status(
  p_application_id UUID,
  p_new_status TEXT,
  p_changed_by UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_current_status TEXT;
  v_status_history JSONB;
  v_new_history_entry JSONB;
BEGIN
  -- Get current status and history
  SELECT status, COALESCE(status_history, '[]'::jsonb) INTO v_current_status, v_status_history
  FROM public.applications
  WHERE id = p_application_id;
  
  -- Don't update if status is the same
  IF v_current_status = p_new_status THEN
    RETURN;
  END IF;
  
  -- Create new history entry
  v_new_history_entry := jsonb_build_object(
    'status', p_new_status,
    'from_status', v_current_status,
    'changed_at', now(),
    'changed_by', p_changed_by,
    'notes', COALESCE(p_notes, '')
  );
  
  -- Append to history array (ensure it's an array)
  IF jsonb_typeof(v_status_history) != 'array' THEN
    v_status_history := '[]'::jsonb;
  END IF;
  
  v_status_history := v_status_history || jsonb_build_array(v_new_history_entry);
  
  -- Update application
  UPDATE public.applications
  SET 
    status = p_new_status,
    status_history = v_status_history,
    updated_at = now(),
    updated_by = p_changed_by
  WHERE id = p_application_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
