-- ============================================================================
-- Migration: Expand Knowledge Base for All Modules
-- Description: Adds knowledge base content for Stockly, Teamly, Planly, Assetly, and Msgly
-- ============================================================================

BEGIN;

-- ============================================================================
-- STOCKLY MODULE CONTENT
-- ============================================================================

INSERT INTO public.knowledge_base (title, content, summary, category, subcategory, tags, source) VALUES

('How to Process an Invoice in Stockly',
$$Processing invoices in Stockly allows you to track deliveries and update stock levels automatically.

PROCESS:
1. Go to Stockly > Deliveries
2. Click "New Delivery" or "Process Invoice"
3. Upload invoice image or enter manually
4. AI will extract line items (if using image upload)
5. Match items to your product variants
6. Review and confirm delivery
7. Stock levels update automatically

AI INVOICE PROCESSING:
- Upload a photo of your invoice
- AI extracts: invoice number, date, line items, prices, VAT
- Automatically matches items to your product variants
- Flags unmatched items for review

MANUAL ENTRY:
- Enter supplier, date, invoice number
- Add line items manually
- Match to product variants
- Set quantities and prices

IMPORTANT:
- Always verify AI-extracted data
- Check VAT calculations (0% for most food, 20% for alcohol/soft drinks)
- Review unmatched items and create new variants if needed$$,
'Upload invoice image for AI processing or enter manually. AI extracts line items and matches to product variants.',
'app_help', 'stockly',
ARRAY['stockly', 'invoice', 'delivery', 'process invoice', 'ai', 'how to'],
'Stockly Documentation'),

('Stock Counting in Stockly',
$$Stock counts help you verify actual stock levels and identify discrepancies.

TYPES OF COUNTS:
- FULL COUNT: Count all items in a storage area
- PARTIAL COUNT: Count specific items or categories
- SPOT COUNT: Quick count of a few items
- ROLLING COUNT: Count different areas on a schedule

PROCESS:
1. Go to Stockly > Stock Counts
2. Click "New Stock Count"
3. Select storage area(s) to count
4. Enter counted quantities for each item
5. System calculates variance (counted vs system)
6. Review and approve variances
7. Stock levels update after approval

VARIANCE APPROVAL:
- Small variances may auto-approve
- Large variances require manager approval
- Review reasons for discrepancies
- Adjust stock levels after approval

TIPS:
- Count during quiet periods
- Use consistent counting methods
- Document any issues found
- Regular counts improve accuracy$$,
'Create stock count, enter counted quantities, review variances, approve adjustments. Regular counts improve accuracy.',
'app_help', 'stockly',
ARRAY['stockly', 'stock count', 'counting', 'variance', 'inventory', 'how to'],
'Stockly Documentation'),

('Recipe Costing in Stockly',
$$Recipe costing calculates the cost of making a dish based on ingredient prices.

HOW IT WORKS:
1. Create a recipe with ingredients and quantities
2. System uses current ingredient costs
3. Calculates total recipe cost
4. Shows cost per portion
5. Updates automatically when ingredient prices change

COSTING METHODS:
- Weighted Average: Uses average cost of ingredients
- FIFO: First In First Out costing
- Last Price: Uses most recent purchase price

VIEWING COSTS:
- Recipe detail page shows cost breakdown
- See cost per ingredient
- Total recipe cost
- Cost per portion/serving

USING FOR PRICING:
- Recipe cost helps set menu prices
- Target GP (Gross Profit) percentage
- Compare costs across recipes
- Identify high-cost items$$,
'Recipes automatically calculate cost from ingredient prices. View breakdown and use for menu pricing decisions.',
'app_help', 'stockly',
ARRAY['stockly', 'recipe', 'costing', 'pricing', 'gp', 'gross profit', 'how to'],
'Stockly Documentation'),

('GP Calculation in Stockly',
$$Gross Profit (GP) shows how much profit you make after ingredient costs.

CALCULATION:
GP = Sales Price - Cost of Goods Sold (COGS)
GP% = (GP / Sales Price) × 100

VIEWING GP:
- Recipe page shows GP per portion
- Reports show GP by item, category, or period
- Compare GP across different items
- Identify low-GP items

GP REPORTS:
- Go to Stockly > Reports > GP Report
- Filter by date range, category, site
- See GP% and GP value
- Export to Excel or PDF

IMPROVING GP:
- Review high-cost ingredients
- Consider alternative suppliers
- Adjust portion sizes
- Update menu prices
- Reduce waste$$,
'GP = Sales - Cost. View in recipes and reports. Use to identify low-profit items and optimize pricing.',
'app_help', 'stockly',
ARRAY['stockly', 'gp', 'gross profit', 'profit', 'pricing', 'reports', 'how to'],
'Stockly Documentation'),

-- ============================================================================
-- TEAMLY MODULE CONTENT
-- ============================================================================

('Shift Scheduling in Teamly',
$$The rota system helps you schedule staff shifts efficiently.

CREATING SHIFTS:
1. Go to Teamly > Schedule
2. Select date and time slot
3. Click "Add Shift"
4. Select employee(s)
5. Set shift type (FOH/BOH, hourly/salaried)
6. Save shift

SHIFT PATTERNS:
- Create recurring patterns for regular shifts
- Apply to multiple weeks
- Copy from previous week
- Use templates for common patterns

SHIFT SWAPPING:
- Employees can request swaps
- Managers approve swaps
- System tracks all changes
- Maintains coverage

AVAILABILITY:
- Employees set availability preferences
- Managers see availability when scheduling
- System flags conflicts
- Respect blackout dates$$,
'Create shifts, use patterns, manage swaps. Employees set availability to help with scheduling.',
'app_help', 'teamly',
ARRAY['teamly', 'rota', 'schedule', 'shifts', 'scheduling', 'how to'],
'Teamly Documentation'),

('Leave Requests in Teamly',
$$Requesting leave allows you to book time off and track your leave balance.

REQUESTING LEAVE:
1. Go to Teamly > Leave > Request
2. Select leave type (holiday, sick, etc.)
3. Choose start and end dates
4. Add notes if needed
5. Submit request
6. Manager receives notification

LEAVE BALANCES:
- View your current balance
- See how much leave you've used
- Check remaining entitlement
- View by leave type

APPROVAL PROCESS:
- Manager reviews request
- Checks coverage and blackout dates
- Approves or denies
- You receive notification

LEAVE CALENDAR:
- See all team leave at a glance
- Identify coverage gaps
- Plan around busy periods
- Respect minimum staffing levels$$,
'Submit leave request, manager approves. View balances and calendar to plan time off.',
'app_help', 'teamly',
ARRAY['teamly', 'leave', 'holiday', 'time off', 'request', 'balance', 'how to'],
'Teamly Documentation'),

('Payroll Queries in Teamly',
$$The payroll system calculates pay based on hours worked and pay rates.

PAYROLL RUNS:
- Created from attendance signoff
- Includes all clocked hours
- Calculates regular and overtime
- Includes tronc (tips) if configured

VIEWING PAYSLIPS:
- Go to Teamly > Payroll > My Payslips
- Select pay period
- View breakdown of hours and pay
- See deductions and net pay

PAY RATES:
- Hourly rates set per employee
- Salaried staff have annual salary
- Overtime rates apply after threshold
- Different rates for different shift types

EXPORTS:
- Export to Xero, Sage, QuickBooks
- Generic CSV format available
- Includes all payroll data
- Ready for accounting software$$,
'Payroll runs created from attendance. View payslips, check rates, export to accounting software.',
'app_help', 'teamly',
ARRAY['teamly', 'payroll', 'payslip', 'pay', 'wages', 'salary', 'how to'],
'Teamly Documentation'),

('Training Courses in Teamly',
$$The training system tracks employee training and certifications.

BROWSE COURSES:
- Go to Teamly > Training
- View available courses
- Filter by category or type
- See course details and duration

BOOKING TRAINING:
- Select course and date
- Book for yourself or team members
- Receive confirmation
- Get reminders before course

TRAINING RECORDS:
- View your training history
- See completed courses
- Check certification expiry dates
- Download certificates

TRAINING MATRIX:
- See team training status
- Identify training gaps
- Track expiring certifications
- Plan refresher training

COMPLIANCE:
- Required training highlighted
- Expiry alerts sent automatically
- Compliance reports available
- Track mandatory training$$,
'Browse and book courses, view records and certificates. Training matrix shows team compliance status.',
'app_help', 'teamly',
ARRAY['teamly', 'training', 'courses', 'certificates', 'compliance', 'matrix', 'how to'],
'Teamly Documentation'),

-- ============================================================================
-- PLANLY MODULE CONTENT
-- ============================================================================

('Production Planning in Planly',
$$Production planning helps you schedule manufacturing and ensure you have enough ingredients.

PRODUCTION PLAN:
- View all orders for a date
- See ingredient requirements
- Check capacity constraints
- Optimize production schedule

ORDER BOOK:
- All customer orders in one place
- Filter by date, customer, status
- See delivery dates
- Track order progress

INGREDIENT REQUIREMENTS:
- System calculates from recipes
- Shows total needed per ingredient
- Checks against stock levels
- Flags shortages

SCHEDULING:
- Assign orders to production days
- Consider lead times
- Balance workload
- Optimize for efficiency$$,
'View production plan, manage order book, check ingredient requirements, schedule production efficiently.',
'app_help', 'planly',
ARRAY['planly', 'production', 'planning', 'manufacturing', 'schedule', 'how to'],
'Planly Documentation'),

('Order Management in Planly',
$$Managing orders helps you track customer requests and ensure timely delivery.

CREATING ORDERS:
1. Go to Planly > Order Book
2. Click "New Order"
3. Select customer
4. Add products and quantities
5. Set delivery date
6. Save order

ORDER STATUSES:
- DRAFT: Not yet confirmed
- CONFIRMED: Customer confirmed
- LOCKED: In production
- COMPLETED: Delivered
- CANCELLED: Order cancelled

STANDING ORDERS:
- Recurring orders that auto-generate
- Set frequency (daily, weekly, etc.)
- Specify products and quantities
- System creates orders automatically

DELIVERY SCHEDULING:
- View all deliveries for a date
- Optimize delivery routes
- Assign delivery vehicles
- Track delivery status$$,
'Create and manage orders, track status, set up standing orders, schedule deliveries.',
'app_help', 'planly',
ARRAY['planly', 'orders', 'order book', 'customers', 'delivery', 'how to'],
'Planly Documentation'),

('Delivery Scheduling in Planly',
$$Delivery scheduling helps you organize deliveries efficiently.

DELIVERY SCHEDULE:
- View all deliveries for a date range
- See delivery addresses
- Check vehicle assignments
- Optimize routes

DELIVERY NOTES:
- Generate delivery notes
- Include order details
- Customer signature on delivery
- Track delivery confirmation

ROUTE OPTIMIZATION:
- Group deliveries by area
- Minimize travel time
- Balance vehicle loads
- Consider delivery windows

DELIVERY STATUS:
- OUT FOR DELIVERY: On the way
- DELIVERED: Completed
- FAILED: Could not deliver
- RESCHEDULED: Moved to another date$$,
'View delivery schedule, generate notes, optimize routes, track delivery status.',
'app_help', 'planly',
ARRAY['planly', 'delivery', 'schedule', 'routes', 'notes', 'how to'],
'Planly Documentation'),

('Cutoff Rules in Planly',
$$Cutoff rules determine when orders must be placed to be included in production.

WHAT ARE CUTOFF RULES:
- Time deadline for order placement
- Ensures production can be scheduled
- Varies by product or customer
- Prevents last-minute orders

SETTING CUTOFFS:
- Go to Planly > Settings > Cutoff Rules
- Set cutoff time per product group
- Different rules for different days
- Consider production lead times

HOW IT WORKS:
- Orders placed before cutoff included in next production
- Orders after cutoff go to following production
- System warns if order is past cutoff
- Managers can override if needed

BENEFITS:
- Better production planning
- Reduced rush orders
- More efficient scheduling
- Improved customer communication$$,
'Cutoff rules set order deadlines. Orders before cutoff included in next production run.',
'app_help', 'planly',
ARRAY['planly', 'cutoff', 'rules', 'deadline', 'orders', 'production', 'how to'],
'Planly Documentation'),

-- ============================================================================
-- ASSETLY MODULE CONTENT
-- ============================================================================

('Logging Asset Issues in Assetly',
$$Logging issues helps track equipment problems and schedule repairs.

REPORTING ISSUES:
1. Go to Assetly > Assets
2. Find the asset with the issue
3. Click "Log Issue" or "Create Callout"
4. Describe the problem
5. Add photos if helpful
6. Submit issue

ISSUE TYPES:
- BREAKDOWN: Equipment not working
- FAULT: Equipment working but has problems
- MAINTENANCE: Routine maintenance needed
- INSPECTION: Safety inspection required

CALLOUTS:
- Creates contractor callout request
- Assigns to preferred contractor
- Sends notification
- Tracks repair progress

PRIORITY LEVELS:
- URGENT: Immediate attention needed
- HIGH: Fix within 24 hours
- MEDIUM: Fix within week
- LOW: Schedule for next maintenance

TRACKING:
- View all issues for an asset
- See repair history
- Track costs
- Monitor recurring problems$$,
'Log issues on assets, create callouts for contractors, set priority, track repair history.',
'app_help', 'assetly',
ARRAY['assetly', 'assets', 'issues', 'callout', 'repair', 'breakdown', 'how to'],
'Assetly Documentation'),

('PPM Scheduling in Assetly',
$$Planned Preventive Maintenance (PPM) keeps equipment running smoothly.

WHAT IS PPM:
- Regular maintenance scheduled in advance
- Prevents breakdowns
- Extends equipment life
- Ensures compliance

CREATING PPM SCHEDULES:
1. Go to Assetly > Assets
2. Select asset
3. Click "Add PPM Schedule"
4. Set frequency (weekly, monthly, etc.)
5. Define maintenance tasks
6. Assign contractor if needed

PPM TYPES:
- INSPECTION: Visual checks and tests
- SERVICING: Cleaning and adjustments
- REPLACEMENT: Parts replacement
- CALIBRATION: Accuracy checks

NOTIFICATIONS:
- System alerts when PPM due
- Reminders sent to managers
- Contractor notified if assigned
- Track completion

BENEFITS:
- Fewer breakdowns
- Lower repair costs
- Longer equipment life
- Compliance maintained$$,
'Create PPM schedules for regular maintenance. System alerts when due and tracks completion.',
'app_help', 'assetly',
ARRAY['assetly', 'ppm', 'maintenance', 'scheduling', 'preventive', 'how to'],
'Assetly Documentation'),

('Asset Tracking in Assetly',
$$Tracking assets helps you manage equipment, warranties, and maintenance.

ASSET INFORMATION:
- Make, model, serial number
- Purchase date and cost
- Warranty period
- Assigned site and location
- Current status

ASSET STATUS:
- ACTIVE: In use and working
- INACTIVE: Not currently in use
- UNDER REPAIR: Being fixed
- DECOMMISSIONED: No longer used

ASSET LOGS:
- View all activity for an asset
- See maintenance history
- Track callouts and repairs
- View temperature readings (if applicable)

SEARCHING ASSETS:
- Search by name, make, model
- Filter by site, status, type
- Find assets by serial number
- View asset details

REPORTS:
- Asset register export
- Maintenance schedule report
- Warranty expiry alerts
- Asset value reports$$,
'Track assets with details, status, logs. Search and filter to find assets quickly.',
'app_help', 'assetly',
ARRAY['assetly', 'assets', 'tracking', 'equipment', 'inventory', 'how to'],
'Assetly Documentation'),

('Contractor Callouts in Assetly',
$$Callouts request contractors to fix equipment issues or perform maintenance.

CREATING CALLOUTS:
1. Go to Assetly > Assets
2. Select asset with issue
3. Click "Create Callout"
4. Describe the problem
5. Select contractor
6. Set priority
7. Submit callout

CALLOUT TYPES:
- REACTIVE: Fix a breakdown
- PREVENTIVE: Scheduled maintenance
- INSPECTION: Safety or compliance check
- EMERGENCY: Urgent repair needed

CONTRACTOR ASSIGNMENT:
- Select from your contractor list
- System sends notification
- Contractor can accept/decline
- Track callout status

TROUBLESHOOTING:
- Answer yes/no questions
- Helps diagnose the problem
- Provides info to contractor
- May resolve issue without callout

TRACKING:
- View all callouts
- See status updates
- Track costs
- Review contractor performance$$,
'Create callouts for contractors, assign priority, track status and costs. Troubleshooting may resolve issues.',
'app_help', 'assetly',
ARRAY['assetly', 'callout', 'contractor', 'repair', 'maintenance', 'how to'],
'Assetly Documentation'),

-- ============================================================================
-- MSGLY MODULE CONTENT
-- ============================================================================

('Sending Announcements in Msgly',
$$Announcements help you communicate important information to your team.

CREATING ANNOUNCEMENTS:
1. Go to Msgly > Messages
2. Click "New Message"
3. Select "Announcement" type
4. Choose recipients (site, team, or all)
5. Write your message
6. Add attachments if needed
7. Send announcement

ANNOUNCEMENT TYPES:
- SITE-WIDE: All staff at a site
- TEAM: Specific team or department
- COMPANY-WIDE: All staff across all sites
- TARGETED: Specific individuals

FEATURES:
- @Mention specific people
- Attach files or images
- Format text (bold, lists)
- Schedule for later
- Pin important announcements

BEST PRACTICES:
- Keep messages clear and concise
- Use @mentions sparingly
- Pin critical information
- Archive old announcements
- Use appropriate channels$$,
'Create announcements for site, team, or company. Use @mentions, attachments, and pinning for important messages.',
'app_help', 'msgly',
ARRAY['msgly', 'messaging', 'announcements', 'communication', 'how to'],
'Msgly Documentation'),

('Creating Group Chats in Msgly',
$$Group chats allow teams to communicate and collaborate.

CREATING GROUPS:
1. Go to Msgly > Messages
2. Click "New Conversation"
3. Select "Group Chat"
4. Choose group name
5. Add members
6. Start chatting

GROUP TYPES:
- TEAM: Department or shift team
- PROJECT: Temporary project group
- SITE: All staff at a site
- CUSTOM: Your own group

GROUP FEATURES:
- @Mention members
- Share files and images
- React to messages
- Search message history
- Leave group if needed

MANAGING GROUPS:
- Add or remove members
- Change group name
- Set group description
- Archive inactive groups

BEST PRACTICES:
- Use clear group names
- Add relevant members only
- Keep conversations on-topic
- Archive when project ends$$,
'Create group chats for teams or projects. Add members, share files, use @mentions for collaboration.',
'app_help', 'msgly',
ARRAY['msgly', 'messaging', 'groups', 'team chat', 'collaboration', 'how to'],
'Msgly Documentation'),

('File Sharing in Msgly',
$$Sharing files helps teams collaborate and access important documents.

SHARING FILES:
1. In any conversation, click attachment icon
2. Select file from device
3. Add optional message
4. Send file

SUPPORTED FILES:
- Images (JPG, PNG, GIF)
- Documents (PDF, Word, Excel)
- Other common file types
- Max file size: 10MB

FILE FEATURES:
- Preview images in chat
- Download files
- View file details
- Share in multiple conversations

STORAGE:
- Files stored securely
- Accessible from any device
- Searchable in conversations
- Can be deleted if needed

BEST PRACTICES:
- Use descriptive filenames
- Compress large files
- Share in appropriate channels
- Clean up old files periodically$$,
'Share files in conversations. Supports images, documents, and other files up to 10MB.',
'app_help', 'msgly',
ARRAY['msgly', 'messaging', 'files', 'attachments', 'sharing', 'how to'],
'Msgly Documentation'),

('Team Communication in Msgly',
$$Effective team communication keeps everyone informed and aligned.

MESSAGE TYPES:
- DIRECT: One-on-one messages
- GROUP: Team or project chats
- ANNOUNCEMENTS: Important updates
- CHANNELS: Topic-based discussions

FEATURES:
- @Mentions to notify people
- Read receipts show who's seen messages
- Reactions for quick feedback
- Threads for organized discussions
- Search to find past messages

BEST PRACTICES:
- Use appropriate channels
- @Mention only when needed
- Keep messages clear and concise
- Respond in a timely manner
- Use threads for long discussions

NOTIFICATIONS:
- Get notified of @mentions
- Receive direct messages
- See group activity
- Customize notification settings

SEARCH:
- Search all conversations
- Find specific messages
- Filter by date, sender, content
- Quick access to information$$,
'Use direct messages, groups, and announcements. @Mentions, reactions, and search help with communication.',
'app_help', 'msgly',
ARRAY['msgly', 'messaging', 'communication', 'team', 'chat', 'how to'],
'Msgly Documentation');

-- Update search vectors for new entries
UPDATE public.knowledge_base 
SET search_vector = 
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(content, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(summary, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(array_to_string(tags, ' '), '')), 'D')
WHERE search_vector IS NULL;

COMMIT;
