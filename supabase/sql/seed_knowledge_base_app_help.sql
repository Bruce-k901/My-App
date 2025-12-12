-- ============================================================================
-- KNOWLEDGE BASE SEED DATA: APP HELP & GUIDANCE
-- ============================================================================
-- How to use Checkly features, create SOPs, Risk Assessments, etc.
-- ============================================================================

BEGIN;

-- ============================================================================
-- APP HELP - TASK MANAGEMENT
-- ============================================================================

INSERT INTO public.knowledge_base (title, content, summary, category, subcategory, tags, source) VALUES

('How Tasks Work in Checkly',
$$Checkly uses a template-based task system. Understanding the hierarchy is key:

HIERARCHY:
1. TASK TEMPLATES - The master definition (what the task is)
2. SITE CHECKLISTS - Configuration for a specific site (when/how often)
3. CHECKLIST TASKS - The actual task instances that appear in Today's Tasks

HOW IT WORKS:
1. You create or use a template from the Compliance Library
2. You configure it for your site (times, equipment, frequency)
3. The system automatically generates task instances each day/week/month
4. Staff complete tasks, which creates completion records

TASK TYPES:
- DAILY: Generated each morning for that day
- WEEKLY: Generated on configured days (e.g., every Monday)
- MONTHLY: Generated on configured date (e.g., 1st of each month)
- ON DEMAND: Only created when manually triggered

WHERE TO FIND THINGS:
- Today's Tasks: Tasks due TODAY for your shift
- My Tasks: Your personal task configurations
- Active Tasks: All manually created tasks (not auto-generated)
- Completed Tasks: Historical record of all completions
- Templates: Create your own custom templates
- Compliance: Pre-built EHO-ready templates

TIP: If a task isn't showing in Today's Tasks, check:
1. Are you clocked in? (Staff only see tasks when on shift)
2. Is it the right daypart? (Some tasks only show at certain times)
3. Is the configuration active?$$,
'Templates define tasks, configurations set timing, tasks are auto-generated. Check shift status if tasks missing.',
'app_help', 'tasks',
ARRAY['tasks', 'templates', 'today tasks', 'how to', 'missing tasks', 'configuration'],
'Checkly Documentation'),

('Completing a Task in Checkly',
$$When you tap on a task in Today's Tasks, the Task Completion Modal opens.

COMPLETION PROCESS:
1. Read the task instructions at the top
2. Fill in all required fields (marked with *)
3. Add photos if required/requested
4. Add notes if needed
5. Tap "Complete Task"

COMMON FIELD TYPES:
- TEMPERATURE: Enter the reading from your thermometer
- PASS/FAIL: Select whether the check passed or failed
- CHECKLIST: Tick off each item as you complete it
- TEXT: Free-form notes or descriptions
- PHOTO: Tap to take a photo as evidence

IF A CHECK FAILS:
- Some templates will ask for a corrective action
- Temperature breaches may trigger a monitoring task
- Critical failures may generate a callout to a contractor

MULTI-UNIT TASKS (e.g., Fridge Temps):
Some tasks need to be completed for multiple pieces of equipment:
1. The modal shows each unit separately
2. Complete the reading for each
3. All units must be recorded before task can be marked complete

EVIDENCE PHOTOS:
- Photos are stored securely in Checkly
- They provide proof for EHO inspections
- Tip: Ensure good lighting and the subject is clearly visible$$,
'Open task, fill in fields, add photos if needed, tap Complete. Failed checks may trigger follow-up actions.',
'app_help', 'tasks',
ARRAY['complete task', 'modal', 'temperature', 'evidence', 'photos', 'how to complete'],
'Checkly Documentation'),

('Task Statuses Explained',
$$Tasks in Checkly have different statuses depending on their state:

ACTIVE STATUSES:
- PENDING: Task is waiting to be started
- IN PROGRESS: Someone has started but not finished the task
- DUE: Task is due within the next 2 hours
- LATE: Task is past its due time but within the day

COMPLETION STATUSES:
- COMPLETED: Task was finished successfully
- MISSED: Task was not completed and the deadline passed
- SKIPPED: Task was intentionally skipped (with reason)

HOW STATUSES CHANGE:
- Tasks start as PENDING
- When due time approaches, they become DUE
- After due time passes, they become LATE
- After the completion window closes, they become MISSED
- Completing a task marks it as COMPLETED

COMPLETION WINDOWS:
- Daily tasks: 1 hour after due time
- Weekly tasks: 1 day after due date
- Monthly tasks: 1 week after due date

WHAT HAPPENS TO MISSED TASKS:
- They appear in the Completed Tasks page with a "Missed" badge
- They're flagged for review by managers
- EHO reports will show completion rates
- Consider why tasks are being missed (training? staffing? unrealistic schedule?)$$,
'PENDING → DUE → LATE → MISSED or COMPLETED. Missed tasks are flagged for review.',
'app_help', 'tasks',
ARRAY['task status', 'pending', 'completed', 'missed', 'overdue', 'late', 'status'],
'Checkly Documentation'),

('Using the Compliance Templates Library',
$$The Compliance page contains pre-built templates designed for UK hospitality EHO compliance.

WHAT'S IN THE LIBRARY:
- Temperature checks (fridges, freezers, hot holding)
- Fire safety (alarm tests, extinguisher checks, emergency lighting)
- Health & Safety (first aid, workplace inspections)
- Food safety audits (labelling, cleaning, pest control)
- Training compliance reviews

HOW TO USE A TEMPLATE:
1. Go to Compliance in the Tasks menu
2. Browse or search for the template you need
3. Click "Use Template"
4. Configure for your site:
   - Select the site
   - Choose dayparts and times
   - Select equipment (for temp checks)
   - Set frequency if applicable
5. Save to create the configuration

TEMPLATE FEATURES:
- Pre-written instructions following regulations
- Correct fields for data capture
- Built-in compliance references
- Evidence requirements set appropriately
- Contractor triggers for failures (where relevant)

CUSTOMISATION:
- You can add custom instructions
- Add or remove equipment
- Change times to suit your operation
- The underlying compliance standards are preserved

CREATING YOUR OWN:
Use the Templates page to create custom templates for tasks specific to your operation.$$,
'Compliance library has pre-built EHO templates. Click Use Template, configure for your site, and save.',
'app_help', 'templates',
ARRAY['compliance', 'templates', 'library', 'EHO', 'pre-built', 'how to use'],
'Checkly Documentation'),

('Shift-Based Task Visibility',
$$Checkly filters tasks based on whether you're on shift. This ensures staff only see relevant tasks.

HOW IT WORKS:
- MANAGERS/OWNERS: See all tasks for their sites, regardless of shift status
- STAFF: Only see tasks when they're clocked in and on shift

IF TASKS AREN'T SHOWING (Staff):
1. Have you clocked in? Use the Clock In button in the header
2. Are you at the right site? Check you clocked into the correct location
3. Is it the right time? Tasks appear when their daypart begins

DAYPARTS:
- BEFORE OPEN: Opening tasks (prep, temp checks)
- DURING SERVICE: Service tasks (hot holding, cleaning)
- AFTER SERVICE: Closing tasks (end of day checks)
- ANYTIME: Available throughout the shift

THE CLOCK IN/OUT SYSTEM:
- Tap your avatar or the clock icon
- Select "Clock In" and choose your site
- You'll see tasks for that site
- Clock Out when leaving
- This isn't time tracking - it's just for task filtering

WHAT MANAGERS SEE:
Managers see tasks regardless of shift status because they need oversight of all compliance activities. They can filter by site using the site selector.$$,
'Staff see tasks when clocked in. Managers see all tasks. Use dayparts to control when tasks appear.',
'app_help', 'shifts',
ARRAY['shift', 'clock in', 'clock out', 'missing tasks', 'not showing', 'visibility', 'daypart'],
'Checkly Documentation');

-- ============================================================================
-- SOP GUIDANCE
-- ============================================================================

INSERT INTO public.knowledge_base (title, content, summary, category, subcategory, tags, source) VALUES

('What is an SOP and Why You Need Them',
$$SOP stands for Standard Operating Procedure. It's a documented process that ensures tasks are done consistently and correctly.

WHY SOPS MATTER:
1. CONSISTENCY: Everyone follows the same process
2. TRAINING: New staff learn faster with clear procedures
3. COMPLIANCE: Proves to EHO you have systems in place
4. SAFETY: Reduces accidents and mistakes
5. QUALITY: Maintains standards even when busy

WHAT EHOs LOOK FOR:
- Written procedures for high-risk activities
- Evidence staff have been trained on procedures
- Procedures that match what actually happens
- Regular review and updates

COMMON HOSPITALITY SOPS:
- Opening and closing procedures
- Food delivery and storage
- Allergen handling
- Cleaning schedules and methods
- Temperature checking procedures
- Waste management
- Spill and contamination response
- Fire evacuation procedures

WHEN TO CREATE AN SOP:
- Any task that's done repeatedly
- High-risk activities (food safety, chemicals)
- Tasks done by multiple people
- Areas where mistakes have occurred
- When regulations require documented procedures$$,
'SOPs ensure consistency and prove compliance to EHOs. Create them for high-risk and repeated tasks.',
'sop_guidance', 'basics',
ARRAY['SOP', 'standard operating procedure', 'procedures', 'documentation', 'EHO', 'compliance'],
'FSA Guidance, SFBB'),

('How to Write an Effective SOP',
$$A good SOP is clear, concise, and easy to follow. Here's how to write one:

SOP STRUCTURE:
1. TITLE: Clear name describing the procedure
2. PURPOSE: Why this procedure exists
3. SCOPE: When and where it applies
4. RESPONSIBILITIES: Who does what
5. PROCEDURE: Step-by-step instructions
6. RECORDS: What documentation is needed
7. REVIEW DATE: When to next review

WRITING TIPS:

1. USE SIMPLE LANGUAGE
- Short sentences
- Active voice ("Check the temperature" not "The temperature should be checked")
- Avoid jargon unless explained

2. BE SPECIFIC
Bad: "Clean the area thoroughly"
Good: "Spray surface with sanitiser, leave for 30 seconds, wipe with clean cloth"

3. NUMBER YOUR STEPS
Makes it easy to follow and reference

4. INCLUDE MEASUREMENTS
- Temperatures in °C
- Times in minutes
- Quantities (e.g., "2 pumps of sanitiser")

5. ADD "IF/THEN" SCENARIOS
"If temperature exceeds 8°C, then move food to backup fridge and report to manager"

6. INCLUDE SAFETY POINTS
Where relevant, add PPE requirements, hazards, or warnings

7. MAKE IT ACCESSIBLE
- Available where the task happens
- Laminated if near water/mess
- Digital version in Checkly

COMMON MISTAKES:
- Too long (people won't read it)
- Too vague (doesn't actually help)
- Out of date (last reviewed years ago)
- Not accessible (locked in an office)$$,
'Good SOPs: clear title, numbered steps, specific measurements, simple language. Keep accessible and up to date.',
'sop_guidance', 'writing',
ARRAY['write SOP', 'how to write', 'procedure', 'steps', 'documentation', 'instructions'],
'FSA Guidance'),

('Creating SOPs in Checkly',
$$Checkly has a built-in SOP management system that links procedures to your tasks and training.

ACCESSING SOP MANAGEMENT:
Navigate to Documents > SOPs in the main menu.

CREATING A NEW SOP:
1. Click "Create SOP" 
2. Enter basic details:
   - Title
   - Reference code (e.g., SOP-FS-001)
   - Category (Food Safety, H&S, Fire, etc.)
   - Site (or All Sites if universal)
3. Write your procedure content
4. Set review date (typically 12 months)
5. Assign staff who need to read/sign
6. Publish

SOP FEATURES:
- VERSION CONTROL: Track changes over time
- ACKNOWLEDGEMENTS: Staff sign off that they've read it
- REVIEW REMINDERS: Automatic tasks when review is due
- LINK TO TASKS: Reference SOPs in task templates
- SEARCH: Find procedures quickly
- EXPORT: Generate documents for EHO folders

REVIEW PROCESS:
1. You'll receive a task 30 days before review date
2. Open the SOP and check content is still accurate
3. Make any updates needed
4. Save new version (previous version archived)
5. Re-assign to staff if significant changes
6. Update review date

STAFF ACKNOWLEDGEMENT:
- When you publish an SOP, assigned staff get a notification
- They must open and mark as "Read & Understood"
- This creates a training record
- Managers can see who has/hasn't acknowledged$$,
'Create SOPs in Documents > SOPs. Staff acknowledge reading. System tracks versions and reminds for review.',
'sop_guidance', 'checkly',
ARRAY['create SOP', 'Checkly', 'documents', 'acknowledgement', 'review', 'version control'],
'Checkly Documentation');

-- ============================================================================
-- RISK ASSESSMENT GUIDANCE
-- ============================================================================

INSERT INTO public.knowledge_base (title, content, summary, category, subcategory, tags, source) VALUES

('What is a Risk Assessment',
$$A risk assessment is a systematic process of identifying hazards and determining what controls are needed.

LEGAL REQUIREMENT:
If you have 5+ employees, you MUST have written risk assessments.
Even with fewer, you should conduct and document them.

THE 5 STEPS (HSE Model):

1. IDENTIFY THE HAZARDS
- Walk around your workplace
- Talk to staff about problems
- Check accident records
- Review manufacturer guidance
- Consider less obvious hazards (stress, fatigue)

2. DECIDE WHO MIGHT BE HARMED
- Staff (different roles face different risks)
- Customers
- Contractors and visitors
- Cleaners (often work when others aren't there)
- Vulnerable groups (pregnant, young workers, disabled)

3. EVALUATE RISKS AND DECIDE ON CONTROLS
- How likely is it to happen?
- How serious would the harm be?
- What's already in place?
- What more is needed?

4. RECORD YOUR FINDINGS
- Must be written if 5+ employees
- Include hazards, who's at risk, controls
- Keep it simple and focused

5. REVIEW AND UPDATE
- When things change (new equipment, processes)
- After an accident or near miss
- At regular intervals (typically annually)

RISK RATING:
Likelihood x Severity = Risk Level
- Low: Acceptable with current controls
- Medium: Additional controls advisable
- High: Immediate action required$$,
'5 steps: identify hazards, who''s at risk, evaluate and control, record, review. Written records required for 5+ staff.',
'ra_guidance', 'basics',
ARRAY['risk assessment', 'hazards', '5 steps', 'HSE', 'controls', 'likelihood', 'severity'],
'Health and Safety at Work Act, HSE Guidance'),

('Common Hospitality Hazards',
$$These are the most common hazards in hospitality that should be covered in your risk assessments:

SLIPS, TRIPS & FALLS (Most common injury cause):
- Wet floors from spills, cleaning, rain tracked in
- Loose cables or mats
- Cluttered walkways
- Uneven flooring or steps
- Poor lighting

MANUAL HANDLING:
- Lifting kegs, stock boxes, chairs
- Repetitive movements
- Awkward positions
- Carrying hot or heavy items

KITCHEN HAZARDS:
- Burns and scalds (ovens, fryers, hot liquids)
- Cuts from knives and equipment
- Fire (especially deep fat fryers)
- Hot oil splashes
- Steam

HAZARDOUS SUBSTANCES:
- Cleaning chemicals
- Oven cleaners
- Drain cleaners
- Glass wash chemicals

ELECTRICAL:
- Faulty equipment
- Wet conditions near electrics
- Overloaded sockets
- Damaged cables

VIOLENCE AND AGGRESSION:
- Late night venues
- Alcohol-related incidents
- Lone working
- Cash handling

WORK-RELATED STRESS:
- Long hours
- High pressure periods
- Customer complaints
- Understaffing

FIRE:
- Cooking equipment
- Extraction systems (grease build-up)
- Storage of combustibles
- Blocked exits

For each hazard, you need controls documented in your risk assessment.$$,
'Key hospitality hazards: slips/trips, manual handling, kitchen dangers, chemicals, violence, stress, fire.',
'ra_guidance', 'hazards',
ARRAY['hazards', 'hospitality', 'slips', 'burns', 'manual handling', 'violence', 'stress', 'kitchen'],
'HSE Catering Information Sheet'),

('Creating Risk Assessments in Checkly',
$$Checkly includes a Risk Assessment management system that integrates with your compliance workflow.

ACCESSING RISK ASSESSMENTS:
Navigate to Documents > Risk Assessments in the main menu.

CREATING A RISK ASSESSMENT:
1. Click "Create Risk Assessment"
2. Enter basic information:
   - Title (e.g., "Kitchen Fire Safety RA")
   - Reference code (e.g., RA-FIRE-001)
   - Site
   - Assessment date
3. For each hazard, add:
   - Hazard description
   - Who might be harmed
   - Current controls
   - Risk rating (likelihood x severity)
   - Additional controls needed
   - Person responsible
   - Target date
4. Set review date (typically 12 months)
5. Save and publish

RISK MATRIX:
Checkly uses a 5x5 risk matrix:
- Likelihood: 1 (Rare) to 5 (Almost Certain)
- Severity: 1 (Negligible) to 5 (Catastrophic)
- Score = L x S
- 1-4: Low (Green)
- 5-12: Medium (Amber)
- 15-25: High (Red)

REVIEW PROCESS:
1. Task generated 30 days before review date
2. Open the RA and review each hazard
3. Check controls are still in place and effective
4. Update any changes
5. Re-calculate risk ratings if needed
6. Save new version

LINKING TO TASKS:
When you create certain task templates (like workplace inspections), you can link them to the relevant Risk Assessment. This ensures tasks reflect your RA controls.$$,
'Create RAs in Documents > Risk Assessments. Use 5x5 matrix for ratings. Review annually or when things change.',
'ra_guidance', 'checkly',
ARRAY['create RA', 'Checkly', 'risk matrix', 'hazards', 'controls', 'review'],
'Checkly Documentation');

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

INSERT INTO public.knowledge_base (title, content, summary, category, subcategory, tags, source) VALUES

('Tasks Not Showing in Today''s Tasks',
$$If expected tasks aren't appearing, check these common causes:

FOR STAFF MEMBERS:
1. ARE YOU CLOCKED IN?
   - Tasks only show when you're on shift
   - Tap your avatar > Clock In > Select your site
   - Check the shift indicator shows you're active

2. IS IT THE RIGHT DAYPART?
   - "Before Open" tasks only show in morning
   - "During Service" tasks only show during operating hours
   - "After Service" tasks only show in evening
   - Check the task template's daypart settings

3. CORRECT SITE?
   - Make sure you're clocked into the site where tasks are configured
   - If you work multiple sites, check you're at the right one

FOR MANAGERS:
1. IS THE CONFIGURATION ACTIVE?
   - Check My Tasks > find the configuration
   - Ensure it's not been paused or deleted

2. IS THE TEMPLATE ACTIVE?
   - Templates > find the template
   - Check "is_active" is true

3. DID THE CRON JOB RUN?
   - Tasks are generated automatically at 6 AM and 6 PM UTC
   - If you just created a template, tasks may not appear until next run
   - You can manually generate by refreshing the configuration

4. CORRECT FREQUENCY?
   - Daily tasks appear every day
   - Weekly tasks only on specified days
   - Monthly tasks only on specified date

5. CHECK THE DATE FILTERS
   - Today's Tasks only shows tasks due TODAY
   - If due date is wrong, task won't appear

STILL NOT WORKING?
- Check browser console for errors
- Try refreshing the page
- Clear browser cache
- Contact support with task template ID$$,
'Check: clocked in, right daypart, correct site, configuration active, template active, cron has run.',
'troubleshooting', 'tasks',
ARRAY['tasks not showing', 'missing tasks', 'troubleshoot', 'clock in', 'daypart', 'not appearing'],
'Checkly Documentation'),

('Temperature Readings Flagged or Rejected',
$$When temperature readings are outside expected ranges, Checkly takes action:

WHAT HAPPENS:
1. You enter a temperature reading
2. System compares to the expected range for that equipment
3. If outside range, it's flagged and you're prompted for action

EXPECTED RANGES:
- Fridges: 0-5°C (alert at 8°C+)
- Freezers: -18°C or below (alert at -15°C+)
- Hot holding: 63°C+ (alert below 63°C)

WHEN A READING IS FLAGGED:
1. You'll see a warning message
2. You'll be asked to confirm the reading
3. You may need to take corrective action
4. A monitoring task may be created

CORRECTIVE ACTIONS:
For high fridge temps:
- Check door is closing properly
- Check thermostat setting
- Move food to another unit if available
- Consider if food is still safe

For low hot holding temps:
- Reheat food above 63°C
- Check equipment is functioning
- Discard food if below 63°C for >2 hours

MONITORING TASKS:
If a breach is significant:
- A "Monitoring" task is created
- Recheck temperature after 30-60 minutes
- If still out of range, a callout may be triggered
- All actions are logged for compliance records

CONTRACTOR CALLOUTS:
For persistent or serious equipment failures:
- System can automatically create a callout
- Your configured contractor is notified
- Track the callout through resolution$$,
'Out-of-range temps trigger flags and monitoring tasks. Take corrective action and recheck. Persistent issues trigger callouts.',
'troubleshooting', 'temperature',
ARRAY['temperature', 'flagged', 'out of range', 'breach', 'monitoring', 'corrective action'],
'Checkly Documentation'),

('Cannot Complete a Task',
$$If you're unable to complete a task, here are common issues and solutions:

REQUIRED FIELDS NOT FILLED:
- Fields marked with * are mandatory
- Check all required fields have values
- For multi-unit tasks, all units must have readings

PHOTO REQUIRED BUT NOT ADDED:
- Some tasks require photo evidence
- Tap the camera icon to add a photo
- Check camera permissions in your browser

EQUIPMENT NOT LISTED:
- If equipment you need to record isn't showing:
  - It may not be configured for this task
  - Ask a manager to add it in the configuration
  - Check you're on the right site

TASK ALREADY COMPLETED:
- If someone else completed it, you won't be able to
- Check Completed Tasks to see who completed it
- Multi-daypart tasks need completing separately for each daypart

NETWORK ISSUES:
- Task completion requires internet connection
- If offline, wait for connection and retry
- Data is saved locally until it can sync

PERMISSION ISSUES:
- Some tasks require specific roles
- If you see "Not Authorised", check with your manager
- Managers can adjust role requirements in templates

BROWSER ISSUES:
- Try refreshing the page
- Clear browser cache
- Try a different browser
- Update your browser to latest version

IF ALL ELSE FAILS:
- Note down the information manually
- Report the issue to your manager
- Contact support with:
  - Task ID (from the URL)
  - What you were trying to do
  - Any error message shown$$,
'Check: all required fields filled, photos added, equipment configured, network connected. Report issue if persists.',
'troubleshooting', 'completion',
ARRAY['cannot complete', 'error', 'required fields', 'photo', 'permissions', 'troubleshoot'],
'Checkly Documentation');

COMMIT;

