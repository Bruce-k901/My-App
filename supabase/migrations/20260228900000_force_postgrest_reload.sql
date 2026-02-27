-- Force PostgREST to reload its schema cache so new tables
-- (shift_patterns, rota_site_settings, etc.) appear via the REST API.
NOTIFY pgrst, 'reload schema';
