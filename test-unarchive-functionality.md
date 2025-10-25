# Test Unarchive Functionality

## Manual Testing Steps

### 1. Archive an Asset
1. Go to `/dashboard/assets`
2. Find any asset and click the orange archive button (trash icon)
3. Confirm the archive action
4. Verify the asset disappears from the main assets page
5. Check browser console for: `"Archiving asset: [asset-id]"`
6. Check console for: `"Archive update result: { data: [...], error: null }"`

### 2. Verify Asset Appears in Archived Assets
1. Navigate to `/dashboard/archived-assets`
2. Verify the archived asset appears in the list
3. Check that the "Archived" date is displayed
4. Verify the green unarchive button (RotateCcw icon) is visible

### 3. Test Unarchive Functionality
1. Click the green unarchive button (RotateCcw icon)
2. Verify the confirmation modal appears with:
   - Title: "Restore Asset?"
   - Message: "This asset and its full history will be moved back to the Active Assets list. Continue?"
   - Asset details showing name and archived date
   - Cancel button (grey)
   - Restore button (green)
3. Click "Restore"
4. Check browser console for: `"Unarchiving asset: [asset-id]"`
5. Check console for: `"Unarchive update result: { data: [...], error: null }"`
6. Verify success toast: "Asset restored - Asset has been moved back to active assets"
7. Verify the asset disappears from the archived assets page

### 4. Verify Asset Returns to Active Assets
1. Navigate back to `/dashboard/assets`
2. Verify the unarchived asset appears in the main assets list
3. Verify all asset data is intact (name, model, serial, contractors, etc.)
4. Verify the asset shows as active (not archived)

## Database Verification

Run this SQL in your Supabase SQL editor to verify the database state:

```sql
-- Check archived assets
SELECT id, name, archived, archived_at, updated_at 
FROM assets 
WHERE archived = true 
ORDER BY archived_at DESC;

-- Check active assets
SELECT id, name, archived, archived_at, updated_at 
FROM assets 
WHERE archived = false 
ORDER BY updated_at DESC;
```

## Expected Behavior

- ✅ Archive button works and moves asset to archived state
- ✅ Archived asset appears in archived assets page
- ✅ Unarchive button is visible and clickable
- ✅ Confirmation modal appears with correct information
- ✅ Unarchive process updates database correctly
- ✅ Asset returns to active assets page
- ✅ All asset data is preserved
- ✅ Toast notifications work correctly
- ✅ Console logging shows successful operations

## Troubleshooting

If unarchive doesn't work:
1. Check browser console for errors
2. Verify database permissions
3. Check network tab for failed requests
4. Verify the asset ID is correct
5. Ensure the user has proper permissions
