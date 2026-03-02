# Employee Promotion & Transfer Workflows - Visual Guide

## Quick Reference: Site Assignment Options

```
┌─────────────────────────────────────────────┐
│  Site Assignment Dropdown                   │
├─────────────────────────────────────────────┤
│  🏢 Head Office (No Site)    ← Executives   │
│  ─────────────────────────                  │
│  Birmingham New Street       ← Your sites   │
│  London Bridge                              │
│  Manchester Central                         │
│  St Kaths                                   │
│  ...                                        │
└─────────────────────────────────────────────┘
```

## Scenario 1: Site Manager → Area Manager

### Before Promotion

```
┌────────────────────────────┐
│ Sarah Johnson              │
├────────────────────────────┤
│ Role: Manager              │
│ Site: St Kaths            │
│ Manages: St Kaths site     │
└────────────────────────────┘

Org Chart Placement:
└─ Regions
   └─ Central London
      └─ Area: Central
         └─ Site: St Kaths
            └─ 👤 Sarah Johnson (Manager)
               └─ 10 staff members
```

### Steps to Promote

```
1. Find Sarah in employee list
2. Expand her card
3. Changes to make:
   ┌──────────────────────────────┐
   │ App Role:                    │
   │ Manager → Area Manager ✓     │
   ├──────────────────────────────┤
   │ Site Assignment:             │
   │ St Kaths → 🏢 Head Office ✓  │
   ├──────────────────────────────┤
   │ Position Title:              │
   │ Site Manager → Area Manager ✓│
   └──────────────────────────────┘
4. Click Save
```

### After Promotion

```
┌────────────────────────────┐
│ Sarah Johnson              │
├────────────────────────────┤
│ Role: Area Manager         │
│ Site: Head Office          │
│ Manages: Central London    │
└────────────────────────────┘

Org Chart Placement:
└─ Head Office
   └─ Area Managers
      └─ 👤 Sarah Johnson
└─ Regions
   └─ Central London
      └─ Area: Central
         └─ Site: St Kaths
            └─ 👤 [New Manager Needed]
               └─ 10 staff members
```

## Scenario 2: Staff Transfer Between Sites

### Before Transfer

```
┌────────────────────────────┐
│ Tom Williams               │
├────────────────────────────┤
│ Role: Staff                │
│ Site: London Bridge        │
│ Section: BOH (Kitchen)     │
└────────────────────────────┘

Org Chart:
└─ Site: London Bridge
   └─ Staff (15)
      └─ 👤 Tom Williams (BOH)
```

### Transfer Steps

```
1. Find Tom in employee list
2. Expand his card
3. Change:
   ┌──────────────────────────────┐
   │ Site Assignment:             │
   │ London Bridge → St Kaths ✓   │
   └──────────────────────────────┘
4. Click Save
```

### After Transfer

```
┌────────────────────────────┐
│ Tom Williams               │
├────────────────────────────┤
│ Role: Staff                │
│ Site: St Kaths            │
│ Section: BOH (Kitchen)     │
└────────────────────────────┘

Org Chart:
└─ Site: London Bridge
   └─ Staff (14)  ← Tom removed
└─ Site: St Kaths
   └─ Staff (11)  ← Tom added
      └─ 👤 Tom Williams (BOH)
```

## Scenario 3: Regional Manager → Site Manager (Demotion/Change)

### Before Change

```
┌────────────────────────────┐
│ Emma Wilson                │
├────────────────────────────┤
│ Role: Regional Manager     │
│ Site: Head Office          │
│ Manages: Northern Region   │
└────────────────────────────┘

Org Chart:
└─ Head Office
   └─ Regional Managers
      └─ 👤 Emma Wilson
└─ Regions
   └─ Northern Region
      └─ 3 areas
         └─ 12 sites
```

### Change Steps

```
1. Find Emma in employee list
2. Expand her card
3. Changes:
   ┌──────────────────────────────┐
   │ App Role:                    │
   │ Regional Manager → Manager ✓ │
   ├──────────────────────────────┤
   │ Site Assignment:             │
   │ 🏢 Head Office →             │
   │ Manchester Central ✓         │
   ├──────────────────────────────┤
   │ Position Title:              │
   │ Regional Manager →           │
   │ Site Manager ✓               │
   └──────────────────────────────┘
4. Click Save
```

### After Change

```
┌────────────────────────────┐
│ Emma Wilson                │
├────────────────────────────┤
│ Role: Manager              │
│ Site: Manchester Central   │
│ Manages: This site only    │
└────────────────────────────┘

Org Chart:
└─ Head Office
   └─ Regional Managers
      └─ [Emma removed]
└─ Site: Manchester Central
   └─ 👤 Emma Wilson (Manager)
      └─ 8 staff members
```

## Scenario 4: New Executive Hire

### Initial State

```
┌────────────────────────────┐
│ David Chen                 │
├────────────────────────────┤
│ Role: HR Manager           │
│ Site: Not yet assigned     │
│ Status: Onboarding         │
└────────────────────────────┘
```

### Setup Steps

```
1. Add using "Head Office / Executive" modal
   OR
   Find David in employee list if already added

2. Ensure correct settings:
   ┌──────────────────────────────┐
   │ App Role: HR Manager ✓       │
   ├──────────────────────────────┤
   │ Site Assignment:             │
   │ 🏢 Head Office (No Site) ✓   │
   ├──────────────────────────────┤
   │ Status: ✅ Active ✓          │
   └──────────────────────────────┘
3. Save
```

### Final State

```
┌────────────────────────────┐
│ David Chen                 │
├────────────────────────────┤
│ Role: HR Manager           │
│ Site: Head Office          │
│ Status: Active             │
└────────────────────────────┘

Org Chart:
└─ Head Office
   └─ Management
      └─ 👤 David Chen (HR Manager)
```

## Role → Site Assignment Quick Guide

| Role Type           | Typical Site Assignment | Org Chart Section    |
| ------------------- | ----------------------- | -------------------- |
| CEO, COO, CFO       | 🏢 Head Office          | Executive Leadership |
| Managing Director   | 🏢 Head Office          | Executive Leadership |
| Regional Manager    | 🏢 Head Office          | Regional Managers    |
| Area Manager        | 🏢 Head Office          | Area Managers        |
| HR Manager          | 🏢 Head Office          | Management           |
| Operations Manager  | 🏢 Head Office          | Management           |
| Finance Manager     | 🏢 Head Office          | Management           |
| Site Manager        | Specific Site           | Under their site     |
| Staff               | Specific Site           | Under their site     |
| Admin (Head Office) | 🏢 Head Office          | Head Office Staff    |
| Admin (Site)        | Specific Site           | Under their site     |

## Common Mistakes to Avoid

### ❌ Wrong: Site Manager with No Site

```
Role: Manager
Site: 🏢 Head Office
Result: Appears in head office, can't manage a site
```

**Fix:** Assign them to a specific site

### ❌ Wrong: Area Manager Assigned to Site

```
Role: Area Manager
Site: St Kaths
Result: Appears under St Kaths, can't manage area
```

**Fix:** Change site to 🏢 Head Office

### ❌ Wrong: Staff with No Site

```
Role: Staff
Site: 🏢 Head Office
Result: Confusing - staff need a work location
```

**Fix:** Assign them to their actual site

### ✅ Correct Combinations

```
✓ CEO + Head Office
✓ Regional Manager + Head Office
✓ Area Manager + Head Office
✓ Site Manager + Specific Site
✓ Staff + Specific Site
✓ HR Manager + Head Office
```

## Verification Flowchart

```
After making changes:
┌─────────────────────┐
│ Click Save          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Go to Org Chart     │
└──────────┬──────────┘
           │
           ▼
     ┌─────┴─────┐
     │ Can you   │
     │ find the  │─── NO ──→ Check site_id in database
     │ employee? │           Run verification SQL
     └─────┬─────┘
           │ YES
           ▼
     ┌─────┴──────┐
     │ In correct │
     │ section?   │─── NO ──→ Check role matches site
     └─────┬──────┘           assignment
           │ YES
           ▼
     ┌─────┴──────┐
     │ Correct    │
     │ badge?     │─── NO ──→ Check status field
     └─────┬──────┘
           │ YES
           ▼
     ┌─────┴──────┐
     │ ✅ Success! │
     └────────────┘
```

## Summary Cheat Sheet

### Moving TO Head Office:

1. Change role to executive/management
2. Select "🏢 Head Office (No Site)"
3. Save
4. Appears in head office section

### Moving TO Site:

1. Change role to site-based (if needed)
2. Select the target site
3. Save
4. Appears under that site

### Transferring Between Sites:

1. Keep same role
2. Select new site
3. Save
4. Appears under new site

**Key Point:** The "🏢 Head Office (No Site)" option at the top of the dropdown is your gateway to moving people to head office! 🎯
