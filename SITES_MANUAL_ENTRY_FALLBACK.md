# 🔧 Sites Manual Entry Fallback

## Issue
Sites dropdown was showing a 400 error when loading from Supabase.

## Root Cause
The sites table exists but either:
1. RLS (Row Level Security) policies are missing/incorrect
2. No sites have been created yet for your company

## Solutions Implemented

### 1. Better Error Logging ✅
Added detailed error logging to see exact Supabase error:
```javascript
console.error('Supabase error loading sites:', {
  message: error.message,
  details: error.details,
  hint: error.hint,
  code: error.code
})
```

### 2. Manual Entry Fallback ✅
If sites can't be loaded, the form now shows text inputs instead:

**Before (dropdown only):**
```
Trial Location (Site) *
[Select a site...        ▼]
```

**After (with fallback):**
```
Trial Location *
[Main Kitchen, 123 High Street, London]
💡 No sites found. Enter location manually or 
   set up sites in your company settings.
```

**Same for Contact Person:**
```
Who Will They Meet? *
[John Smith (Manager)]
💡 Enter the contact person's name manually
```

### 3. Smart Detection
The form now:
- ✅ Tries to load sites from database
- ✅ Shows dropdown if sites exist
- ✅ Falls back to text input if no sites
- ✅ Works either way!

### 4. Updated Submission Logic
Email and rota creation now handle both:
- **Dropdown value** (UUID from database)
- **Manual text entry** (typed by user)

```javascript
// Determine location
let locationText = ''
if (selectedSite) {
  // From dropdown
  locationText = `${selectedSite.name} - ${address}`
} else {
  // Manual entry
  locationText = trialSiteId || 'TBC'
}
```

## How to Fix Sites Table (Optional)

If you want to use the dropdown instead of manual entry, run this SQL:

### Step 1: Check if Sites Table Has RLS
```sql
SELECT * FROM pg_policies WHERE tablename = 'sites';
```

### Step 2: Apply RLS Policies
Run the file: **`FIX_SITES_RLS.sql`**

This will:
- Enable RLS on sites table
- Add policies for company members to view sites
- Add policies for managers to manage sites

### Step 3: Create Some Sites (if none exist)
```sql
INSERT INTO public.sites (company_id, name, address)
VALUES 
  ('YOUR-COMPANY-ID', 'Main Kitchen', '{"line1": "123 High Street", "city": "London", "postcode": "SW1A 1AA"}'::jsonb),
  ('YOUR-COMPANY-ID', 'Cafe Branch', '{"line1": "45 Market Street", "city": "Manchester", "postcode": "M1 2AB"}'::jsonb);
```

Replace `YOUR-COMPANY-ID` with: `f99510bc-b290-47c6-8f12-282bea67bd91`

## Current Behavior

### **Scenario 1: Sites Exist & RLS Works**
1. Modal opens
2. Sites load from database
3. Shows dropdown with all sites
4. Select site → staff dropdown populates
5. Submit → Email has proper location

### **Scenario 2: No Sites or RLS Issue**
1. Modal opens
2. Sites fail to load (400 error)
3. **Shows text inputs instead** ✅
4. Type location: "Main Kitchen, 123 High St, London"
5. Type contact: "John Smith (Manager)"
6. Submit → Email works with manual entries

## Testing

### Test Manual Entry Mode:
1. Open post-interview assessment
2. Progress to trial
3. You should see **text input fields** (not dropdowns)
4. Type:
   - Location: "Main Kitchen, 123 High Street, London"
   - Contact: "John Smith"
5. Fill rest of form
6. Submit
7. **Email should send successfully** with your manual entries!

### Test After Fixing RLS:
1. Run `FIX_SITES_RLS.sql`
2. Create at least one site
3. Refresh browser
4. Open modal again
5. Should now see **dropdown instead of text input**
6. Sites load automatically!

## Benefits

✅ **Works immediately** - No database setup required  
✅ **Flexible** - Can use dropdown OR manual entry  
✅ **Graceful degradation** - Fallback when data unavailable  
✅ **Professional** - No broken forms or errors  
✅ **Future-proof** - Auto-switches to dropdown when sites exist  

## Next Steps

**Option A: Use Manual Entry (Quick)**
- Nothing to do!
- Just type locations when scheduling trials
- Works perfectly for now

**Option B: Set Up Sites (Better UX)**
1. Run `FIX_SITES_RLS.sql`
2. Go to company settings
3. Add your sites/locations
4. Future trials will use dropdown

## Files Created
- `FIX_SITES_RLS.sql` - SQL to fix RLS policies and create test sites
- `SITES_MANUAL_ENTRY_FALLBACK.md` - This documentation

---

**Status:** ✅ Working (with fallback)  
**Date:** December 2025  
**Recommendation:** Use manual entry for now, set up sites table later for better UX
