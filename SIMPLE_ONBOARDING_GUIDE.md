# Simple Onboarding System - User Guide

## Overview

The onboarding system has been completely rebuilt to be **simple, practical, and focused on what hospitality businesses actually need**.

## What's Changed? ✨

### Before (Complex)
- ❌ 20+ placeholder documents across 9 categories
- ❌ Confusing document types
- ❌ Database CHECK constraints blocking uploads
- ❌ Unclear what's required vs optional

### Now (Simple)
- ✅ **13 essential documents** across 5 clear categories
- ✅ **4 simple packs**: FOH/BOH × Hourly/Salaried
- ✅ **No restrictions** - upload any document type
- ✅ **Focus on what matters**: Contracts, Handbook, Forms

---

## The 13 Essential Documents

### 1. **Contracts** (4 documents)
Your employment contracts tailored by role and pay type:
- Employment Contract - FOH Hourly (servers, bartenders, hosts)
- Employment Contract - FOH Salaried (supervisors, managers)
- Employment Contract - BOH Hourly (line cooks, prep cooks, dishwashers)
- Employment Contract - BOH Salaried (head chefs, sous chefs, kitchen managers)

### 2. **Policies** (1 document)
- Staff Handbook - Your complete company handbook

### 3. **Forms** (4 documents)
Essential paperwork for new starters:
- New Starter Details Form - Collect employee information
- Uniform Issued Record - Track uniform distribution
- Wage Deduction Authorisation - For uniform/equipment costs
- Right to Work Verification - Work permit documentation

### 4. **Compliance** (2 documents)
Legal requirements:
- Health Declaration Form - Pre-employment health questionnaire
- GDPR & Data Protection Consent - Privacy notice

### 5. **Training** (2 documents)
Mandatory training records:
- Food Hygiene Certificate - Level 2 Food Safety
- Training Acknowledgment - Training completion records

---

## The 4 Simple Onboarding Packs

Each pack contains the relevant contract plus all essential documents:

### 📦 FOH - Hourly Staff
**For:** Servers, Bartenders, Hosts, Bussers
**Includes:**
- Employment Contract - FOH Hourly ⭐
- Staff Handbook
- New Starter Details Form
- Uniform Issued Record
- Wage Deduction Authorisation
- Right to Work Verification
- Food Hygiene Certificate
- Health Declaration Form
- GDPR & Data Protection Consent
- Training Acknowledgment

### 📦 FOH - Salaried Staff
**For:** Supervisors, Front of House Managers, Assistant Managers
**Includes:**
- Employment Contract - FOH Salaried ⭐
- Staff Handbook
- New Starter Details Form
- Uniform Issued Record
- Right to Work Verification
- Food Hygiene Certificate
- Health Declaration Form
- GDPR & Data Protection Consent
- Training Acknowledgment

### 📦 BOH - Hourly Staff
**For:** Line Cooks, Prep Cooks, Dishwashers, Kitchen Porters
**Includes:**
- Employment Contract - BOH Hourly ⭐
- Staff Handbook
- New Starter Details Form
- Uniform Issued Record
- Wage Deduction Authorisation
- Right to Work Verification
- Food Hygiene Certificate
- Health Declaration Form
- GDPR & Data Protection Consent
- Training Acknowledgment

### 📦 BOH - Salaried Staff
**For:** Head Chefs, Sous Chefs, Kitchen Managers
**Includes:**
- Employment Contract - BOH Salaried ⭐
- Staff Handbook
- New Starter Details Form
- Uniform Issued Record
- Right to Work Verification
- Food Hygiene Certificate
- Health Declaration Form
- GDPR & Data Protection Consent
- Training Acknowledgment

---

## Getting Started (3 Simple Steps)

### Step 1: Create Your Starter Kit
1. Go to **People > Onboarding > Docs**
2. Click **"Create starter kit"**
3. Wait 2-3 seconds - you'll see 13 placeholder documents created

### Step 2: Upload Your Documents
Priority uploads (do these first):
1. **Your 4 employment contracts** (FOH/BOH × Hourly/Salaried)
2. **Your staff handbook**
3. **New starter form** (if you have a template)

Then fill in the rest as needed.

### Step 3: Assign Packs to New Starters
1. Go to **People > Employees**
2. Click on a new starter
3. Choose the appropriate pack:
   - FOH server on hourly rate → "FOH - Hourly Staff"
   - Head chef on salary → "BOH - Salaried Staff"
4. Employee receives all documents in their pack automatically

---

## FAQ

**Q: Can I add more documents?**
A: Yes! Click "Upload New Doc" to add anything else you need. The 13 essentials are just a starting point.

**Q: Can I customize which documents are in each pack?**
A: Yes! Go to **People > Onboarding > Packs & docs** to add/remove documents from packs.

**Q: What if I don't use FOH/BOH terminology?**
A: That's fine - just think of it as:
- FOH = Customer-facing roles
- BOH = Kitchen/production roles

**Q: Do I need all 13 documents?**
A: No, but the employment contracts and staff handbook are essential. The rest depend on your specific needs.

**Q: What happened to the old complicated categories?**
A: We removed all database restrictions. You can now upload any document with any category - no more "CHECK constraint" errors!

**Q: Can I create additional packs?**
A: Yes! Go to **People > Onboarding > Packs & docs** and click "Create pack" to make custom packs (e.g., "Kitchen Management", "Bar Team", "Trainee Program").

---

## Technical Notes (For Developers)

### What Was Fixed
1. **Removed CHECK constraint** on `global_documents.category` - no more blocking categories
2. **Simplified document types** from 30+ to 13 essentials
3. **Removed complex seeding logic** - no more `storage.copy_object` errors
4. **Streamlined packs** - 4 base packs instead of confusing variations
5. **Updated UI** - clearer guidance and modern styling

### Migration Required
Run this SQL file in Supabase SQL Editor:
```
REBUILD_ONBOARDING_SIMPLE.sql
```

This will:
- Drop the problematic category CHECK constraint
- Clean up old function versions
- Create the new simplified seed function
- Force PostgREST to reload schema cache

### Files Changed
- `REBUILD_ONBOARDING_SIMPLE.sql` - Main migration
- `src/app/dashboard/people/onboarding/docs/page.tsx` - Updated UI guidance
- `src/components/modals/UploadGlobalDocModal.tsx` - Simplified categories

---

## Support

If you hit any issues:
1. Try a **hard refresh** (Ctrl+F5 or Cmd+Shift+R)
2. Check the **browser console** for errors
3. Verify the migration ran successfully in Supabase

---

**Last Updated:** December 16, 2024  
**Version:** 2.0 (Simplified)
