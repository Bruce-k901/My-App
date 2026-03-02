# Organizational Chart Guide

## Overview

The Organizational Chart provides a complete, hierarchical view of your entire company structure, from executive leadership down to individual employees at each location.

## Structure Hierarchy

### 1. **Executive Leadership** (Top Level)

The org chart displays all C-suite and department heads at the company level:

- **CEO / Owner**: Company ownership and chief executive
- **Managing Director (MD)**: Day-to-day operational leadership
- **Chief Operating Officer (COO)**: Operations oversight
- **Chief Financial Officer (CFO)**: Financial management
- **HR Manager**: Human resources management
- **Operations Manager**: Operational management
- **Finance Manager**: Finance department management
- **Regional Managers**: Regional oversight (shown separately)
- **Area Managers**: Area-level management (shown separately)

### 2. **Head Office Staff**

Employees not assigned to specific sites but working at head office level.

### 3. **Regional Structure**

The geographical hierarchy for multi-site operations:

```
Company
├── Executive Leadership
│   ├── CEO / Owner
│   ├── Managing Director
│   ├── COO
│   ├── CFO
│   ├── HR Manager
│   ├── Operations Manager
│   └── Finance Manager
├── Head Office Staff
└── Regional Structure
    └── Region
        ├── Regional Manager
        └── Areas
            ├── Area Manager
            └── Sites
                ├── Site Manager
                └── Employees
```

## Features

### Expandable/Collapsible Sections

Click on any section to expand or collapse it:

- Executive departments
- Regions
- Areas
- Sites
- Employee lists

### Color-Coded Hierarchy

- **Purple/Pink Gradient**: Executive Leadership
- **Blue**: Regions and Regional Managers
- **Green**: Areas and Area Managers
- **Purple**: Sites and Site-level employees
- **Neutral**: Head Office and general staff

### Employee Information Display

Each employee card shows:

- Full name
- Role/Position
- Email address
- Site assignment (if applicable)

### Quick Statistics

At each level, you can see:

- Number of people in department
- Number of areas in region
- Number of sites in area
- Number of employees at site
- Total employee counts rolled up through hierarchy

## How to Read the Org Chart

### Executive Level

Starts with the company name and shows all leadership positions. Each executive role is grouped by function (CEO, Operations, Finance, HR, etc.).

### Regional Level

If your company has regions defined, they appear next showing:

- Region name
- Regional manager (if assigned)
- Number of areas
- Total employee count in region

### Area Level

Within each region, areas show:

- Area name
- Area manager (if assigned)
- Number of sites
- Total employee count in area

### Site Level

Individual locations showing:

- Site name
- Site manager (if assigned)
- Number of employees
- Full employee list (expandable)

### Unassigned Sites

Sites not grouped into areas appear separately at the bottom of the chart.

## Role-Based Filtering

The org chart automatically categorizes employees by their role:

| Role                   | Where They Appear                         |
| ---------------------- | ----------------------------------------- |
| Owner / CEO            | Executive Leadership → CEO/Owner          |
| Managing Director / MD | Executive Leadership → MD                 |
| COO                    | Executive Leadership → COO                |
| CFO                    | Executive Leadership → CFO                |
| HR Manager             | Executive Leadership → HR Manager         |
| Operations Manager     | Executive Leadership → Operations Manager |
| Finance Manager        | Executive Leadership → Finance Manager    |
| Regional Manager       | Regional Managers section                 |
| Area Manager           | Area Managers section                     |
| Manager                | As site manager at their assigned site    |
| Admin                  | Head Office Staff                         |
| Staff                  | Under their assigned site                 |

## Use Cases

### 1. **Onboarding New Employees**

Show new hires where they fit in the company structure and who their managers are.

### 2. **Chain of Command**

Clearly visualize reporting lines from site staff up through area, regional, and executive management.

### 3. **Resource Planning**

See employee distribution across sites, areas, and regions to identify imbalances.

### 4. **Communication Hierarchy**

Understand who to contact at each level for different types of issues or approvals.

### 5. **Organizational Planning**

Identify gaps in management coverage or over-staffing at certain levels.

## Setting Up Your Org Chart

### Step 1: Assign Employee Roles

1. Go to **People → Employees**
2. Edit each employee's profile
3. Assign appropriate role (CEO, Manager, Staff, etc.)

### Step 2: Create Regional Structure

1. Go to **Settings → Areas & Regions**
2. Create regions (if applicable)
3. Create areas within regions (if applicable)
4. Assign regional and area managers

### Step 3: Assign Sites

1. In **Settings → Areas & Regions**
2. Assign sites to areas or directly to regions
3. Ensure each site has a manager assigned

### Step 4: Assign Employees to Sites

1. Go to **People → Employees**
2. Edit each employee
3. Assign them to their primary site

### Step 5: Designate Executives

For C-suite and department heads:

1. Go to **People → Employees**
2. Edit the employee profile
3. Change role to appropriate executive role:
   - Owner / CEO
   - Managing Director
   - COO
   - CFO
   - HR Manager
   - Operations Manager
   - Finance Manager

## Best Practices

### 1. **Keep Roles Current**

Regularly update employee roles when promotions or changes occur.

### 2. **Assign Managers**

Always assign managers at each level:

- Site managers for sites
- Area managers for areas
- Regional managers for regions

### 3. **Site Assignment**

Ensure every employee (except head office and executives) is assigned to a site.

### 4. **Head Office Staff**

Employees working at head office should have their role set appropriately but no site assignment.

### 5. **Single Point of Truth**

The org chart reflects the employee database. Update employee profiles to update the chart.

## Common Scenarios

### Scenario 1: Small Business (No Regions/Areas)

```
Company
├── Owner
├── Manager (Site A)
│   └── 5 Staff members
└── Manager (Site B)
    └── 3 Staff members
```

### Scenario 2: Medium Business (Regions Only)

```
Company
├── CEO
├── Operations Manager
├── Region: North
│   ├── Site: Manchester
│   ├── Site: Leeds
│   └── Site: Liverpool
└── Region: South
    ├── Site: London
    └── Site: Brighton
```

### Scenario 3: Large Enterprise (Full Hierarchy)

```
Company
├── CEO
├── COO
├── CFO
├── HR Manager
├── Operations Manager
├── Finance Manager
├── Region: UK North
│   ├── Regional Manager: John Smith
│   ├── Area: Greater Manchester
│   │   ├── Area Manager: Jane Doe
│   │   ├── Site: Manchester Central (15 employees)
│   │   └── Site: Manchester Airport (10 employees)
│   └── Area: Yorkshire
│       ├── Area Manager: Bob Jones
│       ├── Site: Leeds City (12 employees)
│       └── Site: Sheffield (8 employees)
└── Region: UK South
    ├── Regional Manager: Sarah Williams
    └── Area: London
        ├── Area Manager: Mike Brown
        ├── Site: London West End (20 employees)
        └── Site: London Canary Wharf (18 employees)
```

## Troubleshooting

### Issue: Employee Not Showing

**Solution**:

- Check employee has `company_id` set
- Verify employee is active (not archived)
- Ensure role is correctly assigned

### Issue: Site Shows Zero Employees

**Solution**:

- Check employees are assigned to the site in their profile
- Verify site belongs to correct company
- Refresh the page

### Issue: Manager Not Showing

**Solution**:

- Ensure manager role is set (Manager, Area Manager, Regional Manager)
- Check manager is assigned to correct region/area/site
- Verify manager profile is complete

### Issue: Executive Not in Leadership Section

**Solution**:

- Change employee role to executive role (CEO, COO, CFO, etc.)
- Remove site assignment if they're head office based
- Refresh org chart

## Integration with Other Features

### Approval Workflows

The org chart hierarchy determines approval chains:

- Site Manager → Area Manager → Regional Manager → Executive

### Reporting

Use org chart structure to generate reports by:

- Region
- Area
- Site
- Department

### Access Control

Role-based permissions follow org chart hierarchy.

## Tips for Large Organizations

1. **Expand Only What You Need**: Keep sections collapsed to maintain overview
2. **Use Search**: Browser Ctrl+F to find specific employees
3. **Regular Audits**: Review quarterly to ensure accuracy
4. **Manager Updates**: Notify managers when their team changes
5. **Print Views**: Screenshot collapsed view for presentations

## Future Enhancements

Planned features:

- Print/export org chart
- Drag-and-drop reorganization
- Search functionality
- Filter by role, location, department
- Employee photos
- Direct contact links
- Reporting line highlights
- Vacancy markers
- Historical view (see past structures)
