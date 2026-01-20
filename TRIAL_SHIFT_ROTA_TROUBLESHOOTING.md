# 🔧 Trial Shift Rota - Troubleshooting & Fix

## ❌ Issue Found

Trial shifts weren't being created because of a condition check issue.

## ✅ Fix Applied

Updated the rota creation logic to:
1. Check if `addToRota` is enabled
2. Verify a valid site was selected from the dropdown
3. Show clear warning if manual text entry was used instead

## 🎯 How to Schedule Trial with Rota

### **IMPORTANT: You MUST select a site from the dropdown!**

When progressing a candidate to trial:

1. ✅ **Select Site from Dropdown** 
   - Click the "Select Site" dropdown
   - Choose an actual site (e.g., "Main Kitchen", "Front of House")
   - ❌ **Don't use manual text entry** - it won't add to rota!

2. ✅ **Select Contact Person**
   - After selecting site, choose contact from dropdown
   - This will be populated based on the site

3. ✅ **Fill in Trial Details**
   - Date
   - Time  
   - Duration
   - Payment terms

4. ✅ **Ensure "Add to Rota" is Checked**
   - Should be checked by default
   - Keep it checked!

5. ✅ **Submit**
   - Watch browser console for logs
   - Look for success toast

## 📝 Console Logs to Check

When you submit, you should see:

```
🔄 Starting rota shift creation...
addToRota: true
sites.length: 3
trialSiteId: [site-uuid]
Site ID: [site-uuid]
Week starting: 2025-12-16
🔍 Looking for existing rota...
Existing rota: {id: "..."}
Final rota ID: [rota-uuid]
➕ Creating rota shift...
Shift data: {...}
Rota shift result: {id: "..."}
✅ Trial shift added to rota: [shift-uuid]
```

## ⚠️ Common Issues

### **1. No Site Selected**

**Problem:** Used manual text entry instead of dropdown

**Console Shows:**
```
⚠️ No valid site selected - cannot add to rota
```

**Solution:** 
- Use the site dropdown
- Select an actual site
- Don't type manually in the location field

### **2. Sites Not Loading**

**Problem:** Dropdown is empty

**Console Shows:**
```
sites.length: 0
```

**Solution:**
- Make sure you have sites set up in your company
- Check browser console for site loading errors
- Verify RLS policies allow site access

### **3. Rota Creation Failed**

**Problem:** Can't create/find rota

**Console Shows:**
```
Rota create error: {...}
```

**Solution:**
- Check RLS policies on `rotas` table
- Verify company_id is set correctly
- Check Supabase logs for detailed error

### **4. Shift Insert Failed**

**Problem:** Can't insert shift

**Console Shows:**
```
❌ Failed to create rota shift: {...}
Shift error: {...}
```

**Solution:**
- Check RLS policies on `rota_shifts` table
- Verify all required fields are set
- Check Supabase logs

## 🔍 How to Verify It Worked

### **Method 1: Check Browser Console**

Look for:
```
✅ Trial shift added to rota: [uuid]
```

And toast notification:
```
"Trial shift added to rota!"
```

### **Method 2: Check Database**

Run this SQL in Supabase:

```sql
SELECT 
  rs.*,
  r.week_starting,
  s.name as site_name
FROM rota_shifts rs
JOIN rotas r ON rs.rota_id = r.id
JOIN sites s ON r.site_id = s.id
WHERE rs.notes LIKE '%TRIAL SHIFT%'
ORDER BY rs.created_at DESC
LIMIT 5;
```

### **Method 3: Check Schedule Page**

1. Go to People → Schedule
2. Navigate to the week of the trial
3. Look for PINK shift on the scheduled day
4. Click to see trial details

## 🎨 What to Look For on Rota

**Pink Shift:**
- Color: `#EC4899`
- Unassigned (no staff member)
- Role Required: [Job Title]
- Status: scheduled

**Shift Notes:**
```
🎯 TRIAL SHIFT - [Candidate Name]
Candidate for: [Job Title]
Contact: [Manager Name]
Location: [Site Name]
Payment: [Terms]
```

## ✅ Testing Checklist

1. [ ] Go to candidate profile
2. [ ] Click "Progress to Trial"  
3. [ ] **Select a SITE from dropdown** (not manual entry!)
4. [ ] Select contact person from dropdown
5. [ ] Fill in date, time, duration
6. [ ] Verify "Add to rota" is checked
7. [ ] Submit
8. [ ] Check browser console for success logs
9. [ ] Look for "Trial shift added to rota!" toast
10. [ ] Navigate to Schedule page
11. [ ] Go to correct week
12. [ ] Find the PINK shift
13. [ ] Click to verify details

## 🚀 Next Steps

**After the fix, test with a new candidate:**

1. Create or use existing candidate
2. Progress to trial
3. **IMPORTANT:** Select actual site from dropdown
4. Complete all fields
5. Submit and watch console
6. Check schedule page

## 📊 Expected Result

After submitting:
- ✅ Toast: "Trial shift added to rota!"
- ✅ Console: Success logs with shift ID
- ✅ Schedule: Pink shift visible on correct day
- ✅ Database: New row in `rota_shifts`
- ✅ Application: `trial_rota_shift_id` populated

---

**Status:** Fix applied, ready to test  
**Key Change:** Must select site from dropdown (not manual entry)  
**Created:** December 2025
