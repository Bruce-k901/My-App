-- ============================================================================
-- MIGRATION: CREATE KNOWLEDGE BASE TABLE FOR AI ASSISTANT
-- ============================================================================
-- Description: Creates a knowledge_base table to store documentation for
--              the AI Assistant chatbot, including compliance regulations,
--              app help, SOP guidance, and troubleshooting information.
-- ============================================================================

-- Create knowledge_base table
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  tags TEXT[] DEFAULT '{}',
  source TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Full-text search vector (will be populated by trigger)
  search_vector TSVECTOR
);

-- Create index for category lookups
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category 
  ON public.knowledge_base(category) 
  WHERE is_active = true;

-- Create index for tags (GIN index for array searches)
CREATE INDEX IF NOT EXISTS idx_knowledge_base_tags 
  ON public.knowledge_base USING GIN(tags) 
  WHERE is_active = true;

-- Create full-text search index
CREATE INDEX IF NOT EXISTS idx_knowledge_base_search_vector 
  ON public.knowledge_base USING GIN(search_vector) 
  WHERE is_active = true;

-- Create function to update search_vector
CREATE OR REPLACE FUNCTION public.update_knowledge_base_search_vector()
RETURNS TRIGGER AS $function$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'D');
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$function$ LANGUAGE plpgsql;

-- Create trigger to automatically update search_vector
DROP TRIGGER IF EXISTS trigger_update_knowledge_base_search_vector ON public.knowledge_base;
CREATE TRIGGER trigger_update_knowledge_base_search_vector
  BEFORE INSERT OR UPDATE ON public.knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION public.update_knowledge_base_search_vector();

-- Update existing rows to populate search_vector
UPDATE public.knowledge_base 
SET search_vector = 
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(content, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(summary, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(array_to_string(tags, ' '), '')), 'D')
WHERE search_vector IS NULL;

-- Enable RLS (Row Level Security)
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can read active knowledge base entries
CREATE POLICY "Allow authenticated users to read active knowledge base"
  ON public.knowledge_base
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Policy: Only service role can insert/update/delete (managed via migrations/seeds)
CREATE POLICY "Only service role can modify knowledge base"
  ON public.knowledge_base
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.knowledge_base IS 'Knowledge base for AI Assistant - stores compliance regulations, app help, SOP guidance, and troubleshooting information';


