# Dual Employee Add System

## Overview

The employee management system now has **two separate ways** to add employees, optimized for different types of staff:

1. **Add Head Office / Executive** - Streamlined for leadership and non-site based staff
2. **Add Site Employee** - Full-featured for site-based operational staff

## Why Two Options?

### Different Needs for Different Roles

**Head Office & Executives:**
- Don't need site assignments
- Don't need sections (BOH/FOH)
- Don't need training certificates initially
- Focus on role and position title
- Appear in org chart by role category

**Site Employees:**
- Must be assigned to a site
- Need section assignment (BOH/FOH)
- Require training certificates
- Need detailed operational info
- Appear in org chart under their site

## The Two Buttons

### Location
Navigate to: **People → Employees**

You'll see two buttons in the top right:

```
┌─────────────────┐  ┌─────────────────┐
│ Add Head Office │  │ Add Site Employee│
│   (Purple)      │  │    (Pink/Blue)   │
└─────────────────┘  └─────────────────┘
```

## 1. Add Head Office / Executive

### When to Use
- CEO, COO, CFO, and other C-suite
- Department heads (HR Manager, Operations Manager, Finance Manager)
- Regional and Area Managers
- Head office administrators
- Any staff not based at a specific site

### What It Asks For
**Required:**
- ✅ Full Name
- ✅ Email Address
- ✅ Role (CEO, COO, CFO, HR Manager, etc.)

**Optional:**
- Phone Number
- Position Title (formal job title)

### What It Doesn't Ask For
- ❌ Site assignment (automatically set to none)
- ❌ Section (BOH/FOH)
- ❌ Training certificates
- ❌ PIN code
- ❌ Contracted hours

### Features
- **Clean, simple form** - Only essential fields
- **Role-focused** - Emphasizes organizational role
- **Org chart integration** - Automatically appears in correct section
- **Fast entry** - Minimal fields for quick setup

### Example: Adding a CEO

1. Click **"Add Head Office"** button
2. Fill in:
   - Full Name: "Jennifer Anderson"
   - Email: "jennifer@company.com"
   - Phone: "+44 20 1234 5678" (optional)
   - Role: **"CEO"**
   - Position Title: "Chief Executive Officer" (optional)
3. Click **"Add Employee"**
4. Done! Jennifer appears in org chart under "CEO / Owner"

## 2. Add Site Employee

### When to Use
- Site managers
- Kitchen staff
- Front of house staff
- Operational staff at specific locations
- Anyone who works at a physical site

### What It Asks For
**Required:**
- ✅ Full Name
- ✅ Email
- ✅ Site Assignment
- ✅ Role (Staff, Manager)

**Optional but Recommended:**
- Phone number
- Position title
- Section (BOH/FOH)
- Training certificates
- Contracted hours
- Start date
- Employment type

### Features
- **Comprehensive form** - All operational details
- **Training tracking** - Food safety, H&S, fire marshal, first aid, COSSH
- **Site-based** - Must select a site
- **Section assignment** - BOH (Back of House) or FOH (Front of House)
- **Full employee lifecycle** - Onboarding, probation, etc.

### Example: Adding a Site Manager

1. Click **"Add Site Employee"** button
2. Navigate to the new employee form page
3. Fill in all required details including site
4. Add training certificates
5. Save

## Comparison Table

| Feature | Head Office | Site Employee |
|---------|-------------|---------------|
| **Form Type** | Modal (popup) | Full page |
| **Site Assignment** | None (automatic) | Required |
| **Role Options** | Executive roles | All roles |
| **Training Certs** | Not asked | Full tracking |
| **Section (BOH/FOH)** | Not asked | Available |
| **PIN Code** | Not asked | Available |
| **Complexity** | Simple (5 fields) | Comprehensive (20+ fields) |
| **Best For** | Leadership | Operations |
| **Org Chart** | By role category | Under site |

## Workflow Examples

### Scenario 1: New C-Suite Executive

**Goal:** Add new CFO who works from head office

**Steps:**
1. People → Employees
2. Click **"Add Head Office"**
3. Name: "Michael Chen"
4. Email: "michael@company.com"
5. Role: **"CFO"**
6. Position: "Chief Financial Officer"
7. Click "Add Employee"
8. ✅ Done in 30 seconds!

**Result:** Michael appears in org chart under "Executive Leadership → CFO"

### Scenario 2: New Restaurant Manager

**Goal:** Add manager for Manchester site

**Steps:**
1. People → Employees
2. Click **"Add Site Employee"**
3. Fill comprehensive form:
   - Name: "Sarah Wilson"
   - Email: "sarah@company.com"
   - Site: "Manchester Central"
   - Role: "Manager"
   - Section: "FOH"
   - Training certificates
   - Start date, etc.
4. Save
5. ✅ Complete profile created

**Result:** Sarah appears in org chart under Manchester Central site

### Scenario 3: Regional Manager

**Goal:** Add Regional Manager for North region

**Steps:**
1. People → Employees
2. Click **"Add Head Office"** (they're not site-based)
3. Name: "Tom Brown"
4. Email: "tom@company.com"
5. Role: **"Regional Manager"**
6. Click "Add Employee"
7. Go to Settings → Areas & Regions
8. Edit "North Region"
9. Assign Tom as Regional Manager
10. ✅ Tom now manages the region!

**Result:** Tom appears in org chart under "Regional Managers" section

## Best Practices

### 1. Choose the Right Button
- **Head Office button** = No site, leadership/admin
- **Site Employee button** = Works at a location

### 2. For Promotions
If promoting site staff to head office:
1. Edit their existing profile
2. Change role to executive role
3. **Remove site assignment**
4. They'll move to appropriate org chart section

### 3. For Regional/Area Managers
1. Add via **Head Office** button
2. Use role "Regional Manager" or "Area Manager"
3. Then assign them in Settings → Areas & Regions

### 4. For Site Managers
1. Add via **Site Employee** button
2. Use role "Manager"
3. **Must** assign to their site
4. They appear under that site in org chart

## Common Questions

### Q: Can I change someone from site to head office later?
**A:** Yes! Edit their profile, change role to executive role, and remove site assignment.

### Q: What if an executive also manages a site?
**A:** Choose their primary role. If they're mainly executive, use Head Office button and assign them as site manager separately in Settings.

### Q: Can head office staff have training certificates?
**A:** Yes! After adding them via Head Office button, edit their profile to add training details.

### Q: Why can't I select a site in the Head Office modal?
**A:** By design! Head office staff aren't site-based. If they need a site, use the Site Employee button instead.

### Q: Which button for an Area Manager?
**A:** **Head Office** button. Area Managers aren't tied to one site - they manage multiple sites within an area.

### Q: Can I add training certificates later?
**A:** Yes! Edit any employee profile to add/update training certificates at any time.

## Tips

1. **Start with executives** - Use Head Office button to quickly add leadership team
2. **Bulk site staff** - Use Site Employee for operational staff with full details
3. **Review org chart** - After adding people, check org chart to ensure they appear correctly
4. **Update roles** - As people get promoted, update their roles and site assignments
5. **Keep it simple** - Don't overthink it - you can always edit later!

## Technical Notes

### Head Office Modal
- Component: `AddExecutiveModal.tsx`
- Fields: 5 required + optional
- No site_id (set to null)
- Optimized for speed
- Purple/pink gradient button

### Site Employee Form
- Full page form
- Component: Employee new page
- Fields: 20+ comprehensive
- Requires site_id
- Full training tracking
- Pink/blue gradient button

## Future Enhancements

Planned improvements:
- Bulk import for head office staff
- Templates for common executive roles
- Auto-assignment of regional/area managers
- Integration with approval workflows
- Org chart direct add buttons

