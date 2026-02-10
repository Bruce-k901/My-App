# 🧹 Database Cleanup Script - Custom Template Naming Testing

**Purpose**: Clean up existing data to test the custom template naming implementation properly.

**How to Use**: Copy and paste each section individually into the Supabase SQL Editor and run them one by one.

---

## 📋 **Step-by-Step Cleanup**

### Step 1: Delete ALL tasks from My Tasks page

```sql
DELETE FROM public.tasks
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid());
```

### Step 2: Delete ALL deployed tasks (site_checklists)

```sql
DELETE FROM public.site_checklists
WHERE site_id = (SELECT site_id FROM public.profiles WHERE id = auth.uid());
```

### Step 3: Delete ALL templates EXCEPT "SFBB Temperature Checks"

```sql
DELETE FROM public.checklist_templates
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
AND name != 'SFBB Temperature Checks';
```

### Step 4 (OPTIONAL): Complete Cleanup

```sql
-- Only run this if you want to completely start fresh
DELETE FROM public.checklist_templates
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid());
```

---

## 🔍 **Verification Queries**

After cleanup, run these to check what's left:

### Check Templates

```sql
SELECT name, created_at FROM public.checklist_templates
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid());
```

### Check Site Checklists

```sql
SELECT name, day_part FROM public.site_checklists
WHERE site_id = (SELECT site_id FROM public.profiles WHERE id = auth.uid());
```

### Check Tasks

```sql
SELECT name, status, created_at FROM public.tasks
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
LIMIT 5;
```

---

## 🎯 **Testing After Cleanup**

Once cleanup is complete, test the custom template naming:

1. **Go to**: `http://localhost:3001/compliance`
2. **Click**: "Create New Template" button
3. **Enter**: Custom name like "Morning Fridges Only"
4. **Configure**: Equipment and day parts
5. **Click**: "Save & Deploy"
6. **Verify**: Template appears in Templates page with custom name
7. **Test**: Create another template with different name
8. **Verify**: Both templates exist with different names

---

## 🚨 **Important Notes**

- **Run commands one at a time** in Supabase SQL Editor
- **Check results** after each step
- **Backup important data** before cleanup if needed
- **Test thoroughly** after cleanup to ensure everything works

---

## ✅ **Expected Results**

After cleanup and testing:

- ✅ No duplicate constraint errors
- ✅ Custom template names work properly
- ✅ Multiple templates can be created
- ✅ Templates deploy to My Tasks correctly
- ✅ Each template has unique name per site/company

The cleanup will ensure a clean slate for testing the custom template naming implementation! 🎉
