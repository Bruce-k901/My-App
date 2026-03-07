-- Rename the "Okja (for adding deliveries)" dummy supplier
-- to its actual name. This was a workaround name from Edify —
-- the supplier is Okja South Africa (imports).
UPDATE stockly.suppliers
SET name = 'Okja South Africa',
    updated_at = NOW()
WHERE name = 'Okja (for adding deliveries)'
  AND is_active = true;
