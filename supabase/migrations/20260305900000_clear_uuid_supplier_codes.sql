-- Clear supplier codes that are Edify UUIDs leaked during import.
-- The code field should be a short human-readable identifier, not a UUID.
UPDATE stockly.suppliers
SET code = NULL,
    updated_at = NOW()
WHERE code ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
