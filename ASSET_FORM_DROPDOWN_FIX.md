# Asset Form Dropdown Pre-population Fix

## 🎯 Problem Solved
Fixed dropdown pre-population issue where edit modals showed "Select..." instead of existing values, and save failures due to column name mismatches.

## 🔧 Root Causes Identified

### 1. **Async Data Loading Race Condition**
- Form initialized before async data (sites, contractors) loaded
- React rendered dropdowns with empty options before data arrived
- By the time options loaded, form was already rendered with empty values

### 2. **Column Name Mismatches**
- Form used `next_service` but database expects `next_service_date`
- Save operations failed with "column not found" errors

### 3. **Contractor Loading Logic**
- Contractors only loaded for existing assets, not new ones
- Missing fallback for new asset creation

## ✅ Fixes Applied

### 1. **Added Re-initialization Effect**
```typescript
// Re-initialize form values after async data loads (critical for dropdown pre-selection)
useEffect(() => {
  if (asset && open && sites.length > 0 && contractors.length > 0) {
    console.log('🔄 Re-initializing form with loaded data:', {
      site_id: asset.site_id,
      category: asset.category,
      ppm_contractor_id: asset.ppm_contractor_id,
      reactive_contractor_id: asset.reactive_contractor_id,
      sites_loaded: sites.length,
      contractors_loaded: contractors.length
    });
    
    setForm(prev => ({
      ...prev,
      site_id: asset.site_id || prev.site_id,
      category: asset.category || prev.category,
      ppm_contractor_id: asset.ppm_contractor_id || prev.ppm_contractor_id,
      reactive_contractor_id: asset.reactive_contractor_id || prev.reactive_contractor_id,
      warranty_contractor_id: asset.warranty_contractor_id || prev.warranty_contractor_id,
    }));
  }
}, [asset, open, sites, contractors]);
```

### 2. **Fixed Column Name Mismatches**
- `next_service` → `next_service_date` (matches database schema)
- All contractor columns already correct: `ppm_contractor_id`, `reactive_contractor_id`, `warranty_contractor_id`

### 3. **Enhanced Contractor Loading**
```typescript
// Load contractors for both new and existing assets
useEffect(() => {
  if (!open) return;
  let mounted = true;
  (async () => {
    try {
      if (asset?.id) {
        // Load contractors for existing asset
        const { data, error } = await supabase.rpc('get_contractors_for_asset', {
          asset_id: asset.id
        });
        // ... handle response
      } else {
        // Load all contractors for new asset
        const { data, error } = await supabase
          .from('contractors')
          .select('id, name, region, category')
          .eq('company_id', companyId)
          .order('name');
        // ... handle response
      }
    } catch (err) {
      console.error('Error loading contractors:', err);
      if (mounted) setContractors([]);
    }
  })();
  return () => { mounted = false; };
}, [open, asset?.id, companyId]);
```

### 4. **Added Debug Information**
- Development-only debug info shows form state and loaded data
- Helps track when re-initialization occurs
- Shows selected values vs available options

## 🎯 Expected Results

### ✅ Dropdown Pre-population
- **Site dropdown**: Shows selected site name instead of "Select a site"
- **Category dropdown**: Shows selected category instead of "Select a category"
- **PPM Contractor**: Shows selected contractor name instead of "Select PPM contractor"
- **Reactive Contractor**: Shows selected contractor name instead of "Select reactive contractor"

### ✅ Save Functionality
- No more "contractor_id column not found" errors
- No more "next_service" column errors
- Updates save successfully with correct column names

### ✅ Debug Information (Development)
- Shows current form values
- Shows number of loaded options
- Shows selected option name
- Helps identify timing issues

## 🧪 Testing Steps

1. **Go to Assets page** - Should load without errors
2. **Click "Edit" on any asset** - Modal should open
3. **Check debug info** - Should show correct values and loaded data counts
4. **Verify dropdowns** - Should show existing values instead of "Select..." placeholders
5. **Change any field** - Should save without column errors
6. **Check console logs** - Should show re-initialization messages

## 🔍 Debug Information

In development mode, you'll see debug info below each dropdown:
- `Debug: form.site_id="uuid", sites=5, selected=Site Name`
- `Debug: ppm_contractor_id="uuid", contractors=3, selected=Contractor Name`

This helps verify that:
- Form has the correct values
- Options are loaded
- React can match IDs to names for display
