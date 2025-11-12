# Delete Old "Save & Deploy" Templates

## Problem

Templates created using the old compliance template components (with "Save & Deploy" functionality) were creating tasks directly when saved. This has been fixed, but old templates created with this method need to be deleted.

## Solution

Use one of the SQL scripts below to identify and delete old templates.

## Available Scripts

### 1. `QUICK-DELETE-old-templates.sql` (Recommended)

**Best for**: Quick deletion of all old templates

**Steps**:

1. Run the SELECT query first to see what will be deleted
2. Review the results
3. Uncomment the DELETE statements
4. Run the DELETE statements
5. Run the verification query to confirm deletion

### 2. `SAFE-delete-old-templates-by-company.sql`

**Best for**: Deleting templates for a specific company only

**Steps**:

1. Replace `'YOUR_COMPANY_ID'` with your actual company_id UUID
2. Run the SELECT query to review
3. Uncomment the DELETE statements
4. Run the DELETE statements

### 3. `delete-old-save-deploy-templates.sql`

**Best for**: Comprehensive analysis and deletion

**Steps**:

1. Run all SELECT queries to see what will be affected
2. Review the counts
3. Uncomment the DELETE statements
4. Run the DELETE statements

## Templates That Will Be Deleted

The scripts identify templates by:

### Slug Patterns:

- `fire-alarm-test-*`
- `hot-holding-temps-*`
- `probe-calibration-*`
- `pat-compliance-verify-*`
- `emergency-lighting-test-*`
- `extraction-service-*`
- `sfbb-temperature-checks-*`
- All draft versions (with `-draft-` in slug)

### Name Patterns:

- "Test fire alarms"
- "Verify hot holding"
- "Calibrate temperature probes"
- "Verify PAT Test"
- "Test emergency lighting"
- "SFBB Temperature Checks"
- "Extraction Service"

### Characteristics:

- `is_template_library = true`
- Category: `h_and_s`, `food_safety`, `fire_safety`, `health_and_safety`
- Specific asset types or repeatable field names

## Important Notes

1. **Tasks are NOT deleted** - Only templates and their fields are deleted. Tasks created from these templates will remain but will have `template_id` pointing to a non-existent template.

2. **Review before deleting** - Always run the SELECT queries first to see what will be deleted.

3. **Backup recommended** - Consider backing up your database before running deletions.

4. **Recreate templates** - After deletion, recreate templates using the new method (via Templates/Compliance pages).

## After Deletion

1. Verify deletion was successful (use verification queries)
2. Recreate templates using the new method:
   - Go to Templates or Compliance pages
   - Create templates using the template builder
   - Tasks will be created via `TaskFromTemplateModal` or automated generation

## Questions?

If you're unsure about which templates to delete, run the SELECT queries first and review the results. The scripts are designed to be safe - they require you to uncomment DELETE statements before executing.
