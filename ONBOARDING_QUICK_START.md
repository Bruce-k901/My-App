# ⚡ Onboarding System - Quick Start

## 🎯 Deploy in 4 Steps

### 1️⃣ Clean Up (30 seconds)
```sql
-- Run this in Supabase SQL Editor:
CLEANUP_OLD_ONBOARDING_PLACEHOLDERS.sql
```
Removes all old placeholder documents.

### 2️⃣ Deploy New System (30 seconds)
```sql
-- Run this in Supabase SQL Editor:
REBUILD_ONBOARDING_SIMPLE.sql
```
Installs the new simplified onboarding system.

### 3️⃣ Hard Refresh Browser
- **Windows:** `Ctrl + F5`
- **Mac:** `Cmd + Shift + R`

### 4️⃣ Create Starter Kit
1. Go to **People > Onboarding > Docs**
2. Click **"✨ Create starter kit"**
3. Done! ✅

---

## 📋 What You Get

**13 Documents:**
- 4 Contracts (FOH/BOH × Hourly/Salaried)
- 1 Staff Handbook
- 4 Forms (New Starter, Uniform, Wage Deduction, Right to Work)
- 2 Compliance (Health Declaration, GDPR)
- 2 Training (Food Hygiene, Training Acknowledgment)

**4 Packs:**
- FOH - Hourly Staff
- FOH - Salaried Staff
- BOH - Hourly Staff
- BOH - Salaried Staff

---

## ✅ Priority Uploads

Upload these first (in order):

1. **Your 4 employment contracts**
   - FOH Hourly
   - FOH Salaried
   - BOH Hourly
   - BOH Salaried

2. **Your staff handbook**

3. **Essential forms** (as needed)

---

## 🆘 Quick Troubleshooting

**Problem:** CHECK constraint error  
**Fix:** Re-run `REBUILD_ONBOARDING_SIMPLE.sql` + hard refresh

**Problem:** Function not found  
**Fix:** Run `NOTIFY pgrst, 'reload schema';` + hard refresh

**Problem:** Old docs still showing  
**Fix:** Re-run `CLEANUP_OLD_ONBOARDING_PLACEHOLDERS.sql`

---

## 📚 Full Documentation

- **User Guide:** `SIMPLE_ONBOARDING_GUIDE.md`
- **Deployment:** `DEPLOY_NEW_ONBOARDING.md`
- **Summary:** `ONBOARDING_REBUILD_COMPLETE.md`

---

**Ready?** Start with step 1 above! 🚀
