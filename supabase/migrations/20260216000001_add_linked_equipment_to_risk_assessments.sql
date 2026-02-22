-- Add linked_equipment column to risk_assessments
-- Matches existing linked_sops, linked_ppe, linked_chemicals pattern
ALTER TABLE risk_assessments
ADD COLUMN IF NOT EXISTS linked_equipment uuid[] DEFAULT '{}';
