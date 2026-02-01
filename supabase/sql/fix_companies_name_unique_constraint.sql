-- Fix companies name unique constraint
-- Allow multiple companies with the same name (different users can have companies with same name)
-- The unique constraint uq_companies_name is too restrictive

-- Drop the unique constraint if it exists
ALTER TABLE public.companies 
DROP CONSTRAINT IF EXISTS uq_companies_name;

-- If we want to ensure uniqueness per user, create a composite unique constraint instead
-- But for now, just remove it to allow multiple companies with same name
-- Users can have multiple companies with the same name if needed

-- Seed a test company (for local/dev use)
-- Safe because we just removed the global unique constraint on name
INSERT INTO public.companies (name)
VALUES ('Checkly Test Co')
ON CONFLICT DO NOTHING;

