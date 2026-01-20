# ✅ Packs Page - Dropdown Filtered to Onboarding Docs Only

## What Changed

The "Add Document to Pack" dropdown now only shows **onboarding documents** and excludes general company compliance documents.

## Filter Applied

```typescript
// Filter to only include onboarding documents (those with "Onboarding -" prefix in category)
const onboardingDocs = (gdData || []).filter((doc: any) => 
  doc.category && doc.category.startsWith('Onboarding -')
)
```

## Categories Included ✅

- **Onboarding - Contracts**
- **Onboarding - Policies**
- **Onboarding - Forms**
- **Onboarding - Training**

## Categories Excluded ❌

- Food Safety & Hygiene
- Health & Safety
- Fire & Premises
- Training & Competency
- Cleaning & Hygiene
- Legal & Certificates
- Environmental & Waste
- Other

## Why This Makes Sense

**Onboarding Packs** = Documents for new employees
- Employment contracts
- Staff handbook
- Policy acknowledgments
- Training records
- Forms to complete

**Company Documents Page** = General compliance documents
- Insurance certificates
- HACCP plans
- Fire safety certificates
- Allergen policies
- etc.

This keeps the packs page clean and focused on employee onboarding only.

## Result

The dropdown will now only show relevant onboarding documents, making it much easier to find and add the right documents to packs without the noise of company compliance documents.

---

**Status:** ✅ Complete  
**File Modified:** `src/app/dashboard/people/onboarding/packs/page.tsx`  
**Date:** December 16, 2024
