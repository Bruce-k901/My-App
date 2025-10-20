-- Add address2 column to sites table if it doesn't exist
ALTER TABLE sites 
ADD COLUMN IF NOT EXISTS address2 TEXT;