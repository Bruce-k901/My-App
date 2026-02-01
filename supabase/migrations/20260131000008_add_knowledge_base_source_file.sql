-- Add source_file column to knowledge_base for code-sync tracking
-- This column stores the relative file path where the @ai-knowledge block was found

ALTER TABLE knowledge_base
ADD COLUMN IF NOT EXISTS source_file TEXT;

-- Add an index for faster lookups by source
CREATE INDEX IF NOT EXISTS idx_knowledge_base_source ON knowledge_base(source);

-- Add a comment explaining the source field convention
COMMENT ON COLUMN knowledge_base.source IS 'Source of the entry: "manual" for admin-created, "code-sync:path::title" for auto-synced from code';
COMMENT ON COLUMN knowledge_base.source_file IS 'Relative file path for code-synced entries';
