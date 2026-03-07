-- Fix review_responses table constraints and column references
-- This migration ensures the table has the correct schema and no references to old column names

DO $$
DECLARE
  constraint_rec RECORD;
BEGIN
  -- Check if review_responses table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_responses') THEN
    
    -- Drop any old unique constraints that might reference wrong columns
    -- Check for constraint with 'responded_by' (old column name)
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'review_responses' 
      AND constraint_type = 'UNIQUE'
      AND constraint_name LIKE '%responded_by%'
    ) THEN
      ALTER TABLE review_responses DROP CONSTRAINT IF EXISTS review_responses_review_id_question_id_responded_by_key;
      ALTER TABLE review_responses DROP CONSTRAINT IF EXISTS review_responses_pkey;
      -- Recreate primary key if needed
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'review_responses' 
        AND constraint_type = 'PRIMARY KEY'
      ) THEN
        ALTER TABLE review_responses ADD PRIMARY KEY (id);
      END IF;
    END IF;

    -- Ensure we have the correct columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'review_responses' AND column_name = 'respondent_type') THEN
      ALTER TABLE review_responses ADD COLUMN respondent_type VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'review_responses' AND column_name = 'respondent_id') THEN
      ALTER TABLE review_responses ADD COLUMN respondent_id UUID REFERENCES profiles(id);
    END IF;

    -- Drop old 'responded_by' column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'review_responses' AND column_name = 'responded_by') THEN
      ALTER TABLE review_responses DROP COLUMN responded_by;
    END IF;

    -- Drop old 'respondent' column if it exists (shouldn't, but just in case)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'review_responses' AND column_name = 'respondent') THEN
      ALTER TABLE review_responses DROP COLUMN respondent;
    END IF;

    -- Drop any conflicting unique constraints first (except the one we want)
    FOR constraint_rec IN 
      SELECT conname 
      FROM pg_constraint 
      WHERE conrelid = 'review_responses'::regclass 
      AND contype = 'u'
      AND conname != 'review_responses_review_id_question_id_respondent_type_respondent_id_key'
    LOOP
      EXECUTE 'ALTER TABLE review_responses DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_rec.conname);
    END LOOP;
    
    -- Ensure the correct unique constraint exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'review_responses' 
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'review_responses_review_id_question_id_respondent_type_respondent_id_key'
    ) THEN
      -- Create the correct unique constraint
      CREATE UNIQUE INDEX IF NOT EXISTS review_responses_review_id_question_id_respondent_type_respondent_id_key
        ON review_responses(review_id, question_id, respondent_type, respondent_id);
    END IF;

    -- Add NOT NULL constraint to respondent_type if it doesn't exist
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'review_responses' 
      AND column_name = 'respondent_type' 
      AND is_nullable = 'YES'
    ) THEN
      -- First, set any NULL values to a default
      UPDATE review_responses SET respondent_type = 'employee' WHERE respondent_type IS NULL;
      ALTER TABLE review_responses ALTER COLUMN respondent_type SET NOT NULL;
    END IF;

    RAISE NOTICE 'Fixed review_responses table constraints and columns';
  END IF;
END $$;

