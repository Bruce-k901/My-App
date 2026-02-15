# Employee Management

## Overview

Teamly provides two streamlined paths for adding employees:

1. **Head Office / Executive** - For leadership and non-site-based staff
2. **Site Employee** - For site-based operational staff

## When to Use Each Path

### Head Office / Executive

- CEO, COO, CFO, and C-suite executives
- Department heads (HR Manager, Operations Manager, Finance Manager)
- Regional and Area Managers
- Head office administrators
- Any staff not based at a specific site

**Characteristics:** No site assignment, 4-tab modal form (Personal, Employment, Compliance, Banking), appears in org chart by role category.

### Site Employee

- Site managers, kitchen staff, front of house, operational staff
- Anyone who works at a physical site

**Characteristics:** Required site assignment, section assignment (BOH/FOH), training certificate tracking, full page form.

## Entry Points

### Navigation Flow

```
ANY ENTRY POINT
  ├── Sidebar → People → Employees → "Add Employee"
  ├── Employees Page → "Add Head Office" (purple, opens modal directly)
  └── Employees Page → "Add Site Employee" (pink, goes to choice screen)
                              ↓
                    CHOICE SCREEN
              /dashboard/people/employees/new
                    ↓                ↓
         Head Office Modal    Site Employee Form
         (4 Tabs)             /dashboard/people/directory/new
```

### Direct Buttons on Employees Page

**Add Head Office (Purple):** Opens AddExecutiveModal directly (bypasses choice screen). Transparent background, purple border (#A855F7), briefcase icon.

**Add Site Employee (Pink):** Navigates to choice screen. Transparent background, magenta border (#EC4899), plus icon.

## Head Office / Executive Form (AddExecutiveModal)

**Tab 1: Personal** - Full Name*, Email*, Phone, DOB, Address

**Tab 2: Employment** - Role\* (CEO, COO, CFO, HR Manager, etc.), Position Title, Department, Start Date, Contract Type, Salary, Pay Frequency

**Tab 3: Compliance** - NI Number, Right to Work Status, RTW Document Type, RTW Expiry Date

**Tab 4: Banking** - Bank Name, Account Holder, Sort Code, Account Number

**Key Behaviors:**

- Sets `site_id = NULL` and `home_site = NULL` automatically
- Status initially set to "onboarding"

## Site Employee Form

**Route:** `/dashboard/people/directory/new` (full page form)

**Required:** Full Name, Email, Site Assignment, Role (Staff/Manager)

**Optional:** Phone, Position title, Section (BOH/FOH), Training certificates, Contracted hours, Start date, Employment type

## Comparison

| Feature           | Head Office      | Site Employee |
| ----------------- | ---------------- | ------------- |
| Form Type         | Modal (4 tabs)   | Full page     |
| Site Assignment   | None (auto NULL) | Required      |
| Role Options      | Executive roles  | All roles     |
| Training Certs    | Add later        | Full tracking |
| Section (BOH/FOH) | N/A              | Available     |
| Org Chart         | By role category | Under site    |

## User Journeys

### Adding a CEO

1. Employees → "Add Head Office" button → Modal opens
2. Fill Personal + Employment tabs (Role: CEO)
3. Complete Compliance & Banking → "Add Employee"

### Adding a Site Manager

1. Sidebar → "Add Employee" → Choice screen
2. Click "Site Employee" → Full form
3. Fill all fields (Name, Email, Site, Role, Training) → Save

### Adding a Regional Manager

1. "Add Employee" → Choice screen → "Head Office/Executive"
2. Fill tabs (Role: Regional Manager) → "Add Employee"
3. Go to People → Settings → Areas & Regions → Assign to region

## Technical Files

| File                                              | Purpose                           |
| ------------------------------------------------- | --------------------------------- |
| `src/app/dashboard/people/employees/new/page.tsx` | Choice screen                     |
| `src/components/users/AddExecutiveModal.tsx`      | Executive modal (4 tabs)          |
| `src/app/dashboard/people/employees/page.tsx`     | Employee list with action buttons |
| `src/app/dashboard/people/directory/new/page.tsx` | Full site employee form           |

## Common Questions

**Can I change someone from site to head office later?**
Yes - edit their profile, change role, and set site to "Head Office (No Site)".

**What if an executive also manages a site?**
Choose primary role. Use Head Office path for executives; assign site management separately.

**Can head office staff have training certificates?**
Yes - add them via Head Office path, then edit profile to add training.

**Which path for an Area Manager?**
Head Office - they manage multiple sites, not tied to one.
