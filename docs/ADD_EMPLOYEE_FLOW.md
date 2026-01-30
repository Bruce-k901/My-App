# Add Employee Flow - Complete Guide

## Overview

The system now has a unified flow for adding employees with a choice screen that appears first, allowing users to select the appropriate form for their needs.

## Visual Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    ANY ENTRY POINT                          │
├─────────────────────────────────────────────────────────────┤
│  • Sidebar → "Add Employee"                                 │
│  • People Dashboard → "Add Employee" quick action           │
│  • Employees Page → "Add Site Employee" button              │
│  • Employees Page → "Add Head Office" button (direct)       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              CHOICE SCREEN (NEW!)                           │
│         /dashboard/people/employees/new                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐       │
│  │  Head Office/Exec    │  │   Site Employee      │       │
│  │  (Purple Card)       │  │   (Pink Card)        │       │
│  │                      │  │                      │       │
│  │  • Quick setup       │  │  • Full profile      │       │
│  │  • No site needed    │  │  • Site required     │       │
│  │  • Org chart ready   │  │  • Training certs    │       │
│  │                      │  │                      │       │
│  │  [Click to open      │  │  [Click to go to     │       │
│  │   modal]             │  │   full form]         │       │
│  └──────────────────────┘  └──────────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
              ↓                           ↓
    ┌─────────────────┐         ┌──────────────────┐
    │ Executive Modal │         │ Full Form Page   │
    │ (Popup)         │         │ (New Page)       │
    │                 │         │                  │
    │ 5 fields        │         │ 20+ fields       │
    │ Quick entry     │         │ Comprehensive    │
    └─────────────────┘         └──────────────────┘
```

## Entry Points

### 1. Sidebar Navigation
**Location:** Left sidebar → People → Employees → "Add Employee"

**What happens:**
1. Click "Add Employee"
2. Goes to `/dashboard/people/employees/new`
3. Shows choice screen
4. Select Head Office or Site Employee

### 2. People Dashboard Quick Action
**Location:** Dashboard → People → "Add Employee" card

**What happens:**
1. Click "Add Employee" quick action
2. Goes to `/dashboard/people/employees/new`
3. Shows choice screen
4. Select Head Office or Site Employee

### 3. Employees Page - Add Head Office Button
**Location:** People → Employees → Top right → "Add Head Office" button

**What happens:**
1. Click "Add Head Office" (purple border button)
2. **Directly opens** Executive Modal (no choice screen)
3. Fill in 5 fields
4. Save and done!

**Note:** This is a shortcut for experienced users who know they want to add head office staff.

### 4. Employees Page - Add Site Employee Button
**Location:** People → Employees → Top right → "Add Site Employee" button

**What happens:**
1. Click "Add Site Employee" (pink border button)
2. Goes to `/dashboard/people/employees/new`
3. Shows choice screen
4. Select option (or click Site Employee card)

## The Choice Screen

### Design
- **Full page** with centered content
- **Two large cards** side by side
- **Back button** at top left
- **Help section** at bottom

### Head Office / Executive Card (Left)
**Visual:**
- Purple/pink gradient background
- Briefcase icon
- Hover effect: glowing purple border

**Content:**
- Title: "Head Office / Executive"
- Description: "Streamlined form for leadership and non-site based staff"
- Features:
  - ✓ Quick setup - only essential fields
  - ✓ No site assignment needed
  - ✓ Appears in org chart by role
- Best for tags: CEO, COO, CFO, HR Manager, Regional Manager

**Action:**
- Opens modal popup
- 5 fields to fill
- Quick save

### Site Employee Card (Right)
**Visual:**
- Pink/blue gradient background
- Building icon
- Hover effect: glowing pink border

**Content:**
- Title: "Site Employee"
- Description: "Comprehensive form for site-based operational staff"
- Features:
  - ✓ Complete employee profile
  - ✓ Site assignment & sections (BOH/FOH)
  - ✓ Training certificates & compliance
- Best for tags: Site Manager, Kitchen Staff, FOH Staff, Operations

**Action:**
- Goes to full form page
- 20+ fields to fill
- Comprehensive setup

### Help Section
**Visual:**
- Blue info box
- User icon
- Clear bullet points

**Content:**
- "Not sure which to choose?"
- Explanation of each option
- Tip about editing later

## Button Styling (Employees Page)

### Current UX Pattern
Both buttons now match the app's standard button style:

**Add Head Office Button:**
```
Background: Transparent
Border: 1px solid purple (#A855F7)
Text: Purple (#A855F7)
Hover: Purple glow shadow
Icon: Briefcase (purple)
```

**Add Site Employee Button:**
```
Background: Transparent
Border: 1px solid magenta (#EC4899)
Text: Magenta (#EC4899)
Hover: Magenta glow shadow
Icon: Plus (magenta)
```

**Export Button (for reference):**
```
Background: Neutral gray (#262626)
Text: White
Hover: Darker gray
Icon: Download
```

## User Journeys

### Journey 1: Adding a CEO (Fast Path)

**Experienced User:**
1. People → Employees
2. Click **"Add Head Office"** (purple button)
3. Modal opens immediately
4. Fill: Name, Email, Role: "CEO"
5. Click "Add Employee"
6. ✅ Done in 30 seconds!

**New User:**
1. Sidebar → "Add Employee"
2. See choice screen
3. Read descriptions
4. Click "Head Office / Executive" card
5. Modal opens
6. Fill: Name, Email, Role: "CEO"
7. Click "Add Employee"
8. ✅ Done!

### Journey 2: Adding a Site Manager

**Any User:**
1. Sidebar → "Add Employee" OR People → Employees → "Add Site Employee"
2. See choice screen (or auto-select)
3. Click "Site Employee" card
4. Full form page opens
5. Fill all fields: Name, Email, Site, Role, Training, etc.
6. Click "Save"
7. ✅ Complete profile created!

### Journey 3: Adding Regional Manager

**Steps:**
1. Sidebar → "Add Employee"
2. Choice screen appears
3. Click "Head Office / Executive" (they're not site-based)
4. Modal opens
5. Fill: Name, Email, Role: "Regional Manager"
6. Click "Add Employee"
7. Go to Settings → Areas & Regions
8. Edit region and assign the manager
9. ✅ Manager now appears in org chart!

## Technical Implementation

### Files Modified

1. **`src/app/dashboard/people/employees/new/page.tsx`**
   - Changed from redirect to choice screen
   - Two large cards with hover effects
   - Help section
   - Integrates AddExecutiveModal

2. **`src/app/dashboard/people/employees/page.tsx`**
   - Updated button styling to match app UX
   - Purple border for Head Office button
   - Pink border for Site Employee button
   - Both have glow hover effects

3. **`src/components/users/AddExecutiveModal.tsx`**
   - New streamlined modal
   - 5 fields only
   - Executive role options
   - Clean, fast UX

### Routes

- `/dashboard/people/employees/new` → Choice screen
- `/dashboard/people/directory/new` → Full site employee form
- `/dashboard/people/employees` → Employee list (with both buttons)

### Components

- `AddExecutiveModal` → Popup modal for head office
- Choice screen → Built into page component
- Full form → Existing comprehensive form

## Best Practices

### For Users

1. **Know your employee type:**
   - Works at a site? → Site Employee
   - Head office/executive? → Head Office

2. **Use shortcuts:**
   - Experienced? Click direct buttons on Employees page
   - New? Use sidebar and see choice screen

3. **Don't overthink:**
   - You can always edit later
   - Choice screen has helpful descriptions

### For Admins

1. **Train your team:**
   - Show them the choice screen
   - Explain the difference
   - Demonstrate both flows

2. **Set expectations:**
   - Head office = quick (30 seconds)
   - Site employee = thorough (5 minutes)

3. **Review regularly:**
   - Check org chart monthly
   - Ensure people are in correct categories
   - Update roles as needed

## Troubleshooting

### Issue: Can't find Add Employee button
**Solution:** 
- Check sidebar → People → Employees → "Add Employee"
- Or go to People → Employees page → top right buttons

### Issue: Choice screen not showing
**Solution:**
- Hard refresh browser (Ctrl+Shift+R)
- Clear cache
- Restart dev server

### Issue: Modal not opening
**Solution:**
- Check browser console for errors
- Ensure company_id is set
- Try from different entry point

### Issue: Wrong form opened
**Solution:**
- Choice screen always shows both options
- Direct buttons bypass choice screen (intended)
- Use sidebar link to always see choice screen

## Future Enhancements

Planned improvements:
- Remember user's last choice
- Quick add from org chart
- Bulk import for both types
- Templates for common roles
- Keyboard shortcuts

