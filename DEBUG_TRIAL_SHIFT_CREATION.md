# 🔍 Debug Trial Shift Creation

## Step-by-Step Debugging Guide

### **Step 1: Open Browser Console**

Before progressing candidate to trial:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Clear console
4. Keep it visible

### **Step 2: Progress Candidate to Trial**

1. Go to candidate profile
2. Click "Progress to Trial" 
3. Fill in ALL fields:
   - ✅ Date
   - ✅ Time
   - ✅ Duration
   - ✅ **Select SITE from dropdown** (critical!)
   - ✅ **Select CONTACT from dropdown**
   - ✅ Payment terms
   - ✅ Keep "Add to rota" CHECKED

4. Click Submit

### **Step 3: Check Console Logs**

You should see these logs in order:

```
✅ SUCCESSFUL FLOW:
━━━━━━━━━━━━━━━━━━━━━━━━
🔄 Starting rota shift creation...
addToRota: true
sites.length: [number > 0]
trialSiteId: [uuid]
Site ID: [uuid]
Week starting: [date]
🔍 Looking for existing rota...
Existing rota: {id: "..."} OR null
Final rota ID: [uuid]
➕ Creating rota shift...
Shift data: {rota_id: "...", company_id: "...", ...}
Rota shift result: {id: "..."}
✅ Trial shift added to rota: [uuid]

AND toast notification: "Trial shift added to rota!"
```

### **Step 4: Check for Errors**

#### **Error A: No Site Selected**
```
⚠️ No valid site selected - cannot add to rota
Toast: "Trial scheduled! Select a site from dropdown to add to rota."
```
**Fix:** Select a site from the dropdown (not manual text)

#### **Error B: Sites Not Loading**
```
sites.length: 0
```
**Fix:** Check site loading, RLS policies

#### **Error C: Rota Creation Failed**
```
Rota create error: {message: "..."}
```
**Fix:** Check RLS policies on `rotas` table

#### **Error D: Shift Insert Failed**
```
Shift error: {message: "..."}
Toast: "Trial scheduled but could not add to rota"
```
**Fix:** Check RLS policies on `rota_shifts` table

### **Step 5: Verify in Database**

Run this SQL in Supabase:

```sql
-- Check if shift was created
SELECT 
  rs.id,
  rs.shift_date,
  rs.start_time,
  rs.end_time,
  rs.color,
  rs.notes,
  r.week_starting,
  s.name as site_name,
  rs.created_at
FROM rota_shifts rs
JOIN rotas r ON rs.rota_id = r.id
JOIN sites s ON r.site_id = s.id
WHERE rs.created_at > NOW() - INTERVAL '10 minutes'
  AND rs.notes LIKE '%TRIAL SHIFT%'
ORDER BY rs.created_at DESC;
```

### **Step 6: Check Schedule Page**

1. Navigate to Dashboard → People → Schedule
2. Select the correct site (dropdown at top)
3. Navigate to the week of the trial
4. Look for a **PINK shift** on the scheduled day
5. Click the shift to see details

## 🎨 What the Shift Should Look Like

### **On Schedule:**
- **Color:** Pink (#EC4899)
- **Status:** Scheduled
- **Assigned:** Unassigned (empty)
- **Role:** [Job Title]
- **Time:** [Start] - [End]

### **Shift Details (click to view):**
```
🎯 TRIAL SHIFT - John Smith
Candidate for: Chef
Contact: Manager Name
Location: Main Kitchen
Payment: Paid £12.50/hr
```

## 🔧 Common Issues & Solutions

### **Issue 1: "Add to Rota" Unchecked**
**Symptom:** No console logs about rota creation
**Fix:** Make sure checkbox is checked

### **Issue 2: Manual Text Entry Used**
**Symptom:** Console shows "No valid site selected"
**Fix:** Use dropdown to select site

### **Issue 3: No Sites in Dropdown**
**Symptom:** Dropdown is empty
**Fix:** 
- Add sites to your company
- Check RLS policies on `sites` table
- Check browser console for site loading errors

### **Issue 4: RLS Policy Issues**

**Check Rotas Policy:**
```sql
-- You should be able to insert rotas
SELECT * FROM rotas 
WHERE company_id = '[your-company-id]'
LIMIT 1;

-- Try inserting
INSERT INTO rotas (company_id, site_id, week_starting, status)
VALUES ('[company-id]', '[site-id]', '2025-12-16', 'draft')
RETURNING *;
```

**Check Rota Shifts Policy:**
```sql
-- You should be able to insert shifts
SELECT * FROM rota_shifts 
WHERE company_id = '[your-company-id]'
LIMIT 1;

-- Try inserting
INSERT INTO rota_shifts (rota_id, company_id, shift_date, start_time, end_time, color, notes)
VALUES ('[rota-id]', '[company-id]', '2025-12-20', '10:00', '14:00', '#EC4899', 'Test')
RETURNING *;
```

### **Issue 5: Wrong Week on Schedule**
**Symptom:** Shift created but not visible
**Solution:**
- Check you're viewing the correct week
- Check you've selected the correct site at top of schedule
- Week starts on Monday - shift appears on the day you scheduled

## 📊 Manual Verification Checklist

Run each query and check results:

### **1. Check Recent Applications**
```sql
SELECT 
  a.id,
  c.full_name as candidate,
  a.status,
  a.trial_scheduled_at,
  a.trial_rota_shift_id,
  a.created_at
FROM applications a
JOIN candidates c ON a.candidate_id = c.id
WHERE a.status = 'trial'
ORDER BY a.created_at DESC
LIMIT 5;
```
**Expected:** Should show `trial_rota_shift_id` populated

### **2. Check Rotas Created Recently**
```sql
SELECT 
  r.*,
  s.name as site_name,
  (SELECT COUNT(*) FROM rota_shifts WHERE rota_id = r.id) as shift_count
FROM rotas r
JOIN sites s ON r.site_id = s.id
WHERE r.created_at > NOW() - INTERVAL '1 hour'
ORDER BY r.created_at DESC;
```

### **3. Check All Trial Shifts**
```sql
SELECT 
  rs.*,
  r.week_starting,
  s.name as site_name
FROM rota_shifts rs
JOIN rotas r ON rs.rota_id = r.id
JOIN sites s ON r.site_id = s.id
WHERE rs.notes LIKE '%TRIAL SHIFT%'
ORDER BY rs.created_at DESC;
```

## 🎯 Expected Full Flow

1. ✅ Select site from dropdown → `trialSiteId` = UUID
2. ✅ Sites array populated → `sites.length` > 0
3. ✅ Site found in array → `siteId` = UUID
4. ✅ Week calculated → `weekStartingStr` = Monday date
5. ✅ Rota found/created → `rotaId` = UUID
6. ✅ Shift inserted → `rotaShift.id` = UUID
7. ✅ Application updated → `trial_rota_shift_id` = UUID
8. ✅ Toast shown → "Trial shift added to rota!"
9. ✅ Shift visible on schedule → Pink shift on correct day

## 🚀 Quick Test

**Run this to insert a test trial shift manually:**

```sql
-- 1. Get your company_id and a site_id
SELECT id as company_id FROM companies LIMIT 1;
SELECT id as site_id, name FROM sites LIMIT 1;

-- 2. Create/get a rota for this week
INSERT INTO rotas (company_id, site_id, week_starting, status)
VALUES 
  ('[company-id]', '[site-id]', 
   date_trunc('week', CURRENT_DATE)::date, 
   'draft')
ON CONFLICT DO NOTHING
RETURNING id;

-- 3. Insert test trial shift
INSERT INTO rota_shifts (
  rota_id, company_id, profile_id,
  shift_date, start_time, end_time,
  break_minutes, role_required, status, color, notes
)
VALUES (
  '[rota-id]',
  '[company-id]',
  NULL,
  CURRENT_DATE + INTERVAL '2 days',
  '10:00',
  '14:00',
  0,
  'Test Chef',
  'scheduled',
  '#EC4899',
  '🎯 TRIAL SHIFT - Test Candidate
Candidate for: Test Chef
Contact: Test Manager
Location: Test Site
Payment: Paid £12.00/hr'
)
RETURNING *;
```

If this works, the issue is in the application code.
If this fails, the issue is RLS policies.

---

**After following this guide, report back with:**
1. Console logs you see
2. Any error messages
3. SQL query results
4. Whether manual insert worked
