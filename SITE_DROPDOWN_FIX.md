# 🔧 Site Dropdown Fix

## Issue
The site dropdown in the trial scheduling modal was not populating.

## Root Causes

### 1. Missing Dependency in useEffect
The `useEffect` that loads sites was not watching for `companyId`:

**Before:**
```javascript
useEffect(() => {
  loadSites()
}, [])  // Empty dependency array
```

**After:**
```javascript
useEffect(() => {
  if (companyId) {
    loadSites()
  }
}, [companyId])  // Now watches companyId
```

### 2. Address Format Issue
The `sites` table stores `address` as **JSONB**, not as a plain text field.

**Structure:**
```javascript
{
  line1: "123 High Street",
  line2: "Suite 4",
  city: "London",
  postcode: "SW1A 1AA"
}
```

## Fixes Applied

### 1. Added formatAddress Helper Function
```javascript
const formatAddress = (address: any): string => {
  if (!address) return ''
  if (typeof address === 'string') return address
  
  // Handle JSONB address format
  const parts = []
  if (address.line1) parts.push(address.line1)
  if (address.line2) parts.push(address.line2)
  if (address.city) parts.push(address.city)
  if (address.postcode) parts.push(address.postcode)
  
  return parts.join(', ')
}
```

### 2. Updated Dropdown Display
```javascript
<option key={site.id} value={site.id}>
  {site.name}{site.address ? ` - ${formatAddress(site.address)}` : ''}
</option>
```

### 3. Updated Email Location
```javascript
trialLocation: selectedSite 
  ? `${selectedSite.name}${selectedSite.address ? ' - ' + formatAddress(selectedSite.address) : ''}` 
  : ''
```

### 4. Added Logging for Debug
```javascript
console.log('Loaded sites:', data)
if (!data || data.length === 0) {
  console.warn('No sites found for company:', companyId)
}
```

## Testing

1. Open the post-interview assessment modal
2. Choose "Progress to Trial"
3. Scroll to "Schedule Trial Shift" section
4. Check the **"Trial Location (Site)"** dropdown
5. Should now show all company sites with formatted addresses

## Expected Output

Dropdown should show:
```
Select a site...
Main Kitchen - 123 High St, London, SW1A 1AA
Cafe Branch - 45 Market St, Manchester, M1 2AB
Restaurant - 78 Park Lane, Birmingham, B3 2PP
```

## If Still Not Showing

1. **Check browser console** for logs:
   - "Loaded sites: [...]"
   - Any errors?

2. **Verify sites exist:**
   - Go to your sites management page
   - Ensure at least one site exists for your company

3. **Check RLS policies:**
   - Ensure sites table has proper SELECT policies
   - Company members should be able to read their sites

4. **Manual SQL check:**
   ```sql
   SELECT id, name, address 
   FROM public.sites 
   WHERE company_id = '[your-company-id]'
   ORDER BY name;
   ```

---

**Status:** ✅ Fixed  
**Date:** December 2025
