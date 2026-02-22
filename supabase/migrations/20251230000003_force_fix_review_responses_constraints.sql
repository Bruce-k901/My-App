-- Force fix review_responses: Drop ALL constraints and indexes, then recreate correctly
-- This is more aggressive but ensures no old references remain

DO $$
DECLARE
  constraint_rec RECORD;
  index_rec RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_responses') THEN
    
    -- Drop ALL unique constraints (except primary key)
    FOR constraint_rec IN 
      SELECT conname, contype
      FROM pg_constraint 
      WHERE conrelid = 'review_responses'::regclass 
      AND contype IN ('u', 'f')  -- unique and foreign key
    LOOP
      EXECUTE 'ALTER TABLE review_responses DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_rec.conname);
      RAISE NOTICE 'Dropped constraint: %', constraint_rec.conname;
    END LOOP;
    
    -- Drop ALL indexes (except primary key index)
    FOR index_rec IN 
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'review_responses'
      AND indexname NOT LIKE '%_pkey'
    LOOP
      EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(index_rec.indexname);
      RAISE NOTICE 'Dropped index: %', index_rec.indexname;
    END LOOP;
    
    -- Ensure columns exist with correct types
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'review_responses' AND column_name = 'respondent_type') THEN
      ALTER TABLE review_responses ADD COLUMN respondent_type VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'review_responses' AND column_name = 'respondent_id') THEN
      ALTER TABLE review_responses ADD COLUMN respondent_id UUID;
    END IF;
    
    -- Set default values for any NULLs
    UPDATE review_responses SET respondent_type = 'employee' WHERE respondent_type IS NULL;
    UPDATE review_responses SET respondent_id = (SELECT id FROM profiles WHERE id = auth.uid() LIMIT 1) WHERE respondent_id IS NULL;
    
    -- Make respondent_type NOT NULL
    ALTER TABLE review_responses ALTER COLUMN respondent_type SET NOT NULL;
    
    -- Add foreign key for respondent_id if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_name = 'review_responses' 
      AND constraint_name LIKE '%respondent_id%'
    ) THEN
      ALTER TABLE review_responses 
      ADD CONSTRAINT review_responses_respondent_id_fkey 
      FOREIGN KEY (respondent_id) REFERENCES profiles(id);
    END IF;
    
    -- Recreate the correct unique constraint
    CREATE UNIQUE INDEX IF NOT EXISTS review_responses_review_id_question_id_respondent_type_respondent_id_key
      ON review_responses(review_id, question_id, respondent_type, respondent_id);
    
    -- Recreate other necessary indexes
    CREATE INDEX IF NOT EXISTS idx_review_responses_review ON review_responses(review_id);
    CREATE INDEX IF NOT EXISTS idx_review_responses_question ON review_responses(question_id);
    CREATE INDEX IF NOT EXISTS idx_review_responses_respondent ON review_responses(respondent_id);
    
    RAISE NOTICE 'Successfully fixed all review_responses constraints and indexes';
  END IF;
END $$;


