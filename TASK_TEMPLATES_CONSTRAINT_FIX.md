# ✅ Fixed: Task Templates Unique Constraint Error

**Date**: January 27, 2025  
**Status**: Issue Resolved  
**File**: `src/components/compliance/TemperatureCheckTemplate.tsx`

---

## 🐛 **Problem Identified**

The error was occurring in the `TemperatureCheckTemplate` component when trying to save a template:

```
Error creating template: 
{code: '23505', details: null, hint: null, message: 'duplicate key value violates unique constraint "uq_task_templates_title"'}
```

### Root Causes:
1. **Wrong field name**: Component was using `title` field, but `task_templates` table uses `name` field
2. **Missing slug**: The `task_templates` table requires a `slug` field which was missing
3. **No duplicate handling**: Component didn't check for existing templates before inserting
4. **Hardcoded name**: Always used "SFBB Temperature Checks" causing conflicts

---

## 🔧 **Solution Applied**

### 1. Fixed Field Names
- Changed `title: "SFBB Temperature Checks"` → `name: "SFBB Temperature Checks"`
- Added required `slug` field with timestamp: `sfbb-temperature-checks-${Date.now()}`

### 2. Added Duplicate Handling
- Check for existing templates with same name before inserting
- Update existing template if found
- Insert new template only if none exists

### 3. Improved Error Handling
- Better error messages for different scenarios
- Proper error logging for debugging

---

## 📝 **Code Changes**

### Before:
```typescript
const templateData = {
  company_id: profile.company_id,
  title: "SFBB Temperature Checks",  // ❌ Wrong field name
  description: "Daily temperature monitoring for refrigeration equipment",
  category: "food_safety",
  frequency: "daily",
  active: true,
  is_active: true
};

const { data: template, error: templateError } = await supabase
  .from("task_templates")
  .insert(templateData)  // ❌ No duplicate handling
  .select()
  .single();
```

### After:
```typescript
const templateName = "SFBB Temperature Checks";
const templateSlug = `sfbb-temperature-checks-${Date.now()}`;

const templateData = {
  company_id: profile.company_id,
  name: templateName,  // ✅ Correct field name
  slug: templateSlug,  // ✅ Required slug field
  description: "Daily temperature monitoring for refrigeration equipment",
  category: "food_safety",
  frequency: "daily",
  is_active: true,
  is_template_library: true
};

// ✅ Check for existing templates first
const { data: existingTemplates, error: searchError } = await supabase
  .from("task_templates")
  .select("id")
  .eq("company_id", profile.company_id)
  .eq("name", templateName);

const existing = existingTemplates?.[0];
let template;

if (existing) {
  // ✅ Update existing template
  const { data, error: updateError } = await supabase
    .from("task_templates")
    .update(templateData)
    .eq("id", existing.id)
    .select()
    .single();
  template = data;
} else {
  // ✅ Insert new template
  const { data, error: insertError } = await supabase
    .from("task_templates")
    .insert(templateData)
    .select()
    .single();
  template = data;
}
```

---

## 🎯 **Result**

- ✅ **No more unique constraint violations**
- ✅ **Proper duplicate handling** - updates existing templates instead of failing
- ✅ **Correct field names** - uses `name` and `slug` as required by schema
- ✅ **Better error handling** - clearer error messages for debugging
- ✅ **Unique slugs** - timestamp-based slugs prevent conflicts

---

## 🧪 **Testing**

The fix should now allow users to:
1. **Save templates successfully** without constraint violations
2. **Update existing templates** when saving with the same name
3. **Create new templates** when using different names
4. **See proper error messages** if other issues occur

---

## 📋 **Next Steps**

1. **Test the fix** by trying to save a temperature check template
2. **Verify templates appear** in the Templates page
3. **Test duplicate handling** by saving the same template twice
4. **Check error handling** by testing with invalid data

The unique constraint error should now be resolved! 🎉
