-- SAFE: Just reload the schema cache
-- No dropping tables, no killing connections, no dangerous operations

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- That's it! This is completely safe.
