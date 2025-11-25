-- STEP 2: Quick fix - just reload schema cache
-- Run this AFTER killing connections

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- This should be enough if the tables already have the right structure
