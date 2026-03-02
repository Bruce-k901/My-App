-- =====================================================
-- FIX: Training → Profile sync trigger course code mapping
--
-- The trigger only recognised legacy codes (FIRE, FAW, COSHH, ALLERGY)
-- but the e-learning courses use new codes (FS2-L2, FA-L2, COSHH-L2,
-- ALG-L2, ALG-ADV). This update adds the new codes so profile
-- legacy fields are updated on course completion.
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
    -- Food Safety
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

    -- Health & Safety
    WHEN 'HS-L2' THEN
      UPDATE profiles SET
        h_and_s_level = GREATEST(COALESCE(h_and_s_level, 0), 2),
        h_and_s_expiry_date = NEW.expiry_date
      WHERE id = NEW.profile_id;

    WHEN 'HS-L3' THEN
      UPDATE profiles SET
        h_and_s_level = GREATEST(COALESCE(h_and_s_level, 0), 3),
        h_and_s_expiry_date = NEW.expiry_date
      WHERE id = NEW.profile_id;

    -- Fire Safety (legacy FIRE + new FS2-L2)
    WHEN 'FIRE', 'FS2-L2' THEN
      UPDATE profiles SET
        fire_marshal_trained = true,
        fire_marshal_expiry_date = NEW.expiry_date
      WHERE id = NEW.profile_id;

    -- First Aid (legacy FAW + new FA-L2)
    WHEN 'FAW', 'FA-L2' THEN
      UPDATE profiles SET
        first_aid_trained = true,
        first_aid_expiry_date = NEW.expiry_date
      WHERE id = NEW.profile_id;

    -- COSHH & Allergens (legacy COSHH/ALLERGY + new codes)
    WHEN 'COSHH', 'COSHH-L2', 'ALLERGY', 'ALG-L2', 'ALG-ADV' THEN
      UPDATE profiles SET
        cossh_trained = true,
        cossh_expiry_date = NEW.expiry_date
      WHERE id = NEW.profile_id;

    ELSE
      -- No profile field mapping for this course code
      -- (MH-L2, HACCP-L3, SG-L2 etc. have no legacy profile fields)
      NULL;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
