-- ============================================================================
-- KNOWLEDGE BASE SEED DATA: EXPANDED FEATURES
-- ============================================================================
-- Additional help content for Assets, PPM, Incidents, Callouts, and more
-- ============================================================================

BEGIN;

-- ============================================================================
-- APP HELP - ASSETS & PPM MANAGEMENT
-- ============================================================================

INSERT INTO public.knowledge_base (title, content, summary, category, subcategory, tags, source) VALUES

('Understanding Assets in Checkly',
$$Assets are equipment, appliances, and infrastructure items that need tracking and maintenance.

ASSET TYPES:
- Equipment: Fridges, freezers, ovens, fryers, grills
- Appliances: PAT testing items, electrical equipment
- Vehicles: Company vehicles, delivery vans
- Infrastructure: Building systems, utilities

ASSET INFORMATION STORED:
- Make, model, serial number
- Purchase date, warranty period
- Assigned site and location
- Working temperature ranges (for temperature-controlled equipment)
- Contractor assigned for maintenance
- Status (active, inactive, decommissioned)

WHERE TO FIND ASSETS:
- Dashboard > Assets: Main asset list and management
- Asset details show: Specifications, maintenance history, callouts, temperature logs

WHY ASSETS MATTER:
- Track warranty periods
- Schedule preventive maintenance (PPM)
- Monitor equipment health
- Link tasks to specific equipment
- Track repair history for compliance$$,
'Assets track equipment, appliances, and infrastructure. Store specifications, maintenance schedules, and link to tasks.',
'app_help', 'assets',
ARRAY['assets', 'equipment', 'fridge', 'appliances', 'tracking', 'how to'],
'Checkly Documentation'),

('PPM (Planned Preventive Maintenance) Schedules',
$$PPM schedules ensure equipment is maintained regularly to prevent breakdowns.

WHAT IS PPM:
- Regular maintenance checks scheduled in advance
- Prevents equipment failure and extends lifespan
- Ensures compliance with health & safety regulations
- Can trigger contractor callouts automatically

SETTING UP PPM:
1. Go to Assets > Select an asset
2. Add or edit PPM schedule
3. Set frequency (weekly, monthly, quarterly, annually)
4. Assign contractor
5. System automatically creates maintenance tasks

PPM TYPES:
- Reactive: Fix after failure (not recommended)
- Preventive: Scheduled maintenance (recommended)
- Warranty: Covered by manufacturer warranty

WHEN PPM TRIGGERS:
- System creates a maintenance task at scheduled interval
- Contractor receives notification
- Task appears in Today's Tasks for assigned staff
- Can be automatically linked to callout system

BENEFITS:
- Fewer breakdowns and callouts
- Lower repair costs
- Equipment lasts longer
- Compliance evidence for audits
- Temperature equipment stays in range$$,
'PPM schedules regular maintenance. Set frequency and contractor, system auto-creates tasks and can trigger callouts.',
'app_help', 'ppm',
ARRAY['ppm', 'maintenance', 'schedule', 'preventive', 'contractor', 'planned maintenance'],
'Checkly Documentation'),

('Creating a Contractor Callout',
$$Callouts request contractor assistance for equipment repairs or maintenance.

WHEN TO CREATE A CALLOUT:
- Equipment breakdown (reactive callout)
- Scheduled PPM maintenance (preventive callout)
- Warranty service (warranty callout)
- Temperature equipment out of range
- Task completion failure triggers automatic callout

HOW TO CREATE:
1. Go to Assets > Select asset > "New Callout"
2. OR complete a task that fails and triggers auto-callout
3. OR go to Assets > Callout Logs > "New Callout"

CALLOUT TYPES:
- REACTIVE: Equipment has broken, needs repair
- PPM: Scheduled maintenance (from PPM schedule)
- WARRANTY: Covered by manufacturer warranty

REQUIRED INFORMATION:
- Asset: Which piece of equipment
- Fault description: What's wrong (not needed for PPM)
- Priority: Low, Medium, Urgent
- Contractor: Who should handle it
- Photos: Evidence of the issue

CALLOUT STATUSES:
- OPEN: Just created, waiting for contractor
- CLOSED: Repaired and completed
- REOPENED: Issue recurred after closure

TROUBLESHOOTING STEP:
- Before creating callout, complete troubleshooting checklist
- Documents what was tried before calling contractor
- Helps contractor understand the issue better$$,
'Create callouts for equipment repairs. Choose type, priority, contractor. Auto-triggered by task failures or PPM schedules.',
'app_help', 'callouts',
ARRAY['callout', 'contractor', 'repair', 'breakdown', 'maintenance', 'how to create'],
'Checkly Documentation'),

-- ============================================================================
-- APP HELP - INCIDENTS
-- ============================================================================

('Reporting an Incident in Checkly',
$$Incidents are accidents, near-misses, or events that need to be recorded for compliance.

TYPES OF INCIDENTS:
- Staff Sickness: Employee illness while at work
- Customer Complaints: Guest complaints or dissatisfaction
- Food Poisoning: Suspected or confirmed foodborne illness
- Accidents: Workplace injuries or near-misses
- General Incidents: Other reportable events

HOW TO REPORT:
1. Go to Dashboard > Incidents (or Quick Actions > "Log Incident")
2. Select incident type
3. Fill in required details:
   - Date and time
   - Location (site, area)
   - Description of what happened
   - People involved
   - Witnesses
   - Actions taken
   - Photos/evidence
4. Submit report

INCIDENT STATUS:
- DRAFT: Being filled in, not yet submitted
- SUBMITTED: Sent to management
- UNDER REVIEW: Being investigated
- CLOSED: Resolved and filed

WHY INCIDENTS MATTER:
- Legal requirement to record workplace accidents
- Helps identify trends and prevent recurrences
- Evidence for insurance claims
- Compliance with health & safety regulations
- Food safety incident tracking for EHO inspections

CRITICAL INCIDENTS:
- Some incidents trigger immediate notifications
- Management receives alerts
- May require immediate action or investigation$$,
'Report incidents for accidents, complaints, illness. Fill details, add evidence, submit for review. Required for compliance.',
'app_help', 'incidents',
ARRAY['incident', 'accident', 'report', 'complaint', 'sickness', 'food poisoning', 'how to report'],
'Checkly Documentation'),

('Staff Sickness Reporting',
$$When staff become ill at work, it must be recorded for health & safety and food safety compliance.

WHEN TO REPORT:
- Employee feels unwell during shift
- Employee calls in sick
- Food handler shows symptoms (vomiting, diarrhea, fever)
- Injury that prevents work

FOOD HANDLER RULES:
- Must NOT handle food if showing symptoms
- Must stay away for 48 hours after symptoms stop
- May need medical clearance to return
- Checkly tracks exclusion periods automatically

WHAT TO RECORD:
- Staff member name and role
- Symptoms (especially if food handler)
- Date/time symptoms started
- Whether they've handled food recently
- Actions taken (sent home, medical attention)
- Return to work date

COMPLIANCE:
- Required by Food Safety Act
- Helps prevent foodborne illness outbreaks
- Evidence for EHO if investigation needed
- Tracks absence patterns

WHERE TO FIND:
- Dashboard > Incidents > Staff Sickness
- Historical records for reporting
- Export data for compliance audits$$,
'Report staff illness, especially food handlers. Track exclusion periods, symptoms, return dates. Required for food safety.',
'app_help', 'incidents',
ARRAY['sickness', 'illness', 'food handler', 'symptoms', 'exclusion', 'compliance', 'staff'],
'Checkly Documentation'),

-- ============================================================================
-- APP HELP - CLOCK IN & ATTENDANCE
-- ============================================================================

('Clock In and Clock Out',
$$Checkly tracks your shift times for attendance and task visibility.

WHY CLOCK IN:
- Staff only see Today's Tasks when clocked in
- Tracks your actual hours worked
- Some tasks only appear during your shift
- Attendance records for payroll

HOW TO CLOCK IN:
1. Look for "Clock In" button on dashboard (usually top right)
2. Select your site (if multiple sites)
3. Tap "Clock In"
4. You'll see confirmation

CLOCK OUT:
- Tap "Clock Out" at end of shift
- System records your hours
- Tasks will hide after clocking out (unless admin)

IF YOU FORGET:
- Ask your manager to adjust times
- Some systems allow retrospective clock in/out
- Contact support if clock in button is missing

TASK VISIBILITY:
- Clocked in: See all tasks assigned to you
- Clocked out: Tasks hidden (admin can still see)
- Not clocked in: May not see any tasks at all

TIP: Clock in at start of every shift to ensure tasks appear$$,
'Clock in to see tasks and track hours. Staff tasks only visible when clocked in. Required for task visibility.',
'app_help', 'attendance',
ARRAY['clock in', 'clock out', 'attendance', 'shift', 'hours', 'tasks visible', 'how to'],
'Checkly Documentation'),

-- ============================================================================
-- APP HELP - ORGANIZATION & SETTINGS
-- ============================================================================

('Managing Your Organization',
$$Organization settings control company-wide configuration and user access.

ORGANIZATION SETTINGS:
- Company name and details
- Billing information
- Subscription plan
- Site management (multiple locations)
- User roles and permissions

ACCESSING SETTINGS:
- Admin: Dashboard > Settings > Organization
- Manager: Limited settings access
- Staff: No settings access (view only)

SITE MANAGEMENT:
- Add new sites/locations
- Assign users to specific sites
- Configure site-specific tasks
- Set site-specific contractors

USER MANAGEMENT:
- Add new team members
- Assign roles (Admin, Manager, Staff)
- Set permissions per user
- Remove/deactivate users

ROLES EXPLAINED:
- ADMIN: Full access, all sites, all features
- MANAGER: Site-specific access, can create tasks, view reports
- STAFF: Clock in/out, complete assigned tasks, view own records

BILLING:
- View subscription status
- Update payment method
- View invoices
- Manage plan upgrades/downgrades

PERMISSIONS:
- Some features restricted by role
- Managers can manage their site only
- Staff can only see assigned tasks$$,
'Organization settings: sites, users, roles, billing. Admin has full access, managers have site-specific access.',
'app_help', 'organization',
ARRAY['organization', 'settings', 'sites', 'users', 'roles', 'permissions', 'billing', 'admin'],
'Checkly Documentation'),

('User Roles and Permissions',
$$Checkly has three user roles with different access levels.

ADMIN ROLE:
- Full access to all features
- All sites in organization
- Add/edit/delete users
- Manage organization settings
- View all reports and data
- Manage billing and subscription
- Can access all tasks across all sites

MANAGER ROLE:
- Access to assigned site(s) only
- Can create and assign tasks
- Can view reports for their site
- Can add users (with admin approval)
- Cannot access organization settings
- Cannot manage billing
- Can view callouts and incidents for their site

STAFF ROLE:
- Limited to assigned tasks only
- Clock in/out functionality
- Complete tasks assigned to them
- View own completion history
- Cannot create tasks
- Cannot view reports
- Cannot access settings

CHANGING ROLES:
- Only Admin can change user roles
- Go to Settings > Users > Select user > Edit role
- Changes take effect immediately

PERMISSIONS BY FEATURE:
- Tasks: Staff (complete only), Manager (create + complete), Admin (all)
- Assets: Staff (view assigned), Manager (view + edit), Admin (all)
- Reports: Staff (none), Manager (site only), Admin (all)
- Settings: Staff (none), Manager (limited), Admin (all)
- Users: Staff (none), Manager (invite), Admin (all)$$,
'Three roles: Admin (full access), Manager (site-specific), Staff (task completion only). Admin manages roles.',
'app_help', 'organization',
ARRAY['roles', 'permissions', 'admin', 'manager', 'staff', 'access', 'what can I do'],
'Checkly Documentation'),

-- ============================================================================
-- APP HELP - EHO REPORTS
-- ============================================================================

('Generating EHO Reports',
$$EHO (Environmental Health Officer) Reports compile compliance evidence for inspections.

WHAT ARE EHO REPORTS:
- Comprehensive compliance documentation
- Temperature logs, task completions, training records
- Evidence of food safety and health & safety compliance
- Exportable for inspector review

WHAT'S INCLUDED:
- Task completion records (fridge temps, cleaning, checks)
- Temperature logs for all equipment
- Training records and certificates
- Incident and accident logs
- SOP compliance records
- Maintenance and callout history

HOW TO GENERATE:
1. Go to Dashboard > EHO Report (or Tasks > Compliance)
2. Select date range (usually last 12 months)
3. Select site(s) to include
4. Choose report sections to include
5. Click "Generate Report"
6. Download PDF or export data

REPORT SECTIONS:
- Food Safety Compliance
- Health & Safety Compliance
- Temperature Monitoring
- Training Records
- Incident Logs
- Maintenance History

TIP FOR INSPECTIONS:
- Generate reports regularly (monthly)
- Keep reports for 2+ years (legal requirement)
- Have reports ready before inspection
- Include all sites and all compliance areas$$,
'Generate EHO reports from Dashboard > EHO Report. Include tasks, temps, training, incidents. Export PDF for inspections.',
'app_help', 'reports',
ARRAY['eho report', 'compliance report', 'inspection', 'export', 'pdf', 'evidence', 'how to generate'],
'Checkly Documentation'),

-- ============================================================================
-- APP HELP - LIBRARY REQUESTS
-- ============================================================================

('Requesting New Library Items',
$$The Library Request system lets you request new SOPs, templates, or resources.

WHAT CAN YOU REQUEST:
- New SOP templates for specific procedures
- Task templates for recurring checks
- Risk assessment templates
- Compliance documentation
- Custom workflows

HOW TO REQUEST:
1. Go to Dashboard > Library (or SOPs > Templates)
2. Click "Request New Template" or "Request Library Item"
3. Fill in details:
   - What type of item (SOP, task template, etc.)
   - What it should cover
   - Why you need it
   - Example or reference if available
4. Submit request

REQUEST STATUS:
- PENDING: Submitted, awaiting Checkly review
- APPROVED: Approved, will be created
- REJECTED: Cannot be created (reason provided)
- DEPLOYED: Created and available in library

WHAT HAPPENS:
- Checkly team reviews your request
- May contact you for clarification
- Creates the item if approved
- You'll be notified when it's ready
- Item appears in library for all users

TIPS:
- Be specific about what you need
- Explain the business case
- Reference regulations if applicable
- Check existing library first$$,
'Request new SOPs, templates, or resources via Library. Fill request form, Checkly reviews, you're notified when ready.',
'app_help', 'library',
ARRAY['library request', 'template request', 'new sop', 'request', 'how to request'],
'Checkly Documentation'),

-- ============================================================================
-- COMPLIANCE - TEMPERATURE MONITORING
-- ============================================================================

('Temperature Monitoring Best Practices',
$$Temperature monitoring is critical for food safety compliance.

REQUIRED TEMPERATURES:
- Fridge: 0-5°C (32-41°F)
- Freezer: -18°C or below (0°F)
- Hot holding: 63°C or above (145°F)
- Cooking: 75°C core temperature (165°F)
- Cooling: Reduce from 63°C to 21°C within 2 hours, then to 5°C within 4 more hours

MONITORING FREQUENCY:
- Fridges/freezers: At least twice daily (morning and evening)
- Hot holding: Every 2 hours during service
- Cooking: Check every batch
- Delivery: Check on arrival

WHAT TO DO IF OUT OF RANGE:
- Fridge above 5°C: Move food to working fridge, check food safety
- Freezer above -18°C: Do not refreeze, use or dispose
- Hot holding below 63°C: Reheat to 75°C or dispose
- Record the breach in Checkly
- May trigger automatic callout for equipment repair

RECORD KEEPING:
- Checkly automatically logs all temperatures
- Keep records for minimum 2 years
- EHO may request temperature logs during inspection
- Historical data shows trends and problems

EQUIPMENT MONITORING:
- Link temperature tasks to specific equipment
- Track each fridge/freezer separately
- Identify problem equipment quickly
- Schedule maintenance before failures$$,
'Monitor temps regularly: fridges (0-5°C), freezers (-18°C), hot hold (63°C+). Log in Checkly, act if out of range.',
'food_safety', 'temperature',
ARRAY['temperature', 'fridge', 'freezer', 'hot holding', 'monitoring', 'compliance', 'food safety'],
'Food Safety Regulations'),

COMMIT;

