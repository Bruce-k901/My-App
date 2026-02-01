# 🚀 Deploy New Simplified Onboarding System

## Quick Deployment Steps

Follow these steps in order to deploy the new simplified onboarding system:

---

### Step 1: Clean Up Old Placeholders

**Run this SQL file first:**
```sql
CLEANUP_OLD_ONBOARDING_PLACEHOLDERS.sql
```

**What it does:**
- ✅ Deletes all old placeholder documents
- ✅ Cleans up orphaned pack-document links
- ✅ Shows you a summary of what remains
- ⚠️ **Safe to run** - Only deletes placeholders, NOT real uploaded documents

**Expected output:**
```
📊 Found X placeholder documents that will be deleted
✅ Cleanup complete. X real documents remain
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 CLEANUP SUMMARY:
   • Documents remaining: X
   • Packs remaining: X
   • Pack-Document links: X
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ Ready to run "Create starter kit"
```

---

### Step 2: Deploy New System

**Run this SQL file second:**
```sql
REBUILD_ONBOARDING_SIMPLE.sql
```

**What it does:**
- ✅ Drops the problematic category CHECK constraint
- ✅ Ensures all required table columns exist
- ✅ Terminates cached database connections
- ✅ Drops all old function versions
- ✅ Creates new simplified seed function (13 documents, 4 packs)
- ✅ Forces PostgREST to reload schema cache

**Expected output:**
```
✅ Dropped old category CHECK constraint
✅ global_documents structure ready
✅ company_onboarding_packs structure ready
✅ Terminated cached connections
✅ Dropped all old seed functions
✅ ALL old functions dropped
🎉 SUCCESS! Simplified onboarding module is ready
📋 13 essential documents will be seeded
📦 4 simple packs: FOH/BOH × Hourly/Salaried
✨ No CHECK constraints blocking categories
```

---

### Step 3: Hard Refresh Browser

**Windows/Linux:** `Ctrl + F5`  
**Mac:** `Cmd + Shift + R`

This clears any cached API responses from PostgREST.

---

### Step 4: Test the New System

1. Go to **People > Onboarding > Docs**
2. You should see an empty library with clear instructions
3. Click **"✨ Create starter kit"**
4. Should create:
   - **13 placeholder documents** (Contracts, Forms, Policies, Compliance, Training)
   - **4 onboarding packs** (FOH/BOH × Hourly/Salaried)
5. Success message: `"Starter kit created: 13 docs, 4 packs"`

---

### Step 5: Upload Your Documents

**Priority uploads (do these first):**

1. **Employment Contracts** (4 files)
   - Employment Contract - FOH Hourly
   - Employment Contract - FOH Salaried
   - Employment Contract - BOH Hourly
   - Employment Contract - BOH Salaried

2. **Staff Handbook** (1 file)
   - Your complete company handbook

3. **Essential Forms** (as needed)
   - New Starter Details Form
   - Right to Work Verification
   - Health Declaration Form
   - GDPR & Data Protection Consent

---

## What's Different?

### Before (Old System)
- ❌ 20+ confusing placeholder documents
- ❌ 9 categories with CHECK constraints
- ❌ Complex document types
- ❌ Database errors blocking uploads

### Now (New System)
- ✅ **13 essential documents** only
- ✅ **6 simple categories**: Contracts, Policies, Forms, Compliance, Training, Other
- ✅ **No CHECK constraints** - upload anything
- ✅ **4 clear packs**: FOH/BOH × Hourly/Salaried

---

## The 13 Essential Documents

### Contracts (4)
1. Employment Contract - FOH Hourly
2. Employment Contract - FOH Salaried
3. Employment Contract - BOH Hourly
4. Employment Contract - BOH Salaried

### Policies (1)
5. Staff Handbook

### Forms (4)
6. New Starter Details Form
7. Uniform Issued Record
8. Wage Deduction Authorisation
9. Right to Work Verification

### Compliance (2)
10. Health Declaration Form
11. GDPR & Data Protection Consent

### Training (2)
12. Food Hygiene Certificate
13. Training Acknowledgment

---

## The 4 Simple Packs

### 📦 FOH - Hourly Staff
**For:** Servers, Bartenders, Hosts  
**Includes:** FOH Hourly Contract + 9 essential docs

### 📦 FOH - Salaried Staff
**For:** Supervisors, FOH Managers  
**Includes:** FOH Salaried Contract + 8 essential docs

### 📦 BOH - Hourly Staff
**For:** Line Cooks, Prep Cooks, Dishwashers  
**Includes:** BOH Hourly Contract + 9 essential docs

### 📦 BOH - Salaried Staff
**For:** Head Chefs, Sous Chefs, Kitchen Managers  
**Includes:** BOH Salaried Contract + 8 essential docs

---

## Troubleshooting

### "CHECK constraint error" still appears
1. Make sure you ran `REBUILD_ONBOARDING_SIMPLE.sql`
2. Hard refresh browser (Ctrl+F5)
3. Try this in SQL Editor:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```

### "Function not found" error
1. Run this in SQL Editor:
   ```sql
   SELECT proname, pronargs 
   FROM pg_proc 
   WHERE proname = 'seed_company_wfm_starter_kit';
   ```
2. Should show the function exists
3. Hard refresh browser

### Old placeholders still showing
1. Run `CLEANUP_OLD_ONBOARDING_PLACEHOLDERS.sql` again
2. Refresh the page

### Can't upload documents
1. Check browser console for errors
2. Verify categories match the new list: Contracts, Policies, Forms, Compliance, Training, Other

---

## Files Involved

### SQL Scripts (run in order)
1. ✅ `CLEANUP_OLD_ONBOARDING_PLACEHOLDERS.sql` - Clean up old data
2. ✅ `REBUILD_ONBOARDING_SIMPLE.sql` - Deploy new system

### Documentation
- 📖 `SIMPLE_ONBOARDING_GUIDE.md` - Complete user guide
- 📖 `ONBOARDING_REBUILD_COMPLETE.md` - Technical summary
- 📖 `DEPLOY_NEW_ONBOARDING.md` - This deployment guide

### Code Changes (already applied)
- ✅ `src/app/dashboard/people/onboarding/docs/page.tsx` - Updated UI
- ✅ `src/components/modals/UploadGlobalDocModal.tsx` - New categories

---

## Success Criteria

✅ All old placeholders deleted  
✅ New seed function created  
✅ No CHECK constraint errors  
✅ "Create starter kit" works  
✅ 13 documents created  
✅ 4 packs created  
✅ Can upload documents without errors  

---

## Next Steps After Deployment

1. **Upload your contracts** - These are the most important
2. **Upload your staff handbook** - Second priority
3. **Upload essential forms** - As needed
4. **Test assigning a pack** - Try assigning to a test employee
5. **Monitor for issues** - Check if employees can access their packs

---

**Last Updated:** December 16, 2024  
**Status:** Ready to deploy 🚀
