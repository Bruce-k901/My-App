# 🔒 Temperature Warning System - LOCKED

## ⚠️ CRITICAL: DO NOT MODIFY WITHOUT TESTING

The temperature warning system has been **locked** with safeguards to prevent it from breaking when other features are modified.

## What's Protected

### 1. `loadAssetTempRanges()` Function

**Location:** `src/components/checklists/TaskCompletionModal.tsx` (lines 363-507)

**Safeguards:**

- ✅ Always loads ranges for template-linked assets
- ✅ Always loads ranges for selected assets from task_data
- ✅ Always loads ranges for assets in repeatable fields (legacy support)
- ✅ Logs all loaded ranges with `[TEMPERATURE SYSTEM]` prefix
- ✅ Never throws errors (catches and logs instead)
- ✅ Verifies ranges were loaded and warns if not
- ✅ Multiple loading attempts (after assets load, after template fields load, safety timeout)

**Testing Checklist:**

- [ ] Console shows `🌡️ [TEMPERATURE SYSTEM] Starting to load asset temperature ranges...`
- [ ] Console shows `✅ [TEMPERATURE SYSTEM] Successfully loaded asset temperature ranges`
- [ ] All assets have ranges loaded (check console logs)
- [ ] No errors in console about missing ranges

### 2. Temperature Range Check Logic

**Location:** `src/components/checklists/TaskCompletionModal.tsx` (temperature input onChange handler)

**Safeguards:**

- ✅ Checks range if available
- ✅ Handles both positive and negative temperatures
- ✅ Logs all checks with `[TEMPERATURE WARNING]` prefix
- ✅ Automatically reloads ranges if missing (fallback)
- ✅ Updates `outOfRangeAssets` state to trigger warning display

**Testing Checklist:**

- [ ] Warning appears when temp < min
- [ ] Warning appears when temp > max
- [ ] Warning disappears when temp corrected
- [ ] Works with negative temps (freezers)
- [ ] Console shows range check logs

### 3. Warning Display

**Location:** `src/components/checklists/TaskCompletionModal.tsx` (temperature warning JSX)

**Safeguards:**

- ✅ Shows warning when `outOfRangeAssets.has(assetId)` is true
- ✅ Displays current temperature and expected range
- ✅ Shows Monitor/Callout buttons
- ✅ Logs when warning is rendered

## How It Works

1. **Modal Opens:**
   - `loadAssetTempRanges()` is called after assets load
   - Also called after template fields load (safety)
   - Also called after 1 second timeout (safety fallback)

2. **User Enters Temperature:**
   - Range check happens in `onChange` handler
   - If out of range, asset ID is added to `outOfRangeAssets` Set
   - Warning box appears automatically

3. **User Clicks Monitor/Callout:**
   - Opens respective modal
   - Creates monitoring task or callout

## Debugging

If temperature warnings aren't working:

1. **Check Console Logs:**
   - Look for `🌡️ [TEMPERATURE SYSTEM]` - should show ranges being loaded
   - Look for `🌡️ [TEMPERATURE WARNING]` - should show range checks
   - Look for `⚠️ [TEMPERATURE WARNING]` - indicates missing ranges

2. **Check Asset Data:**
   - Verify assets have `working_temp_min` and `working_temp_max` in database
   - Run: `SELECT id, name, working_temp_min, working_temp_max FROM assets WHERE id IN (...asset_ids...)`

3. **Check Warning Display:**
   - Look for `🚨 [TEMPERATURE WARNING] Rendering warning for asset X` in console
   - Verify `outOfRangeAssets.has(assetId)` is true

## Modification Guidelines

**Before modifying temperature warning code:**

1. ✅ Read this document
2. ✅ Understand the safeguards
3. ✅ Test temperature warnings after changes
4. ✅ Check console logs for `[TEMPERATURE SYSTEM]` and `[TEMPERATURE WARNING]` prefixes
5. ✅ Verify warnings appear for out-of-range temps
6. ✅ Verify warnings disappear for in-range temps
7. ✅ Test with multiple assets
8. ✅ Test with negative temperatures (freezers)

**DO NOT:**

- ❌ Remove the `[TEMPERATURE SYSTEM]` or `[TEMPERATURE WARNING]` log prefixes
- ❌ Remove the safeguards (multiple loading attempts, fallbacks)
- ❌ Change the `outOfRangeAssets` Set logic
- ❌ Modify without testing

## Files to Check When Debugging

1. `src/components/checklists/TaskCompletionModal.tsx`
   - `loadAssetTempRanges()` function (lines 363-507)
   - Temperature input `onChange` handler (around line 2529)
   - Warning display JSX (around line 2545)

2. Database:
   - `assets` table: `working_temp_min`, `working_temp_max` columns
   - Verify assets have ranges set

## Status

✅ **LOCKED** - Temperature warning system is protected with safeguards and documentation.
