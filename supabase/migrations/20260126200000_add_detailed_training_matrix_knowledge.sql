-- ============================================================================
-- Migration: Add Detailed Training Matrix Knowledge
-- Description: Adds more specific information about training matrix management
--              to prevent AI hallucinations about non-existent features
-- ============================================================================

BEGIN;

-- Add detailed training matrix entry
INSERT INTO public.knowledge_base (title, content, summary, category, subcategory, tags, source) VALUES
('How to Update Training Matrix in Teamly',
$$The training matrix shows all employees' training status and certifications.

VIEWING THE MATRIX:
- Go to Teamly → Training
- Click on "Training Matrix" or "Matrix" tab
- View all employees and their training records
- See which courses are completed, expired, or missing

UPDATING TRAINING RECORDS:
To update an employee's training:
1. Go to Teamly → Training
2. Find the employee in the matrix or list
3. Click on their name or the ⋮ menu
4. Select "Edit Training" or "Add Training Record"
5. Add new training completion:
   - Select the course
   - Enter completion date
   - Set expiry date (if applicable)
   - Upload certificate (optional)
6. Save the record

MANAGING EXPIRY DATES:
- The matrix automatically highlights expiring certifications
- You can update expiry dates by editing the training record
- Set renewal reminders in the course settings

IMPORTANT NOTES:
- The training matrix is a VIEW of training records - you update it by adding/editing training records
- There is no separate "Punctuality" or "Timekeeping" training course type - courses are created by admins
- Employee performance issues (like lateness) are NOT managed through the training matrix
- For HR issues like lateness, use the appropriate HR features or contact support

TRAINING GAPS:
- The matrix shows which mandatory training is missing
- Red/yellow indicators show compliance status
- Click on gaps to book required training$$,
'How to view and update the training matrix, add training records, and manage certifications.',
'app_help', 'teamly',
ARRAY['teamly', 'training', 'matrix', 'update', 'edit', 'training records', 'certifications', 'how to update matrix'],
'Teamly Documentation')
ON CONFLICT DO NOTHING;

-- Add entry about what the training matrix does NOT do
INSERT INTO public.knowledge_base (title, content, summary, category, subcategory, tags, source) VALUES
('Training Matrix Limitations - What It Does Not Do',
$$The training matrix is specifically for tracking training courses and certifications.

WHAT THE TRAINING MATRIX DOES:
- Shows employee training course completions
- Tracks certification expiry dates
- Highlights mandatory training gaps
- Displays compliance status

WHAT THE TRAINING MATRIX DOES NOT DO:
- It does NOT track employee performance issues (like lateness, attendance problems)
- It does NOT have "Punctuality" or "Timekeeping" courses (these are not standard course types)
- It does NOT manage disciplinary actions
- It does NOT have an "org chart view" - it's a training status matrix
- It does NOT track employee files or HR records beyond training

FOR EMPLOYEE PERFORMANCE ISSUES:
- Use the appropriate HR/management features in Teamly
- Contact support for guidance on handling specific employee issues
- The training matrix is only for training and certification tracking$$,
'Clarifies what the training matrix is for and what it does not do - prevents confusion about its purpose.',
'app_help', 'teamly',
ARRAY['teamly', 'training', 'matrix', 'limitations', 'what it does not do', 'performance', 'hr'],
'Teamly Documentation')
ON CONFLICT DO NOTHING;

-- Update search vectors for new entries
UPDATE public.knowledge_base
SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(content, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(summary, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(array_to_string(tags, ' '), '')), 'D')
WHERE search_vector IS NULL OR id IN (
  SELECT id FROM public.knowledge_base 
  WHERE title LIKE '%Training Matrix%' OR title LIKE '%Limitations%'
);

COMMIT;
