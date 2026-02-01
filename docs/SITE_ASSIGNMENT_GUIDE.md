# Site Assignment Guide

## Overview

The Areas & Regions management system now supports flexible site assignment to accommodate different business structures:

- **Large businesses**: Region → Area → Site (3-tier hierarchy)
- **Medium businesses**: Region → Site (2-tier hierarchy, no areas)
- **Mixed approach**: Some regions with areas, others with direct site assignment

## Key Features

### 1. **Region Management**
Create and manage geographical regions with optional regional managers.

### 2. **Area Management** (Optional)
Add areas within regions for additional organizational layers. Perfect for large multi-site operations.

### 3. **Flexible Site Assignment**

#### Option A: Assign Sites to Areas
Best for: Large organizations with complex hierarchies
```
Region: North
  └── Area: Manchester
      ├── Site: Manchester Central
      ├── Site: Manchester North
      └── Site: Manchester East
  └── Area: Liverpool
      ├── Site: Liverpool Docks
      └── Site: Liverpool City
```

#### Option B: Assign Sites Directly to Regions
Best for: Smaller businesses or flat structures
```
Region: South
  ├── Site: Brighton Store
  ├── Site: Southampton Store
  └── Site: Portsmouth Store
```

## How to Use

### Creating the Hierarchy

1. **Create a Region**
   - Navigate to Settings → Areas & Regions
   - Click "Add Region"
   - Enter region name (e.g., "North Region")
   - Optionally assign a Regional Manager
   - Click "Create Region"

2. **Add Areas (Optional)**
   - Find the region card
   - Click "Add Area" button
   - Enter area name (e.g., "Manchester Area")
   - Optionally assign an Area Manager
   - Click "Create Area"

3. **Assign Sites**
   
   **Option A: Assign to Area**
   - Click the green "+ Sites" button next to the area
   - Select the area from dropdown
   - Check the sites you want to assign
   - Click "Assign Site(s)"
   
   **Option B: Assign to Region (No Area)**
   - Click "Assign Sites" button on the region card
   - Select sites to assign directly to region
   - Click "Assign Site(s)"

### Visual Indicators

- **Region Cards**: Blue icon (MapPin) with regional manager info
- **Area Cards**: Green icon (Building2) with area manager info
- **Sites in Areas**: Listed under their respective areas
- **Sites in Regions**: Purple background box shows sites directly under region (no area)
- **Site Icons**: Purple Building icon for all sites

### Reassigning Sites

Sites can be reassigned at any time:
1. Open the site assignment modal
2. Select sites (even if already assigned)
3. Assign to a different area or region
4. Previous assignments are automatically updated

### Employee Counts

The Org Chart page (`People → Employees → Org Chart`) shows:
- Number of areas per region
- Number of sites per area
- Number of employees per site
- Manager assignments at each level

## Database Schema

```sql
-- Regions Table
regions:
  - id (uuid)
  - name (text)
  - regional_manager_id (uuid, references profiles)
  - company_id (uuid)

-- Areas Table
areas:
  - id (uuid)
  - name (text)
  - region_id (uuid, references regions)
  - area_manager_id (uuid, references profiles)
  - company_id (uuid)

-- Sites Table (updated)
sites:
  - id (uuid)
  - name (text)
  - area_id (uuid, references areas) -- nullable for region-only assignment
  - manager_id (uuid, references profiles)
  - company_id (uuid)
```

## Business Structure Examples

### Example 1: National Restaurant Chain (Large)
```
Region: North England
  Area: Greater Manchester
    - Manchester City Centre
    - Manchester Trafford
    - Manchester Airport
  Area: Yorkshire
    - Leeds Central
    - Sheffield Downtown
    - York Historic

Region: South England
  Area: London
    - London Westminster
    - London Canary Wharf
    - London Shoreditch
  Area: South Coast
    - Brighton Marina
    - Southampton Docks
```

### Example 2: Regional Retail Chain (Medium)
```
Region: Midlands
  - Birmingham Store
  - Coventry Store
  - Leicester Store

Region: East
  - Norwich Store
  - Cambridge Store
  - Ipswich Store
```

### Example 3: Mixed Structure
```
Region: Scotland (with areas)
  Area: Central Belt
    - Glasgow Central
    - Edinburgh Princes St
  Area: Highlands
    - Inverness
    - Aberdeen

Region: Wales (flat structure)
  - Cardiff Bay
  - Swansea Marina
  - Newport Centre
```

## Manager Hierarchy

The system supports different manager roles at each level:

1. **Regional Manager**: Oversees entire region (all areas and sites within)
2. **Area Manager**: Manages specific area and its sites
3. **Site Manager**: Manages individual site and its staff

When assigning managers, the system shows their current role:
- Owner
- Admin
- Regional Manager
- Area Manager
- Manager

## Approval Workflows

(Coming soon) The approval hierarchy will leverage this structure:
- Site Manager prepares rota/payroll
- Area Manager reviews (if applicable)
- Regional Manager approves
- Admin/Owner final authority

## Tips & Best Practices

1. **Start with Regions**: Create regions first, then decide if you need areas
2. **Use Areas for Scale**: If a region has 5+ sites, consider using areas
3. **Consistent Naming**: Use clear, consistent naming conventions
4. **Manager Assignment**: Assign managers at appropriate levels for better oversight
5. **Review Structure**: Use the Org Chart page to visualize your complete structure
6. **Flexibility**: Mix and match - some regions can have areas, others can be flat

## Troubleshooting

### Sites Not Showing
- Ensure sites exist in the Sites management page
- Check that sites belong to your company
- Refresh the page after making changes

### Cannot Assign Sites
- Verify you have the appropriate role (Admin/Owner)
- Check that the region/area exists
- Ensure the site isn't in a different company

### Manager Not Appearing
- Manager must have appropriate role (Manager, Area Manager, Regional Manager, Admin, Owner)
- Manager must belong to the same company
- Check profile is complete with full_name

## Future Enhancements

Planned features:
- Drag-and-drop site reassignment
- Bulk region/area creation from CSV
- Approval workflow configuration per region
- Performance metrics by region/area
- Historical structure tracking

