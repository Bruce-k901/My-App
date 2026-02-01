-- =====================================================
-- UPDATE TRAINING COURSES TABLE
-- Add content_path column and update pass_mark_percentage
-- =====================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if training_courses table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_courses') THEN

    -- Add content_path column to link database course to content files
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'training_courses' 
      AND column_name = 'content_path'
    ) THEN
      ALTER TABLE training_courses 
      ADD COLUMN content_path TEXT;
      
      COMMENT ON COLUMN training_courses.content_path IS 'Path to course content files (e.g., uk-l2-food-hygiene, level2-allergens)';
    END IF;

    -- Update existing courses with content_path
    UPDATE training_courses 
    SET content_path = 'uk-l2-food-hygiene' 
    WHERE code = 'FS-L2' AND content_path IS NULL;

    UPDATE training_courses 
    SET content_path = 'level2-allergens' 
    WHERE code = 'ALLERGY' AND content_path IS NULL;

    UPDATE training_courses 
    SET content_path = 'level2-health-and-safety' 
    WHERE code = 'HS-L2' AND content_path IS NULL;

    -- Ensure pass_mark_percentage is set to 80 for built-in courses
    UPDATE training_courses 
    SET pass_mark_percentage = 80 
    WHERE code IN ('FS-L2', 'ALLERGY', 'HS-L2') 
    AND (pass_mark_percentage IS NULL OR pass_mark_percentage != 80);

    RAISE NOTICE 'Updated training_courses table: added content_path column and set pass_mark_percentage to 80 for built-in courses';

  ELSE
    RAISE NOTICE '⚠️ training_courses table does not exist yet - skipping update';
  END IF;
END $$;
