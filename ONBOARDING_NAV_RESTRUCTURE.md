# 🔄 Onboarding Navigation Restructure

## Problem
Current onboarding section is chaotic with multiple tabs and confusing navigation:
- `/dashboard/people/onboarding` has "Company" and "My docs" tabs
- `/dashboard/people/onboarding/docs` is the document library
- "Packs & docs" is a subtab within the company view
- Not intuitive where to go for what

## Solution: 4 Clear Pages

### 1. **People to Onboard** 
**URL:** `/dashboard/people/onboarding`  
**Purpose:** Assign onboarding packs to employees and track progress  
**Who:** Managers/Admins only  
**Contents:**
- List of employees
- Assign pack to employee
- Track which employees have completed onboarding
- View individual employee progress

### 2. **Company Docs**
**URL:** `/dashboard/people/onboarding/company-docs`  
**Purpose:** Manage the document library for onboarding  
**Who:** Managers/Admins only  
**Contents:**
- "Create starter kit" button
- List of all onboarding documents
- Upload/replace documents
- Document status (uploaded vs placeholder)

### 3. **Onboarding Packs**
**URL:** `/dashboard/people/onboarding/packs`  
**Purpose:** Create and manage onboarding packs  
**Who:** Managers/Admins only  
**Contents:**
- List of packs (FOH/BOH × Hourly/Salaried)
- Create new pack
- Edit pack (add/remove documents)
- Set document as required/optional
- Activate/deactivate packs

### 4. **My Docs**
**URL:** `/dashboard/people/onboarding/my-docs`  
**Purpose:** View and acknowledge your onboarding documents  
**Who:** All employees  
**Contents:**
- Your assigned onboarding packs
- Documents to review
- Acknowledge/download documents
- Track your progress

---

## Implementation Plan

### Step 1: Update Sidebar ✅
```typescript
{ label: "People to Onboard", href: "/dashboard/people/onboarding" },
{ label: "Company Docs", href: "/dashboard/people/onboarding/company-docs" },
{ label: "Onboarding Packs", href: "/dashboard/people/onboarding/packs" },
{ label: "My Docs", href: "/dashboard/people/onboarding/my-docs" },
```

### Step 2: Restructure Existing Pages

#### `/onboarding/page.tsx` → "People to Onboard"
- Remove tabs
- Keep only the `CompanyOnboardingDashboard` component (employee assignment view)
- Remove "Packs & docs" subtab content
- Focus on employee list and pack assignment

#### `/onboarding/docs/page.tsx` → `/onboarding/company-docs/page.tsx` ✅
- Already moved
- Update header to clarify it's for onboarding docs only
- Keep "Create starter kit" functionality

### Step 3: Create New Pages

#### Create `/onboarding/packs/page.tsx`
- Extract "Packs & docs" subtab from current onboarding page
- Show list of all packs
- Allow creating/editing packs
- Manage which documents are in each pack

#### Create `/onboarding/my-docs/page.tsx`
- Extract `MyOnboardingDocs` component
- Show employee's assigned packs
- Allow acknowledging documents

---

## User Flows

### Manager/Admin Flow

**Scenario:** Hiring a new FOH server (hourly)

1. **Company Docs** → Upload employment contracts if not done
2. **Onboarding Packs** → Verify "FOH - Hourly Staff" pack has correct docs
3. **People to Onboard** → Select new employee → Assign "FOH - Hourly Staff" pack
4. Employee receives email/notification with their documents

### Employee Flow

**Scenario:** New starter completing onboarding

1. **My Docs** → See "FOH - Hourly Staff" pack assigned
2. View list of 10 documents
3. Click to download/view each document
4. Acknowledge each document
5. Progress bar shows completion (e.g., "7/10 acknowledged")

---

## Benefits

✅ **Clearer navigation** - Each page has one purpose  
✅ **Less cognitive load** - No nested tabs  
✅ **Easier onboarding** - New users understand where to go  
✅ **Role-appropriate** - Employees only see "My Docs"  
✅ **Scalable** - Easy to add new features to each section  

---

## Migration Notes

- Old URLs will break (consider redirects if needed)
- `/dashboard/people/onboarding` changes from tabs to single view
- `/dashboard/people/onboarding/docs` → `/dashboard/people/onboarding/company-docs`
- Update any internal links in the codebase

---

**Status:** In Progress  
**Date:** December 16, 2024
