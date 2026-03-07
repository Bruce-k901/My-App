-- Backfill recipe codes that have the XXX fallback prefix
-- These were generated before the recipe name was set
-- Updates REC-XXX-NNN to REC-{first 3 letters of name}-NNN

UPDATE stockly.recipes
SET code = 'REC-' ||
  UPPER(RPAD(LEFT(REGEXP_REPLACE(name, '[^a-zA-Z]', '', 'g'), 3), 3, 'X')) ||
  '-' ||
  SUBSTRING(code FROM '\d+$')
WHERE code LIKE 'REC-XXX-%'
  AND name IS NOT NULL
  AND name != ''
  AND REGEXP_REPLACE(name, '[^a-zA-Z]', '', 'g') != '';
