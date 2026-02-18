'use client'

export default function ManagerGuideContent() {
  return (
    <div className="guide-content text-theme-primary">
      {/* ===== TABLE OF CONTENTS ===== */}
      <div className="bg-theme-muted/30 rounded-xl p-8 mb-8">
        <h3 className="text-lg font-semibold mb-4">Contents</h3>

        <div className="mb-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-theme-tertiary mb-2 pb-1 border-b-2 border-gray-300 dark:border-gray-600 inline-block">Getting Started</div>
          <ol className="ml-5 text-sm text-theme-secondary space-y-1">
            <li>Logging In &amp; First-Time Setup</li>
            <li>Navigating the App</li>
            <li>Site Filtering &amp; Context</li>
            <li>Your Profile &amp; Settings</li>
          </ol>
        </div>

        <div className="mb-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-teamly-dark dark:text-teamly mb-2 pb-1 border-b-2 border-teamly inline-block">Teamly &mdash; People &amp; Rotas</div>
          <ol className="ml-5 text-sm text-theme-secondary space-y-1" start={5}>
            <li>Adding Employees</li>
            <li>Managing Employee Profiles</li>
            <li>Departments &amp; Org Structure</li>
            <li>Setting Shift Rules (Working Time Directive)</li>
            <li>Building Rotas</li>
            <li>Staff Availability &amp; Requests</li>
            <li>Leave Management</li>
            <li>Time &amp; Attendance</li>
            <li>Training &amp; Compliance</li>
            <li>Onboarding New Starters</li>
            <li>Teamly Settings Reference</li>
          </ol>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-checkly-dark dark:text-checkly mb-2 pb-1 border-b-2 border-checkly inline-block">Checkly &mdash; Compliance &amp; Tasks</div>
          <ol className="ml-5 text-sm text-theme-secondary space-y-1" start={16}>
            <li>Understanding Task Templates</li>
            <li>Setting Up Compliance Templates</li>
            <li>Creating Custom Templates</li>
            <li>Scheduling Tasks for Your Site</li>
            <li>Managing Equipment for Temperature Checks</li>
            <li>Reviewing Completed Tasks</li>
            <li>Temperature Logs &amp; Breach Actions</li>
            <li>EHO Readiness Reports</li>
            <li>Checkly Reports &amp; Analytics</li>
          </ol>
        </div>
      </div>

      {/* ===== GETTING STARTED ===== */}
      <div className="guide-page-break" />

      <div className="guide-section-header general">
        <div className="guide-module-label general">Getting Started</div>
        <h2>1. Logging In &amp; First-Time Setup</h2>
      </div>

      <p className="mb-3 text-theme-secondary">You will receive an email invitation from Opsly with a link to set up your account.</p>

      <div className="space-y-3 my-4">
        <div className="guide-step bg-theme-muted/20" style={{ borderLeftColor: '#110f0d' }}>
          <div className="guide-step-number general">1</div>
          <div>
            <strong className="block mb-1">Open the invitation email</strong>
            <p className="text-sm text-theme-secondary">Click the setup link. You&apos;ll be taken to the account setup page.</p>
          </div>
        </div>
        <div className="guide-step bg-theme-muted/20" style={{ borderLeftColor: '#110f0d' }}>
          <div className="guide-step-number general">2</div>
          <div>
            <strong className="block mb-1">Set your password</strong>
            <p className="text-sm text-theme-secondary">Choose a secure password (minimum 6 characters). You can use the password generator if you prefer.</p>
          </div>
        </div>
        <div className="guide-step bg-theme-muted/20" style={{ borderLeftColor: '#110f0d' }}>
          <div className="guide-step-number general">3</div>
          <div>
            <strong className="block mb-1">Set your 4-digit PIN</strong>
            <p className="text-sm text-theme-secondary">This PIN is used for quick actions within the app (e.g. completing tasks, clocking in).</p>
          </div>
        </div>
        <div className="guide-step bg-theme-muted/20" style={{ borderLeftColor: '#110f0d' }}>
          <div className="guide-step-number general">4</div>
          <div>
            <strong className="block mb-1">Log in</strong>
            <p className="text-sm text-theme-secondary">Go to your Opsly URL and sign in with your email and password. You will land on the Dashboard.</p>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-200 mb-4">
        <strong className="block mb-1">Tip: Install as an App</strong>
        Opsly works as a Progressive Web App (PWA). On your phone, open the site in your browser and tap &ldquo;Add to Home Screen&rdquo; to install it like a native app. You&apos;ll get a full-screen experience with quick launch.
      </div>

      {/* Section 2 */}
      <div className="guide-section-header general">
        <div className="guide-module-label general">Getting Started</div>
        <h2>2. Navigating the App</h2>
      </div>

      <h3 className="text-base font-semibold mt-6 mb-3">Desktop Layout</h3>
      <p className="mb-3 text-theme-secondary">The app has three main navigation elements:</p>

      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-theme">
              <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-theme-tertiary font-semibold">Element</th>
              <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-theme-tertiary font-semibold">Location</th>
              <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-theme-tertiary font-semibold">What It Does</th>
            </tr>
          </thead>
          <tbody className="text-theme-secondary">
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Header Bar</td><td className="py-2 px-3">Top of screen</td><td className="py-2 px-3">Site filter, search, notifications, messages, theme toggle, profile, &ldquo;Ask Opsly&rdquo; AI assistant</td></tr>
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Module Bar</td><td className="py-2 px-3">Below header</td><td className="py-2 px-3">Switch between modules: <strong>Checkly</strong>, Stockly, <strong>Teamly</strong>, Assetly, Planly. Also has the Clock In/Out button.</td></tr>
            <tr><td className="py-2 px-3 font-medium text-theme-primary">Sidebar</td><td className="py-2 px-3">Left side</td><td className="py-2 px-3">Context-sensitive &mdash; shows navigation for whichever module you&apos;re in. Can be collapsed or pinned.</td></tr>
          </tbody>
        </table>
      </div>

      <p className="mb-3 text-theme-secondary">The <span className="px-2 py-0.5 rounded bg-theme-muted/50 text-xs font-medium">&#9776; Menu</span> button (top-right) opens the burger menu for Organisation settings, Reports, Workspace items, and Account settings.</p>

      <h3 className="text-base font-semibold mt-6 mb-3">Mobile Layout</h3>
      <p className="mb-3 text-theme-secondary">On mobile, the app uses a dedicated mobile interface:</p>
      <ul className="list-disc ml-6 space-y-1 text-theme-secondary mb-4">
        <li><strong>Bottom tab bar</strong> with 5 tabs: Home, Tasks, Calendar, Rota, More</li>
        <li><strong>More</strong> opens a sheet with quick actions and links to all modules</li>
        <li>Tap your <strong>avatar</strong> (top-right) for profile, site switching, and logout</li>
      </ul>

      {/* Section 3 */}
      <div className="guide-section-header general">
        <div className="guide-module-label general">Getting Started</div>
        <h2>3. Site Filtering &amp; Context</h2>
      </div>

      <p className="mb-3 text-theme-secondary">If your business has multiple sites, the <strong>Site Filter</strong> dropdown in the header controls which site&apos;s data you see throughout the app. Set it to a specific site or choose <strong>&ldquo;All Sites&rdquo;</strong> to see everything.</p>

      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200 mb-4">
        <strong className="block mb-1">Note:</strong> Staff members only see data for their assigned home site. The site filter is primarily for managers and admins who oversee multiple locations.
      </div>

      {/* Section 4 */}
      <div className="guide-section-header general">
        <div className="guide-module-label general">Getting Started</div>
        <h2>4. Your Profile &amp; Settings</h2>
      </div>

      <p className="mb-3 text-theme-secondary">Access your settings from the burger menu <span className="px-2 py-0.5 rounded bg-theme-muted/50 text-xs font-medium">&#9776;</span> &rarr; <span className="px-2 py-0.5 rounded bg-theme-muted/50 text-xs font-medium">Settings</span>.</p>

      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-theme">
              <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-theme-tertiary font-semibold">Tab</th>
              <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-theme-tertiary font-semibold">What You Can Do</th>
            </tr>
          </thead>
          <tbody className="text-theme-secondary">
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Profile</td><td className="py-2 px-3">Update your name, phone number, position title, home site, and password</td></tr>
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Appearance</td><td className="py-2 px-3">Switch between dark and light theme</td></tr>
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Notifications</td><td className="py-2 px-3">Configure email digests and in-app alerts for incidents, tasks, and temperature warnings</td></tr>
            <tr><td className="py-2 px-3 font-medium text-theme-primary">Company</td><td className="py-2 px-3">Upload company logo, update billing info (admin only)</td></tr>
          </tbody>
        </table>
      </div>

      {/* ===== TEAMLY ===== */}
      <div className="guide-page-break" />

      <div className="guide-section-header teamly">
        <div className="guide-module-label teamly">Teamly &mdash; People &amp; Rotas</div>
        <h2>5. Adding Employees</h2>
      </div>

      <p className="mb-3 text-theme-secondary">Navigate to Teamly by clicking <span className="px-2 py-0.5 rounded bg-theme-muted/50 text-xs font-medium">Teamly</span> in the Module Bar. In the sidebar, go to <strong>Employees</strong>.</p>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Teamly <span className="sep opacity-50">&rsaquo;</span> Employees <span className="sep opacity-50">&rsaquo;</span> Add Employee</span></p>

      <div className="space-y-3 my-4">
        <div className="guide-step teamly bg-theme-muted/20">
          <div className="guide-step-number teamly">1</div>
          <div>
            <strong className="block mb-1">Click &ldquo;Add Employee&rdquo;</strong>
            <p className="text-sm text-theme-secondary">You&apos;ll be asked to choose the type: <strong>Head Office / Executive</strong> (streamlined form) or <strong>Site-Based</strong> (full form with site assignment).</p>
          </div>
        </div>
        <div className="guide-step teamly bg-theme-muted/20">
          <div className="guide-step-number teamly">2</div>
          <div>
            <strong className="block mb-1">Fill in core details</strong>
            <p className="text-sm text-theme-secondary">Full name, email address, phone number, job title, and site assignment are the essentials. The email is used for their login.</p>
          </div>
        </div>
        <div className="guide-step teamly bg-theme-muted/20">
          <div className="guide-step-number teamly">3</div>
          <div>
            <strong className="block mb-1">Set their role</strong>
            <p className="text-sm text-theme-secondary">Choose the access level: <strong>Admin</strong> (full access), <strong>Manager</strong> (team management), or <strong>Staff</strong> (personal use only). This controls what they can see and do in the app.</p>
          </div>
        </div>
        <div className="guide-step teamly bg-theme-muted/20">
          <div className="guide-step-number teamly">4</div>
          <div>
            <strong className="block mb-1">Set employment details</strong>
            <p className="text-sm text-theme-secondary">Employment type (full-time, part-time, casual, etc.), contracted hours, start date, and BOH/FOH designation.</p>
          </div>
        </div>
        <div className="guide-step teamly bg-theme-muted/20">
          <div className="guide-step-number teamly">5</div>
          <div>
            <strong className="block mb-1">Send invitation</strong>
            <p className="text-sm text-theme-secondary">The employee will receive an email to set up their password and PIN. They can then log in and access the app.</p>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-200 mb-4">
        <strong className="block mb-1">Tip:</strong> You can add employees in bulk by providing a staff list to us during setup &mdash; we&apos;ll import them for you so they&apos;re ready to go on day one.
      </div>

      {/* Section 6 */}
      <div className="guide-section-header teamly">
        <div className="guide-module-label teamly">Teamly &mdash; People &amp; Rotas</div>
        <h2>6. Managing Employee Profiles</h2>
      </div>

      <p className="mb-3 text-theme-secondary">Click any employee name in the directory to open their full profile. The profile is organised into tabs:</p>

      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-theme">
              <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-theme-tertiary font-semibold">Tab</th>
              <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-theme-tertiary font-semibold">What It Contains</th>
            </tr>
          </thead>
          <tbody className="text-theme-secondary">
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Overview</td><td className="py-2 px-3">Position, department, site, contact info, emergency contacts. All fields editable inline.</td></tr>
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Documents</td><td className="py-2 px-3">Uploaded files (contracts, right-to-work, certifications)</td></tr>
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Leave</td><td className="py-2 px-3">Leave history, balances, and pending requests for this employee</td></tr>
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Training</td><td className="py-2 px-3">Training records and certification status with expiry tracking</td></tr>
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Attendance</td><td className="py-2 px-3">Clock-in/out history and attendance records</td></tr>
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Notes</td><td className="py-2 px-3">Manager notes and HR notes (private)</td></tr>
            <tr><td className="py-2 px-3 font-medium text-theme-primary">Pay</td><td className="py-2 px-3">Pay rate, salary, pay frequency, bank details</td></tr>
          </tbody>
        </table>
      </div>

      <p className="mb-3 text-theme-secondary">You can also edit key fields directly from the profile overview: position, department, site assignment, contracted hours, hourly rate, and reporting manager.</p>

      {/* Section 7 */}
      <div className="guide-section-header teamly">
        <div className="guide-module-label teamly">Teamly &mdash; People &amp; Rotas</div>
        <h2>7. Departments &amp; Org Structure</h2>
      </div>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Teamly <span className="sep opacity-50">&rsaquo;</span> Settings <span className="sep opacity-50">&rsaquo;</span> Departments</span></p>

      <p className="mb-3 text-theme-secondary">Create departments to organise your team (e.g. Kitchen, Front of House, Bar, Management). Departments can be hierarchical &mdash; a department can sit under a parent department.</p>

      <p className="mb-3 text-theme-secondary">You can also view the <strong>Org Chart</strong> via <span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Teamly <span className="sep opacity-50">&rsaquo;</span> Employees <span className="sep opacity-50">&rsaquo;</span> Org Chart</span> to see reporting lines and team structure visually.</p>

      {/* Section 8 */}
      <div className="guide-section-header teamly">
        <div className="guide-module-label teamly">Teamly &mdash; People &amp; Rotas</div>
        <h2>8. Setting Shift Rules (Working Time Directive)</h2>
      </div>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Teamly <span className="sep opacity-50">&rsaquo;</span> Settings <span className="sep opacity-50">&rsaquo;</span> Shift Rules</span></p>

      <p className="mb-3 text-theme-secondary">Shift rules ensure your rotas comply with the Working Time Directive. Default values are pre-configured but you should review them for your business:</p>

      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-theme">
              <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-theme-tertiary font-semibold">Rule</th>
              <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-theme-tertiary font-semibold">Default</th>
              <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-theme-tertiary font-semibold">What It Means</th>
            </tr>
          </thead>
          <tbody className="text-theme-secondary">
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Max weekly hours</td><td className="py-2 px-3">48 hours</td><td className="py-2 px-3">Maximum average hours per week (over 17-week reference period)</td></tr>
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Min rest between shifts</td><td className="py-2 px-3">11 hours</td><td className="py-2 px-3">Minimum gap between end of one shift and start of the next</td></tr>
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Weekly rest</td><td className="py-2 px-3">24 hours per week</td><td className="py-2 px-3">Minimum continuous rest period per week</td></tr>
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Break threshold</td><td className="py-2 px-3">6 hours</td><td className="py-2 px-3">Shift length after which a break is required</td></tr>
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Break duration</td><td className="py-2 px-3">20 minutes</td><td className="py-2 px-3">Minimum break length when threshold is exceeded</td></tr>
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Paid breaks</td><td className="py-2 px-3">No</td><td className="py-2 px-3">Whether breaks are paid or unpaid</td></tr>
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Night shift window</td><td className="py-2 px-3">23:00 &ndash; 06:00</td><td className="py-2 px-3">Hours considered &ldquo;night work&rdquo;</td></tr>
            <tr><td className="py-2 px-3 font-medium text-theme-primary">Max night shift hours</td><td className="py-2 px-3">8 hours</td><td className="py-2 px-3">Maximum shift length during night window</td></tr>
          </tbody>
        </table>
      </div>

      <p className="mb-3 text-theme-secondary">The system will warn you on the rota if any shift assignment breaches these rules.</p>

      {/* Section 9 */}
      <div className="guide-section-header teamly">
        <div className="guide-module-label teamly">Teamly &mdash; People &amp; Rotas</div>
        <h2>9. Building Rotas</h2>
      </div>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Teamly <span className="sep opacity-50">&rsaquo;</span> Schedule <span className="sep opacity-50">&rsaquo;</span> Rota</span></p>

      <p className="mb-3 text-theme-secondary">The Rota is a weekly drag-and-drop schedule planner. Here&apos;s how to build one:</p>

      <div className="space-y-3 my-4">
        <div className="guide-step teamly bg-theme-muted/20">
          <div className="guide-step-number teamly">1</div>
          <div>
            <strong className="block mb-1">Select the week</strong>
            <p className="text-sm text-theme-secondary">Use the week navigator at the top. Weeks always start on Monday.</p>
          </div>
        </div>
        <div className="guide-step teamly bg-theme-muted/20">
          <div className="guide-step-number teamly">2</div>
          <div>
            <strong className="block mb-1">Add shifts</strong>
            <p className="text-sm text-theme-secondary">Click on any cell in the grid (employee row + day column) to create a shift. Choose a shift pattern (e.g. Morning 06:00&ndash;14:00, Evening 16:00&ndash;00:00) or set custom times.</p>
          </div>
        </div>
        <div className="guide-step teamly bg-theme-muted/20">
          <div className="guide-step-number teamly">3</div>
          <div>
            <strong className="block mb-1">Drag and drop</strong>
            <p className="text-sm text-theme-secondary">Move shifts between days or employees by dragging them. The system prevents double-booking automatically.</p>
          </div>
        </div>
        <div className="guide-step teamly bg-theme-muted/20">
          <div className="guide-step-number teamly">4</div>
          <div>
            <strong className="block mb-1">Review labour costs</strong>
            <p className="text-sm text-theme-secondary">The rota shows running totals of labour cost (based on hourly rates and shift hours). You can set a target labour cost and target covers for the week.</p>
          </div>
        </div>
        <div className="guide-step teamly bg-theme-muted/20">
          <div className="guide-step-number teamly">5</div>
          <div>
            <strong className="block mb-1">Copy a week</strong>
            <p className="text-sm text-theme-secondary">Use the <span className="px-2 py-0.5 rounded bg-theme-muted/50 text-xs font-medium">Copy Week</span> button to duplicate a rota to another week &mdash; great for repeating patterns.</p>
          </div>
        </div>
        <div className="guide-step teamly bg-theme-muted/20">
          <div className="guide-step-number teamly">6</div>
          <div>
            <strong className="block mb-1">Publish</strong>
            <p className="text-sm text-theme-secondary">When you&apos;re happy, publish the rota. Staff will be notified and can view their shifts in the app.</p>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200 mb-4">
        <strong className="block mb-1">Shift Patterns:</strong> Six default patterns are pre-loaded (Morning, Day, Afternoon, Evening, Close, Split). You can create custom patterns in Teamly Settings with your own names, times, colours, and break durations.
      </div>

      <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200 mb-4">
        <strong className="block mb-1">WTD Warnings:</strong> If a shift breaches the Working Time Directive rules (e.g. less than 11 hours rest between shifts), the system will flag it on the rota. You can still proceed, but the warning is logged.
      </div>

      {/* Section 10 */}
      <div className="guide-section-header teamly">
        <div className="guide-module-label teamly">Teamly &mdash; People &amp; Rotas</div>
        <h2>10. Staff Availability &amp; Requests</h2>
      </div>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Teamly <span className="sep opacity-50">&rsaquo;</span> Schedule <span className="sep opacity-50">&rsaquo;</span> Availability</span></p>

      <p className="mb-3 text-theme-secondary">Staff can set their own availability, which is visible when you&apos;re building the rota.</p>

      <h4 className="text-sm font-semibold mt-5 mb-2">Two types of availability:</h4>
      <ul className="list-disc ml-6 space-y-1 text-theme-secondary mb-4">
        <li><strong>Recurring</strong> &mdash; weekly patterns (e.g. &ldquo;available Monday&ndash;Friday 09:00&ndash;18:00&rdquo;)</li>
        <li><strong>Specific dates</strong> &mdash; overrides for particular days (e.g. &ldquo;unavailable 15th March&rdquo;)</li>
      </ul>

      <p className="mb-3 text-theme-secondary">Staff can also mark times as <strong>preferred</strong> and set maximum hours per day.</p>

      <h4 className="text-sm font-semibold mt-5 mb-2">Availability Requests</h4>
      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Teamly <span className="sep opacity-50">&rsaquo;</span> Schedule <span className="sep opacity-50">&rsaquo;</span> Availability <span className="sep opacity-50">&rsaquo;</span> Requests</span></p>
      <p className="mb-3 text-theme-secondary">When staff submit availability changes, they appear here for manager approval.</p>

      {/* Section 11 */}
      <div className="guide-section-header teamly">
        <div className="guide-module-label teamly">Teamly &mdash; People &amp; Rotas</div>
        <h2>11. Leave Management</h2>
      </div>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Teamly <span className="sep opacity-50">&rsaquo;</span> Leave</span></p>

      <h3 className="text-base font-semibold mt-6 mb-3">Leave Overview</h3>
      <p className="mb-3 text-theme-secondary">Shows a monthly calendar of approved leave plus a list of pending requests. From here you can <strong>approve</strong> or <strong>decline</strong> leave requests with an optional reason.</p>

      <h3 className="text-base font-semibold mt-6 mb-3">Leave Balances</h3>
      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Teamly <span className="sep opacity-50">&rsaquo;</span> Leave <span className="sep opacity-50">&rsaquo;</span> Balances</span></p>
      <p className="mb-3 text-theme-secondary">View and manage leave entitlements for all employees:</p>
      <ul className="list-disc ml-6 space-y-1 text-theme-secondary mb-4">
        <li>Entitled days, carried over, taken, pending, and remaining</li>
        <li>Filter by leave type, employee, or site</li>
        <li>Supports both day-based and hourly leave calculations</li>
      </ul>

      <h3 className="text-base font-semibold mt-6 mb-3">Team Calendar</h3>
      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Teamly <span className="sep opacity-50">&rsaquo;</span> Leave <span className="sep opacity-50">&rsaquo;</span> Team Calendar</span></p>
      <p className="mb-3 text-theme-secondary">At-a-glance view of who is off and when, across the whole team.</p>

      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200 mb-4">
        <strong className="block mb-1">Default Leave Types:</strong> Seven types are pre-configured: Annual Leave, Sick Leave, TOIL, Unpaid Leave, Compassionate Leave, Maternity Leave, Paternity Leave. Each can be customised (paid/unpaid, requires approval, half-days, carry-over rules, etc.).
      </div>

      {/* Section 12 */}
      <div className="guide-section-header teamly">
        <div className="guide-module-label teamly">Teamly &mdash; People &amp; Rotas</div>
        <h2>12. Time &amp; Attendance</h2>
      </div>

      <h3 className="text-base font-semibold mt-6 mb-3">Clock In / Out</h3>
      <p className="mb-3 text-theme-secondary">The <span className="px-2 py-0.5 rounded bg-theme-muted/50 text-xs font-medium">Clock In</span> button is always available in the Module Bar (top-right on desktop). Staff clock in at the start of their shift and out when they finish.</p>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Teamly <span className="sep opacity-50">&rsaquo;</span> Attendance <span className="sep opacity-50">&rsaquo;</span> Time Clock</span></p>
      <p className="mb-3 text-theme-secondary">This page shows today&apos;s clock-in records. You can view by day or by week.</p>

      <h3 className="text-base font-semibold mt-6 mb-3">Timesheets</h3>
      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Teamly <span className="sep opacity-50">&rsaquo;</span> Attendance <span className="sep opacity-50">&rsaquo;</span> Timesheets</span></p>
      <p className="mb-3 text-theme-secondary">Weekly timesheet sign-off. As a manager, you can:</p>
      <ul className="list-disc ml-6 space-y-1 text-theme-secondary mb-4">
        <li>Review hours for each employee against their scheduled shifts</li>
        <li>Lock/unlock timesheets</li>
        <li>Approve timesheets for payroll submission</li>
      </ul>

      {/* Section 13 */}
      <div className="guide-section-header teamly">
        <div className="guide-module-label teamly">Teamly &mdash; People &amp; Rotas</div>
        <h2>13. Training &amp; Compliance</h2>
      </div>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Teamly <span className="sep opacity-50">&rsaquo;</span> Training</span></p>

      <h3 className="text-base font-semibold mt-6 mb-3">Training Overview</h3>
      <p className="mb-3 text-theme-secondary">Dashboard showing certification status across five categories:</p>
      <ul className="list-disc ml-6 space-y-1 text-theme-secondary mb-4">
        <li>Food Safety (Levels 1&ndash;4)</li>
        <li>Health &amp; Safety</li>
        <li>Fire Marshal</li>
        <li>First Aid</li>
        <li>COSHH / Allergen Awareness</li>
      </ul>
      <p className="mb-3 text-theme-secondary">Expiring and expired certifications are highlighted with alerts.</p>

      <h3 className="text-base font-semibold mt-6 mb-3">Compliance Matrix</h3>
      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Teamly <span className="sep opacity-50">&rsaquo;</span> Training <span className="sep opacity-50">&rsaquo;</span> Compliance Matrix</span></p>
      <p className="mb-3 text-theme-secondary">A grid showing every employee against every required course, with colour-coded status (valid, expiring, expired, not started). This is your one-stop view for audit readiness.</p>

      <h3 className="text-base font-semibold mt-6 mb-3">Recording Training</h3>
      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Teamly <span className="sep opacity-50">&rsaquo;</span> Training <span className="sep opacity-50">&rsaquo;</span> Record Training</span></p>
      <p className="mb-3 text-theme-secondary">Log a completed training course for any employee: select the course, enter the completion date, expiry date, and certificate reference.</p>

      {/* Section 14 */}
      <div className="guide-section-header teamly">
        <div className="guide-module-label teamly">Teamly &mdash; People &amp; Rotas</div>
        <h2>14. Onboarding New Starters</h2>
      </div>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Teamly <span className="sep opacity-50">&rsaquo;</span> Onboarding</span></p>

      <h3 className="text-base font-semibold mt-6 mb-3">Setting Up Onboarding Packs</h3>
      <div className="space-y-3 my-4">
        <div className="guide-step teamly bg-theme-muted/20">
          <div className="guide-step-number teamly">1</div>
          <div>
            <strong className="block mb-1">Upload company documents</strong>
            <p className="text-sm text-theme-secondary">Go to <strong>Company Docs</strong> and upload your standard onboarding documents (handbook, policies, contracts, uniform guide, etc.).</p>
          </div>
        </div>
        <div className="guide-step teamly bg-theme-muted/20">
          <div className="guide-step-number teamly">2</div>
          <div>
            <strong className="block mb-1">Create an onboarding pack</strong>
            <p className="text-sm text-theme-secondary">Go to <strong>Packs</strong> and create a pack. You can filter packs by staff type (BOH/FOH) and employment type (full-time/part-time). Select which documents to include.</p>
          </div>
        </div>
        <div className="guide-step teamly bg-theme-muted/20">
          <div className="guide-step-number teamly">3</div>
          <div>
            <strong className="block mb-1">Assign to new starters</strong>
            <p className="text-sm text-theme-secondary">The <strong>People to Onboard</strong> page shows employees who haven&apos;t been assigned a pack. Assign the appropriate pack to each new starter.</p>
          </div>
        </div>
        <div className="guide-step teamly bg-theme-muted/20">
          <div className="guide-step-number teamly">4</div>
          <div>
            <strong className="block mb-1">Staff acknowledge their documents</strong>
            <p className="text-sm text-theme-secondary">New starters see their assigned pack under <strong>My Docs</strong>. They can download, read, and acknowledge each document.</p>
          </div>
        </div>
      </div>

      {/* Section 15 */}
      <div className="guide-section-header teamly">
        <div className="guide-module-label teamly">Teamly &mdash; People &amp; Rotas</div>
        <h2>15. Teamly Settings Reference</h2>
      </div>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Teamly <span className="sep opacity-50">&rsaquo;</span> Settings</span></p>

      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-theme">
              <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-theme-tertiary font-semibold">Setting</th>
              <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-theme-tertiary font-semibold">What You Configure</th>
            </tr>
          </thead>
          <tbody className="text-theme-secondary">
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">General</td><td className="py-2 px-3">Company working hours, standard business hours per day, planned closures</td></tr>
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Sites</td><td className="py-2 px-3">Site details, addresses, operating hours, timezone, general manager assignment</td></tr>
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Departments</td><td className="py-2 px-3">Department structure (hierarchical), contact details per department</td></tr>
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Areas &amp; Regions</td><td className="py-2 px-3">Geographic grouping of sites, regional and area manager assignments</td></tr>
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Approval Workflows</td><td className="py-2 px-3">Approval chains for rota, payroll, leave, and expenses</td></tr>
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Roles &amp; Permissions</td><td className="py-2 px-3">Custom roles with granular permissions matrix</td></tr>
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Shift Rules</td><td className="py-2 px-3">Working Time Directive compliance settings (see Section 8)</td></tr>
            <tr><td className="py-2 px-3 font-medium text-theme-primary">Notifications</td><td className="py-2 px-3">Notification channels and types: shift reminders, rota published, leave requests, timesheet reminders, etc.</td></tr>
          </tbody>
        </table>
      </div>

      {/* ===== CHECKLY ===== */}
      <div className="guide-page-break" />

      <div className="guide-section-header checkly">
        <div className="guide-module-label checkly">Checkly &mdash; Compliance &amp; Tasks</div>
        <h2>16. Understanding Task Templates</h2>
      </div>

      <p className="mb-3 text-theme-secondary">Checkly is built around <strong>task templates</strong>. A template defines a repeating check or task (e.g. &ldquo;Open Kitchen Temperature Check&rdquo;, &ldquo;End of Day Cleaning Checklist&rdquo;). Each template specifies:</p>

      <ul className="list-disc ml-6 space-y-1 text-theme-secondary mb-4">
        <li><strong>Category</strong> &mdash; Food Safety, Health &amp; Safety, Fire Safety, Cleaning, Compliance, or Maintenance</li>
        <li><strong>Frequency</strong> &mdash; Daily, Weekly, Monthly, Annually, On Demand, or Once</li>
        <li><strong>Daypart</strong> &mdash; When in the day: Before Open, During Service, After Service, or Anytime</li>
        <li><strong>Fields</strong> &mdash; What data needs to be captured: checklists, temperatures, yes/no questions, photos, signatures, notes</li>
        <li><strong>Compliance Standard</strong> &mdash; Which standard it satisfies (e.g. HACCP, Safer Food Better Business, Food Safety Act 1990, Natasha&apos;s Law)</li>
        <li><strong>Critical flag</strong> &mdash; Whether it&apos;s a critical control point</li>
      </ul>

      <p className="mb-3 text-theme-secondary">There are two sources of templates:</p>
      <ol className="list-decimal ml-6 space-y-1 text-theme-secondary mb-4">
        <li><strong>Compliance Library</strong> &mdash; Pre-built templates covering standard EHO requirements (ready to use)</li>
        <li><strong>Custom Templates</strong> &mdash; Templates you create yourself for your specific business needs</li>
      </ol>

      {/* Section 17 */}
      <div className="guide-section-header checkly">
        <div className="guide-module-label checkly">Checkly &mdash; Compliance &amp; Tasks</div>
        <h2>17. Setting Up Compliance Templates</h2>
      </div>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Checkly <span className="sep opacity-50">&rsaquo;</span> Templates <span className="sep opacity-50">&rsaquo;</span> Compliance Templates</span></p>

      <p className="mb-3 text-theme-secondary">The Compliance Library contains pre-built templates for standard EHO requirements. These cover the checks you&apos;d typically need for an inspection.</p>

      <div className="space-y-3 my-4">
        <div className="guide-step checkly bg-theme-muted/20">
          <div className="guide-step-number checkly">1</div>
          <div>
            <strong className="block mb-1">Browse the library</strong>
            <p className="text-sm text-theme-secondary">Templates are shown as cards with their category, frequency, compliance standard, and whether they&apos;re critical. Use the search bar or category filter to find what you need.</p>
          </div>
        </div>
        <div className="guide-step checkly bg-theme-muted/20">
          <div className="guide-step-number checkly">2</div>
          <div>
            <strong className="block mb-1">Click &ldquo;Use Template&rdquo;</strong>
            <p className="text-sm text-theme-secondary">This opens the scheduling modal where you configure how and when this task runs at your site.</p>
          </div>
        </div>
        <div className="guide-step checkly bg-theme-muted/20">
          <div className="guide-step-number checkly">3</div>
          <div>
            <strong className="block mb-1">Set the schedule</strong>
            <p className="text-sm text-theme-secondary">Choose which dayparts it should appear in (e.g. Before Open at 07:00, During Service at 12:00) and which days of the week. For temperature checks, configure which equipment to monitor (see Section 20).</p>
          </div>
        </div>
        <div className="guide-step checkly bg-theme-muted/20">
          <div className="guide-step-number checkly">4</div>
          <div>
            <strong className="block mb-1">Activate</strong>
            <p className="text-sm text-theme-secondary">Once saved, the system will automatically generate task instances according to your schedule. They&apos;ll appear in Today&apos;s Tasks for your staff.</p>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-200 mb-4">
        <strong className="block mb-1">Tip:</strong> A green badge on a template card showing &ldquo;X in use&rdquo; means it&apos;s already active at your site. You can have multiple schedules for the same template (e.g. temperature checks at different times).
      </div>

      {/* Section 18 */}
      <div className="guide-section-header checkly">
        <div className="guide-module-label checkly">Checkly &mdash; Compliance &amp; Tasks</div>
        <h2>18. Creating Custom Templates</h2>
      </div>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Checkly <span className="sep opacity-50">&rsaquo;</span> Templates <span className="sep opacity-50">&rsaquo;</span> Custom Templates</span></p>

      <p className="mb-3 text-theme-secondary">If you need a check that isn&apos;t in the compliance library, create your own:</p>

      <div className="space-y-3 my-4">
        <div className="guide-step checkly bg-theme-muted/20">
          <div className="guide-step-number checkly">1</div>
          <div>
            <strong className="block mb-1">Click the + button</strong>
            <p className="text-sm text-theme-secondary">This opens the Template Builder.</p>
          </div>
        </div>
        <div className="guide-step checkly bg-theme-muted/20">
          <div className="guide-step-number checkly">2</div>
          <div>
            <strong className="block mb-1">Define the template</strong>
            <p className="text-sm text-theme-secondary">Give it a name, select a category, set the frequency and dayparts, and add instructions for staff.</p>
          </div>
        </div>
        <div className="guide-step checkly bg-theme-muted/20">
          <div className="guide-step-number checkly">3</div>
          <div>
            <strong className="block mb-1">Add fields</strong>
            <p className="text-sm text-theme-secondary">Build the checklist by adding fields. Available field types:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1 text-sm text-theme-secondary">
              <li><strong>Checklist item</strong> &mdash; tick/untick</li>
              <li><strong>Yes / No</strong> &mdash; pass/fail question</li>
              <li><strong>Temperature</strong> &mdash; number entry with min/max thresholds</li>
              <li><strong>Number</strong> &mdash; any numeric value with optional warn/fail thresholds</li>
              <li><strong>Text</strong> &mdash; free-text entry</li>
              <li><strong>Photo</strong> &mdash; camera/upload</li>
              <li><strong>Signature</strong> &mdash; sign-off</li>
              <li><strong>Date / Time</strong> &mdash; date or time picker</li>
              <li><strong>Select</strong> &mdash; dropdown choice</li>
            </ul>
          </div>
        </div>
        <div className="guide-step checkly bg-theme-muted/20">
          <div className="guide-step-number checkly">4</div>
          <div>
            <strong className="block mb-1">Set evidence requirements</strong>
            <p className="text-sm text-theme-secondary">Specify what evidence types are required (photo, signature, notes, etc.).</p>
          </div>
        </div>
        <div className="guide-step checkly bg-theme-muted/20">
          <div className="guide-step-number checkly">5</div>
          <div>
            <strong className="block mb-1">Save and schedule</strong>
            <p className="text-sm text-theme-secondary">Save the template, then click it to schedule it at your site (same process as compliance templates).</p>
          </div>
        </div>
      </div>

      {/* Section 19 */}
      <div className="guide-section-header checkly">
        <div className="guide-module-label checkly">Checkly &mdash; Compliance &amp; Tasks</div>
        <h2>19. Scheduling Tasks for Your Site</h2>
      </div>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Checkly <span className="sep opacity-50">&rsaquo;</span> Tasks <span className="sep opacity-50">&rsaquo;</span> My Tasks</span></p>

      <p className="mb-3 text-theme-secondary">The <strong>My Tasks</strong> page shows all active task schedules (site checklists) for your site. Each entry represents a recurring task with its configuration.</p>

      <h4 className="text-sm font-semibold mt-5 mb-2">What you can do here:</h4>
      <ul className="list-disc ml-6 space-y-1 text-theme-secondary mb-4">
        <li><strong>View</strong> all active task schedules with their frequency, times, and equipment</li>
        <li><strong>Edit</strong> a schedule &mdash; change times, days, equipment configuration</li>
        <li><strong>Delete</strong> a schedule &mdash; stops generating future tasks (existing completed tasks are preserved in the audit trail)</li>
      </ul>

      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200 mb-4">
        <strong className="block mb-1">How task generation works:</strong> A background process runs daily and creates individual task instances from your schedules. For example, if you have &ldquo;Fridge Temperature Check&rdquo; scheduled daily at 07:00, 12:00, and 17:00, three task cards will appear in Today&apos;s Tasks each day.
      </div>

      {/* Section 20 */}
      <div className="guide-section-header checkly">
        <div className="guide-module-label checkly">Checkly &mdash; Compliance &amp; Tasks</div>
        <h2>20. Managing Equipment for Temperature Checks</h2>
      </div>

      <p className="mb-3 text-theme-secondary">For temperature-based tasks, you need to tell the system which pieces of equipment to monitor.</p>

      <div className="space-y-3 my-4">
        <div className="guide-step checkly bg-theme-muted/20">
          <div className="guide-step-number checkly">1</div>
          <div>
            <strong className="block mb-1">Register your equipment</strong>
            <p className="text-sm text-theme-secondary">Go to <span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Checkly <span className="sep opacity-50">&rsaquo;</span> Equipment <span className="sep opacity-50">&rsaquo;</span> Assets</span> and add each piece of equipment (fridges, freezers, hot-hold units, dishwashers, etc.). Give each a nickname (e.g. &ldquo;Walk-in Fridge&rdquo;, &ldquo;Bar Fridge 1&rdquo;).</p>
          </div>
        </div>
        <div className="guide-step checkly bg-theme-muted/20">
          <div className="guide-step-number checkly">2</div>
          <div>
            <strong className="block mb-1">Set temperature ranges</strong>
            <p className="text-sm text-theme-secondary">For each piece of equipment, set the acceptable min and max temperatures. The system handles inverted ranges for freezers automatically (e.g. &minus;22&deg;C to &minus;18&deg;C).</p>
          </div>
        </div>
        <div className="guide-step checkly bg-theme-muted/20">
          <div className="guide-step-number checkly">3</div>
          <div>
            <strong className="block mb-1">Link to task schedules</strong>
            <p className="text-sm text-theme-secondary">When scheduling a temperature check template, you&apos;ll be asked to configure which equipment it covers. Select the relevant assets and they&apos;ll appear as individual fields when staff complete the task.</p>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200 mb-4">
        <strong className="block mb-1">Temperature Breaches:</strong> If a recorded temperature falls outside the acceptable range, the system automatically flags it and creates a follow-up action. This may trigger a re-check task or a contractor callout, depending on your configuration.
      </div>

      {/* Section 21 */}
      <div className="guide-section-header checkly">
        <div className="guide-module-label checkly">Checkly &mdash; Compliance &amp; Tasks</div>
        <h2>21. Reviewing Completed Tasks</h2>
      </div>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Checkly <span className="sep opacity-50">&rsaquo;</span> Tasks <span className="sep opacity-50">&rsaquo;</span> Completed</span></p>

      <p className="mb-3 text-theme-secondary">This is your audit trail. Every completed (and missed) task is recorded here with full details.</p>

      <h4 className="text-sm font-semibold mt-5 mb-2">Filtering options:</h4>
      <ul className="list-disc ml-6 space-y-1 text-theme-secondary mb-4">
        <li><strong>Task Type</strong> &mdash; filter by category</li>
        <li><strong>Completed By</strong> &mdash; filter by staff member</li>
        <li><strong>Status</strong> &mdash; All, With Issues, Missed, Late, Outside Time Window, No Issues</li>
      </ul>

      <p className="mb-3 text-theme-secondary">Click any completed task to open the <strong>Task Detail</strong> view showing:</p>
      <ul className="list-disc ml-6 space-y-1 text-theme-secondary mb-4">
        <li>Completion timestamp and who completed it</li>
        <li>Duration (how long it took)</li>
        <li>All captured data: checklist items, temperatures, yes/no answers</li>
        <li>Photo evidence (click to view full-screen)</li>
        <li>Whether it was flagged, and the flag reason</li>
        <li>Linked waste records (if applicable)</li>
      </ul>

      {/* Section 22 */}
      <div className="guide-section-header checkly">
        <div className="guide-module-label checkly">Checkly &mdash; Compliance &amp; Tasks</div>
        <h2>22. Temperature Logs &amp; Breach Actions</h2>
      </div>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Checkly <span className="sep opacity-50">&rsaquo;</span> Logs <span className="sep opacity-50">&rsaquo;</span> Temperature Logs</span></p>

      <p className="mb-3 text-theme-secondary">A dedicated view of all temperature readings across your equipment, with trend charts.</p>

      <h4 className="text-sm font-semibold mt-5 mb-2">What you see:</h4>
      <ul className="list-disc ml-6 space-y-1 text-theme-secondary mb-4">
        <li>Each reading shows: equipment name, temperature, status (In Range / Out of Range / Not Recorded), who recorded it, and when</li>
        <li>Trend sparklines per piece of equipment</li>
        <li>Filter by equipment, date range, or status</li>
        <li>Export / download capability</li>
      </ul>

      <h4 className="text-sm font-semibold mt-5 mb-2">Breach Actions</h4>
      <p className="mb-3 text-theme-secondary">When a temperature breach is detected:</p>
      <ol className="list-decimal ml-6 space-y-1 text-theme-secondary mb-4">
        <li>The system creates a follow-up action automatically</li>
        <li>It appears in <strong>Today&apos;s Tasks</strong> under &ldquo;Temperature Breach Follow-ups&rdquo;</li>
        <li>Depending on configuration, it may trigger a contractor callout (e.g. for a faulty fridge)</li>
        <li>The breach and its resolution are tracked until closed</li>
      </ol>

      {/* Section 23 */}
      <div className="guide-section-header checkly">
        <div className="guide-module-label checkly">Checkly &mdash; Compliance &amp; Tasks</div>
        <h2>23. EHO Readiness Reports</h2>
      </div>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">&#9776; Menu <span className="sep opacity-50">&rsaquo;</span> Workspace <span className="sep opacity-50">&rsaquo;</span> EHO Readiness</span></p>

      <p className="mb-3 text-theme-secondary">Generate a compliance readiness report ahead of an Environmental Health Officer visit.</p>

      <div className="space-y-3 my-4">
        <div className="guide-step checkly bg-theme-muted/20">
          <div className="guide-step-number checkly">1</div>
          <div>
            <strong className="block mb-1">Select your site and date range</strong>
            <p className="text-sm text-theme-secondary">Choose the site and the period you want to report on.</p>
          </div>
        </div>
        <div className="guide-step checkly bg-theme-muted/20">
          <div className="guide-step-number checkly">2</div>
          <div>
            <strong className="block mb-1">Review the readiness score</strong>
            <p className="text-sm text-theme-secondary">The report shows an overall compliance readiness percentage and a breakdown by category: total tasks, completed, missed, completion rate, average completion time, and flagged completions.</p>
          </div>
        </div>
        <div className="guide-step checkly bg-theme-muted/20">
          <div className="guide-step-number checkly">3</div>
          <div>
            <strong className="block mb-1">Download or archive</strong>
            <p className="text-sm text-theme-secondary">Export the report as a file or archive it for future reference.</p>
          </div>
        </div>
      </div>

      {/* Section 24 */}
      <div className="guide-section-header checkly">
        <div className="guide-module-label checkly">Checkly &mdash; Compliance &amp; Tasks</div>
        <h2>24. Checkly Reports &amp; Analytics</h2>
      </div>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">&#9776; Menu <span className="sep opacity-50">&rsaquo;</span> Workspace <span className="sep opacity-50">&rsaquo;</span> Reports <span className="sep opacity-50">&rsaquo;</span> Checkly tab</span></p>

      <p className="mb-3 text-theme-secondary">The Checkly Reports page provides five analytical views:</p>

      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-theme">
              <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-theme-tertiary font-semibold">Tab</th>
              <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-theme-tertiary font-semibold">What It Shows</th>
            </tr>
          </thead>
          <tbody className="text-theme-secondary">
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Compliance</td><td className="py-2 px-3">KPI metrics: total tasks, completion rate, missed rate, flagged rate</td></tr>
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Assets</td><td className="py-2 px-3">Per-asset task completion performance &mdash; which equipment is well-monitored and which isn&apos;t</td></tr>
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Tasks</td><td className="py-2 px-3">Completion rate trends over time, task performance analytics</td></tr>
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Temperature</td><td className="py-2 px-3">Temperature compliance rates, breach frequency, in-range percentages</td></tr>
            <tr><td className="py-2 px-3 font-medium text-theme-primary">Incidents</td><td className="py-2 px-3">Incident data: food poisoning, customer complaints, staff sickness, storage incidents</td></tr>
          </tbody>
        </table>
      </div>

      <p className="mb-3 text-theme-secondary">All reports support date range filtering and site filtering.</p>

      <hr className="border-t border-theme my-8" />

      <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-200 mb-4">
        <strong className="block mb-1">Need help?</strong>
        <ul className="list-disc ml-5 mt-2 space-y-1">
          <li><strong>In-app:</strong> Click the &ldquo;Ask Opsly&rdquo; button (top-right) for AI-assisted help</li>
          <li><strong>Help Centre:</strong> &#9776; Menu &rarr; Help &amp; Support</li>
          <li><strong>Email:</strong> hello@opslytech.com</li>
          <li><strong>Phone:</strong> +44 07891 710002 (Mon&ndash;Fri 9am&ndash;6pm)</li>
        </ul>
      </div>

      <div className="text-center pt-10 mt-16 border-t border-theme text-xs text-theme-tertiary">
        opsly. &mdash; Manager Guide &mdash; Beta Edition February 2026<br />
        &copy; 2026 Opsly Technologies Ltd. All rights reserved. Confidential.
      </div>
    </div>
  )
}
