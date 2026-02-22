# Site Assignment & Employee Movement

## Overview

The Teamly module provides flexible site assignment for different organizational structures, plus seamless employee movement between sites and head office.

## Organizational Structure

### Supported Models

**3-Tier (Large business):** Region → Area → Site

```
Region: North England
  └── Area: Greater Manchester
      ├── Manchester City Centre
      └── Manchester Trafford
```

**2-Tier (Medium business):** Region → Site (no areas)

```
Region: Midlands
  ├── Birmingham Store
  └── Coventry Store
```

**Mixed:** Some regions with areas, others flat.

### Creating the Hierarchy

**Navigate to:** People → Settings → Areas & Regions

1. **Create a Region** - Click "Add Region", enter name, optionally assign Regional Manager
2. **Add Areas (optional)** - Click "Add Area" on a region card, enter name, optionally assign Area Manager
3. **Assign Sites:**
   - To an area: Click "+ Sites" next to the area, select sites
   - Directly to region: Click "Assign Sites" on region card (sites appear in purple box)

### Visual Indicators

- **Regions:** Blue MapPin icon
- **Areas:** Green Building2 icon
- **Sites in Areas:** Listed under their area
- **Sites in Regions (no area):** Purple background box

### Reassigning Sites

Sites can be reassigned anytime. Select sites and assign to a different area or region. Database updates `area_id` accordingly (`NULL` = directly under region).

## Moving Employees

### Site Assignment Dropdown

```
🏢 Head Office (No Site)     ← Special option (sets site_id = NULL)
─────────────────────────
London Bridge
Manchester Central
St Kaths
... (all sites alphabetically)
```

### Moving from Site to Head Office

1. Find employee → expand their card
2. Change "App Role" to executive role (Area Manager, HR Manager, etc.)
3. Set "Site Assignment" to **"🏢 Head Office (No Site)"**
4. Save → `site_id` and `home_site` become NULL

### Moving from Head Office to Site

1. Find employee → expand their card
2. Change "App Role" to site role (Manager, Staff)
3. Set "Site Assignment" to target site
4. Save → `site_id` and `home_site` set to selected site

### Moving Between Sites

1. Find employee → change "Site Assignment" dropdown to new site → Save

### Org Chart Placement

**Head Office (site_id = NULL):**

- Executive Leadership: CEO, COO, CFO
- Management: Regional/Area/HR/Operations Manager
- Head Office Staff: Admin without site

**Site-Based (site_id = UUID):**

- Under assigned site, ordered by role (Manager, Staff, Admin)

## Common Workflows

### Promote Site Manager to Area Manager

```
1. Change Role: Manager → Area Manager
2. Change Site: [Current Site] → 🏢 Head Office (No Site)
3. Save
→ Appears in "Area Managers" section, removed from site
```

### Transfer Staff Between Sites

```
1. Change Site: London Bridge → St Kaths
2. Save
→ Moves to new site, role unchanged
```

## Database Schema

```sql
-- Regions
regions: id, name, regional_manager_id, company_id

-- Areas
areas: id, name, region_id, area_manager_id, company_id

-- Sites
sites: id, name, area_id (nullable), manager_id, company_id

-- Profiles (employee movement)
profiles: id, company_id, site_id (NULL=head office), home_site (synced with site_id), app_role
```

**Auto-sync logic:** When site changes, both `site_id` and `home_site` update together.

## Troubleshooting

**Sites not showing:** Ensure sites exist and belong to your company. Refresh the page.

**Employee not moving:** Check browser console for errors. Verify you have edit permissions. Try hard refresh.

**Org chart not updating:** Hard refresh (Ctrl+Shift+R). Check employee status is Active.

**Manager not appearing:** Must have appropriate role and belong to same company. Check full_name is set.
