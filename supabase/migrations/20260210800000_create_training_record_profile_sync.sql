-- =====================================================
-- SYNC training_records → profile cert fields
-- Keeps legacy profile fields up-to-date when
-- training_records are inserted or updated.
-- This ensures backward compatibility with EHO reports,
-- employee profile pages, and other profile-field consumers.
-- =====================================================

CREATE OR REPLACE FUNCTION sync_training_record_to_profile()
RETURNS TRIGGER AS $$
DECLARE
  v_course_code TEXT;
BEGIN
  -- Only sync completed records
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  -- Look up the course code
  SELECT code INTO v_course_code
  FROM training_courses
  WHERE id = NEW.course_id;

  IF v_course_code IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check that profile cert columns exist before trying to update
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'food_safety_level'
  ) THEN
    RETURN NEW;
  END IF;

  CASE UPPER(v_course_code)
    WHEN 'FS-L2' THEN
      UPDATE profiles SET
        food_safety_level = GREATEST(COALESCE(food_safety_level, 0), 2),
        food_safety_expiry_date = NEW.expiry_date
      WHERE id = NEW.profile_id;

    WHEN 'FS-L3' THEN
      UPDATE profiles SET
        food_safety_level = GREATEST(COALESCE(food_safety_level, 0), 3),
        food_safety_expiry_date = NEW.expiry_date
      WHERE id = NEW.profile_id;

    WHEN 'HS-L2' THEN
      UPDATE profiles SET
        h_and_s_level = GREATEST(COALESCE(h_and_s_level, 0), 2),
        h_and_s_expiry_date = NEW.expiry_date
      WHERE id = NEW.profile_id;

    WHEN 'FIRE' THEN
      UPDATE profiles SET
        fire_marshal_trained = true,
        fire_marshal_expiry_date = NEW.expiry_date
      WHERE id = NEW.profile_id;

    WHEN 'FAW' THEN
      UPDATE profiles SET
        first_aid_trained = true,
        first_aid_expiry_date = NEW.expiry_date
      WHERE id = NEW.profile_id;

    WHEN 'COSHH', 'ALLERGY' THEN
      UPDATE profiles SET
        cossh_trained = true,
        cossh_expiry_date = NEW.expiry_date
      WHERE id = NEW.profile_id;

    ELSE
      -- No profile field mapping for this course code
      NULL;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trigger_sync_training_to_profile ON training_records;

-- Create trigger on INSERT and UPDATE
CREATE TRIGGER trigger_sync_training_to_profile
  AFTER INSERT OR UPDATE ON training_records
  FOR EACH ROW
  EXECUTE FUNCTION sync_training_record_to_profile();
