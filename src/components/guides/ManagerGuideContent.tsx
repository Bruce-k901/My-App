'use client'

import { useState, useEffect } from 'react'

export default function ManagerGuideContent() {
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <style jsx global>{`
        .guide-content {
          max-width: 800px;
          margin: 0 auto;
          font-size: 11pt;
          line-height: 1.6;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        @media print {
          .guide-content { font-size: 10pt; }
          .guide-page-break { page-break-before: always; }
          .guide-no-break { page-break-inside: avoid; }
          .guide-no-print { display: none !important; }
        }
        .guide-section-header {
          padding: 20px 0;
          margin: 40px 0 24px 0;
          border-bottom: 3px solid;
        }
        .guide-section-header.teamly { border-color: #D37E91; }
        .guide-section-header.checkly { border-color: #F1E194; }
        .guide-section-header.stockly { border-color: #789A99; }
        .guide-section-header.assetly { border-color: #F3E7D9; }
        .guide-section-header.planly { border-color: #ACC8A2; }
        .guide-section-header.msgly { border-color: #CBDDE9; }
        .guide-section-header.general { border-color: #110f0d; }
        @media (prefers-color-scheme: dark) {
          .guide-section-header.general { border-color: #a09890; }
        }
        .dark .guide-section-header.general { border-color: #a09890; }
        .dark .guide-section-header.assetly { border-color: #544349; }
        .guide-section-header h2 {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .guide-module-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        .guide-module-label.teamly { color: #C28FA3; }
        .guide-module-label.checkly { color: #5B0E14; }
        .guide-module-label.stockly { color: #4E7D7C; }
        .guide-module-label.assetly { color: #544349; }
        .guide-module-label.planly { color: #1A2517; }
        .guide-module-label.msgly { color: #2872A1; }
        .guide-module-label.general { color: #666; }
        .dark .guide-module-label.checkly { color: #F1E194; }
        .dark .guide-module-label.stockly { color: #789A99; }
        .dark .guide-module-label.assetly { color: #F3E7D9; }
        .dark .guide-module-label.planly { color: #ACC8A2; }
        .dark .guide-module-label.msgly { color: #CBDDE9; }
        .dark .guide-module-label.general { color: #a09890; }
        .guide-step {
          display: flex;
          gap: 14px;
          margin-bottom: 14px;
          padding: 14px 16px;
          border-radius: 8px;
          border-left: 3px solid #ddd;
        }
        .guide-step.teamly { border-left-color: #D37E91; }
        .guide-step.checkly { border-left-color: #F1E194; }
        .guide-step.stockly { border-left-color: #789A99; }
        .guide-step.assetly { border-left-color: #F3E7D9; }
        .guide-step.planly { border-left-color: #ACC8A2; }
        .guide-step.msgly { border-left-color: #CBDDE9; }
        .guide-step-number {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 13px;
          flex-shrink: 0;
          color: white;
        }
        .guide-step-number.teamly { background: #D37E91; }
        .guide-step-number.checkly { background: #F1E194; color: #110f0d; }
        .guide-step-number.stockly { background: #789A99; color: #110f0d; }
        .guide-step-number.assetly { background: #544349; }
        .guide-step-number.planly { background: #ACC8A2; color: #110f0d; }
        .guide-step-number.msgly { background: #2872A1; }
        .guide-step-number.general { background: #110f0d; }
        .dark .guide-step-number.general { background: #a09890; color: #110f0d; }
        .dark .guide-step-number.assetly { background: #F3E7D9; color: #110f0d; }
        .guide-nav-path {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 10pt;
          font-family: 'SF Mono', 'Fira Code', ui-monospace, monospace;
          margin: 4px 0;
        }
        .guide-nav-path .sep { margin: 0 2px; }
      `}</style>
    <div id="guide-top" className="guide-content text-theme-primary">

      {/* Floating back-to-top button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`guide-no-print fixed bottom-6 right-6 z-40 w-10 h-10 rounded-full bg-teamly text-white shadow-lg flex items-center justify-center transition-all duration-300 hover:bg-teamly/80 ${showTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
        aria-label="Back to top"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
      </button>

      {/* ===== TABLE OF CONTENTS ===== */}
      <div className="bg-theme-muted/30 rounded-xl p-6 sm:p-8 mb-8">
        <h3 className="text-lg font-semibold mb-4">Contents</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-theme-tertiary mb-1.5 pb-1 border-b-2 border-gray-300 dark:border-gray-600 inline-block">Getting Started</div>
            <ol className="ml-5 text-sm space-y-0.5">
              <li><a href="#section-1" className="text-theme-secondary hover:text-teamly transition-colors">Logging In &amp; First-Time Setup</a></li>
              <li><a href="#section-2" className="text-theme-secondary hover:text-teamly transition-colors">Navigating the App</a></li>
              <li><a href="#section-3" className="text-theme-secondary hover:text-teamly transition-colors">Site Filtering &amp; Context</a></li>
              <li><a href="#section-4" className="text-theme-secondary hover:text-teamly transition-colors">Your Profile &amp; Settings</a></li>
            </ol>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-teamly-dark dark:text-teamly mb-1.5 pb-1 border-b-2 border-teamly inline-block">Teamly &mdash; People &amp; Rotas</div>
            <ol className="ml-5 text-sm space-y-0.5" start={5}>
              <li><a href="#section-5" className="text-theme-secondary hover:text-teamly transition-colors">Adding Employees</a></li>
              <li><a href="#section-6" className="text-theme-secondary hover:text-teamly transition-colors">Managing Employee Profiles</a></li>
              <li><a href="#section-7" className="text-theme-secondary hover:text-teamly transition-colors">Departments &amp; Org Structure</a></li>
              <li><a href="#section-8" className="text-theme-secondary hover:text-teamly transition-colors">Setting Shift Rules (WTD)</a></li>
              <li><a href="#section-9" className="text-theme-secondary hover:text-teamly transition-colors">Building Rotas</a></li>
              <li><a href="#section-10" className="text-theme-secondary hover:text-teamly transition-colors">Staff Availability &amp; Requests</a></li>
              <li><a href="#section-11" className="text-theme-secondary hover:text-teamly transition-colors">Leave Management</a></li>
              <li><a href="#section-12" className="text-theme-secondary hover:text-teamly transition-colors">Time &amp; Attendance</a></li>
              <li><a href="#section-13" className="text-theme-secondary hover:text-teamly transition-colors">Training &amp; Compliance</a></li>
              <li><a href="#section-14" className="text-theme-secondary hover:text-teamly transition-colors">Onboarding New Starters</a></li>
              <li><a href="#section-15" className="text-theme-secondary hover:text-teamly transition-colors">Teamly Settings Reference</a></li>
            </ol>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-checkly-dark dark:text-checkly mb-1.5 pb-1 border-b-2 border-checkly inline-block">Checkly &mdash; Compliance &amp; Tasks</div>
            <ol className="ml-5 text-sm space-y-0.5" start={16}>
              <li><a href="#section-16" className="text-theme-secondary hover:text-teamly transition-colors">Understanding Task Templates</a></li>
              <li><a href="#section-17" className="text-theme-secondary hover:text-teamly transition-colors">Setting Up Compliance Templates</a></li>
              <li><a href="#section-18" className="text-theme-secondary hover:text-teamly transition-colors">Creating Custom Templates</a></li>
              <li><a href="#section-19" className="text-theme-secondary hover:text-teamly transition-colors">Scheduling Tasks for Your Site</a></li>
              <li><a href="#section-20" className="text-theme-secondary hover:text-teamly transition-colors">Managing Equipment for Temp Checks</a></li>
              <li><a href="#section-21" className="text-theme-secondary hover:text-teamly transition-colors">Reviewing Completed Tasks</a></li>
              <li><a href="#section-22" className="text-theme-secondary hover:text-teamly transition-colors">Temperature Logs &amp; Breach Actions</a></li>
              <li><a href="#section-23" className="text-theme-secondary hover:text-teamly transition-colors">EHO Readiness Reports</a></li>
              <li><a href="#section-24" className="text-theme-secondary hover:text-teamly transition-colors">Checkly Reports &amp; Analytics</a></li>
            </ol>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-stockly-dark dark:text-stockly mb-1.5 pb-1 border-b-2 border-stockly inline-block">Stockly &mdash; Inventory &amp; Stock</div>
            <ol className="ml-5 text-sm space-y-0.5" start={25}>
              <li><a href="#section-25" className="text-theme-secondary hover:text-teamly transition-colors">Stock Items &amp; Storage Areas</a></li>
              <li><a href="#section-26" className="text-theme-secondary hover:text-teamly transition-colors">Suppliers &amp; Approved Lists</a></li>
              <li><a href="#section-27" className="text-theme-secondary hover:text-teamly transition-colors">Orders &amp; Deliveries</a></li>
              <li><a href="#section-28" className="text-theme-secondary hover:text-teamly transition-colors">Stock Counts &amp; Variance</a></li>
              <li><a href="#section-29" className="text-theme-secondary hover:text-teamly transition-colors">Waste Tracking &amp; Credit Notes</a></li>
              <li><a href="#section-30" className="text-theme-secondary hover:text-teamly transition-colors">Recipes &amp; Ingredients</a></li>
              <li><a href="#section-31" className="text-theme-secondary hover:text-teamly transition-colors">Production Batches &amp; Traceability</a></li>
              <li><a href="#section-32" className="text-theme-secondary hover:text-teamly transition-colors">SALSA Compliance</a></li>
              <li><a href="#section-33" className="text-theme-secondary hover:text-teamly transition-colors">Stockly Reports</a></li>
            </ol>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-assetly-dark dark:text-assetly mb-1.5 pb-1 border-b-2 border-assetly inline-block">Assetly &mdash; Assets &amp; Maintenance</div>
            <ol className="ml-5 text-sm space-y-0.5" start={34}>
              <li><a href="#section-34" className="text-theme-secondary hover:text-teamly transition-colors">Managing Assets</a></li>
              <li><a href="#section-35" className="text-theme-secondary hover:text-teamly transition-colors">Preventive Planned Maintenance</a></li>
              <li><a href="#section-36" className="text-theme-secondary hover:text-teamly transition-colors">Contractors &amp; Callout Logs</a></li>
            </ol>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-planly-dark dark:text-planly mb-1.5 pb-1 border-b-2 border-planly inline-block">Planly &mdash; Production Planning</div>
            <ol className="ml-5 text-sm space-y-0.5" start={37}>
              <li><a href="#section-37" className="text-theme-secondary hover:text-teamly transition-colors">Products &amp; Pricing</a></li>
              <li><a href="#section-38" className="text-theme-secondary hover:text-teamly transition-colors">Customers &amp; Orders</a></li>
              <li><a href="#section-39" className="text-theme-secondary hover:text-teamly transition-colors">Production Planning &amp; Delivery</a></li>
            </ol>

            <div className="text-xs font-semibold uppercase tracking-wider text-msgly-dark dark:text-msgly mb-1.5 mt-4 pb-1 border-b-2 border-msgly inline-block">Msgly &mdash; Messaging</div>
            <ol className="ml-5 text-sm space-y-0.5" start={40}>
              <li><a href="#section-40" className="text-theme-secondary hover:text-teamly transition-colors">Team Messaging</a></li>
            </ol>
          </div>
        </div>
      </div>

      {/* ===== GETTING STARTED ===== */}
      <div className="guide-page-break" />

      <div className="rounded-2xl bg-theme-muted/10 border border-theme px-6 py-2 mb-6">

      <div id="section-1" className="guide-section-header general scroll-mt-32">
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
      <div id="section-2" className="guide-section-header general scroll-mt-32">
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
      <div id="section-3" className="guide-section-header general scroll-mt-32">
        <div className="guide-module-label general">Getting Started</div>
        <h2>3. Site Filtering &amp; Context</h2>
      </div>

      <p className="mb-3 text-theme-secondary">If your business has multiple sites, the <strong>Site Filter</strong> dropdown in the header controls which site&apos;s data you see throughout the app. Set it to a specific site or choose <strong>&ldquo;All Sites&rdquo;</strong> to see everything.</p>

      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200 mb-4">
        <strong className="block mb-1">Note:</strong> Staff members only see data for their assigned home site. The site filter is primarily for managers and admins who oversee multiple locations.
      </div>

      {/* Section 4 */}
      <div id="section-4" className="guide-section-header general scroll-mt-32">
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

      </div>{/* end Getting Started background */}

      {/* ===== TEAMLY ===== */}
      <div className="guide-page-break" />

      <div className="rounded-2xl bg-teamly/[0.04] dark:bg-teamly/[0.03] border border-teamly/20 px-6 py-2 mb-6">

      <div id="section-5" className="guide-section-header teamly scroll-mt-32">
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
      <div id="section-6" className="guide-section-header teamly scroll-mt-32">
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
      <div id="section-7" className="guide-section-header teamly scroll-mt-32">
        <div className="guide-module-label teamly">Teamly &mdash; People &amp; Rotas</div>
        <h2>7. Departments &amp; Org Structure</h2>
      </div>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Teamly <span className="sep opacity-50">&rsaquo;</span> Settings <span className="sep opacity-50">&rsaquo;</span> Departments</span></p>

      <p className="mb-3 text-theme-secondary">Create departments to organise your team (e.g. Kitchen, Front of House, Bar, Management). Departments can be hierarchical &mdash; a department can sit under a parent department.</p>

      <p className="mb-3 text-theme-secondary">You can also view the <strong>Org Chart</strong> via <span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Teamly <span className="sep opacity-50">&rsaquo;</span> Employees <span className="sep opacity-50">&rsaquo;</span> Org Chart</span> to see reporting lines and team structure visually.</p>

      {/* Section 8 */}
      <div id="section-8" className="guide-section-header teamly scroll-mt-32">
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
      <div id="section-9" className="guide-section-header teamly scroll-mt-32">
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
      <div id="section-10" className="guide-section-header teamly scroll-mt-32">
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
      <div id="section-11" className="guide-section-header teamly scroll-mt-32">
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
      <div id="section-12" className="guide-section-header teamly scroll-mt-32">
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
      <div id="section-13" className="guide-section-header teamly scroll-mt-32">
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
      <div id="section-14" className="guide-section-header teamly scroll-mt-32">
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
      <div id="section-15" className="guide-section-header teamly scroll-mt-32">
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

      </div>{/* end Teamly background */}

      {/* ===== CHECKLY ===== */}
      <div className="guide-page-break" />

      <div className="rounded-2xl bg-checkly/[0.04] dark:bg-checkly/[0.03] border border-checkly/20 px-6 py-2 mb-6">

      <div id="section-16" className="guide-section-header checkly scroll-mt-32">
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
      <div id="section-17" className="guide-section-header checkly scroll-mt-32">
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
      <div id="section-18" className="guide-section-header checkly scroll-mt-32">
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
      <div id="section-19" className="guide-section-header checkly scroll-mt-32">
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
      <div id="section-20" className="guide-section-header checkly scroll-mt-32">
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
      <div id="section-21" className="guide-section-header checkly scroll-mt-32">
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
      <div id="section-22" className="guide-section-header checkly scroll-mt-32">
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
      <div id="section-23" className="guide-section-header checkly scroll-mt-32">
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
      <div id="section-24" className="guide-section-header checkly scroll-mt-32">
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

      </div>{/* end Checkly background */}

      {/* ===== STOCKLY ===== */}
      <div className="guide-page-break" />

      <div className="rounded-2xl bg-stockly/[0.04] dark:bg-stockly/[0.03] border border-stockly/20 px-6 py-2 mb-6">

      <div id="section-25" className="guide-section-header stockly scroll-mt-32">
        <div className="guide-module-label stockly">Stockly &mdash; Inventory &amp; Stock</div>
        <h2>25. Stock Items &amp; Storage Areas</h2>
      </div>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Stockly <span className="sep opacity-50">&rsaquo;</span> Stock Items</span></p>

      <p className="mb-3 text-theme-secondary">Stock Items is your product catalogue &mdash; every ingredient, chemical, packaging item, and sundry your business buys. Each item has a name, category, unit of measure, supplier link, and par level.</p>

      <h4 className="text-sm font-semibold mt-5 mb-2">Storage Areas</h4>
      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Stockly <span className="sep opacity-50">&rsaquo;</span> Storage Areas</span></p>
      <p className="mb-3 text-theme-secondary">Define the physical storage locations on your site (e.g. Walk-in Fridge, Dry Store, Freezer Room, Bar Store). Stock counts and deliveries are organised by storage area.</p>

      <h4 className="text-sm font-semibold mt-5 mb-2">Libraries</h4>
      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Stockly <span className="sep opacity-50">&rsaquo;</span> Libraries</span></p>
      <p className="mb-3 text-theme-secondary">Reference libraries for different stock categories: Ingredients, Chemicals, Packaging, Disposables, PPE, and First Aid. These provide a master list that stock items can be linked to.</p>

      {/* Section 26 */}
      <div id="section-26" className="guide-section-header stockly scroll-mt-32">
        <div className="guide-module-label stockly">Stockly &mdash; Inventory &amp; Stock</div>
        <h2>26. Suppliers &amp; Approved Lists</h2>
      </div>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Stockly <span className="sep opacity-50">&rsaquo;</span> Suppliers</span></p>

      <p className="mb-3 text-theme-secondary">Manage your supplier directory with contact details, delivery days, minimum order values, and lead times. Each supplier profile shows their linked stock items and order history.</p>

      <h4 className="text-sm font-semibold mt-5 mb-2">Approved Supplier List</h4>
      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Stockly <span className="sep opacity-50">&rsaquo;</span> Suppliers <span className="sep opacity-50">&rsaquo;</span> Approved List</span></p>
      <p className="mb-3 text-theme-secondary">Maintain a formal approved supplier list for compliance purposes. This is a key document for EHO and SALSA audits &mdash; it records which suppliers are approved, their food safety certifications, and review dates.</p>

      {/* Section 27 */}
      <div id="section-27" className="guide-section-header stockly scroll-mt-32">
        <div className="guide-module-label stockly">Stockly &mdash; Inventory &amp; Stock</div>
        <h2>27. Orders &amp; Deliveries</h2>
      </div>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Stockly <span className="sep opacity-50">&rsaquo;</span> Orders</span></p>

      <p className="mb-3 text-theme-secondary">Create purchase orders for your suppliers. Orders can be built from par levels, previous orders, or manually. Once submitted, track the order status through to delivery.</p>

      <h4 className="text-sm font-semibold mt-5 mb-2">Deliveries</h4>
      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Stockly <span className="sep opacity-50">&rsaquo;</span> Deliveries</span></p>
      <p className="mb-3 text-theme-secondary">When a delivery arrives, book it in against the order. Record quantities received, check temperatures, note any discrepancies, and capture photo evidence of delivery notes. Discrepancies can be flagged for credit notes.</p>

      {/* Section 28 */}
      <div id="section-28" className="guide-section-header stockly scroll-mt-32">
        <div className="guide-module-label stockly">Stockly &mdash; Inventory &amp; Stock</div>
        <h2>28. Stock Counts &amp; Variance</h2>
      </div>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Stockly <span className="sep opacity-50">&rsaquo;</span> Stock Counts</span></p>

      <p className="mb-3 text-theme-secondary">Perform regular stock takes by storage area. The system compares your counted stock against expected levels (based on deliveries, sales, and waste) to calculate variance.</p>

      <div className="space-y-3 my-4">
        <div className="guide-step stockly bg-theme-muted/20">
          <div className="guide-step-number stockly">1</div>
          <div>
            <strong className="block mb-1">Start a new count</strong>
            <p className="text-sm text-theme-secondary">Select the storage area and the system pre-populates items expected to be there.</p>
          </div>
        </div>
        <div className="guide-step stockly bg-theme-muted/20">
          <div className="guide-step-number stockly">2</div>
          <div>
            <strong className="block mb-1">Enter quantities</strong>
            <p className="text-sm text-theme-secondary">Count each item and enter the actual quantity on hand.</p>
          </div>
        </div>
        <div className="guide-step stockly bg-theme-muted/20">
          <div className="guide-step-number stockly">3</div>
          <div>
            <strong className="block mb-1">Review variance</strong>
            <p className="text-sm text-theme-secondary">The system highlights items with significant variance. Review and submit for manager sign-off.</p>
          </div>
        </div>
      </div>

      {/* Section 29 */}
      <div id="section-29" className="guide-section-header stockly scroll-mt-32">
        <div className="guide-module-label stockly">Stockly &mdash; Inventory &amp; Stock</div>
        <h2>29. Waste Tracking &amp; Credit Notes</h2>
      </div>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Stockly <span className="sep opacity-50">&rsaquo;</span> Waste</span></p>

      <p className="mb-3 text-theme-secondary">Log waste as it happens with a reason category (spoilage, out of date, preparation, customer return, etc.). Waste feeds into your variance reports and GP calculations.</p>

      <h4 className="text-sm font-semibold mt-5 mb-2">Credit Notes</h4>
      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Stockly <span className="sep opacity-50">&rsaquo;</span> Credit Notes</span></p>
      <p className="mb-3 text-theme-secondary">When a delivery has issues (damaged goods, short deliveries, quality problems), raise a credit note against the supplier. Track the status until the credit is confirmed.</p>

      {/* Section 30 */}
      <div id="section-30" className="guide-section-header stockly scroll-mt-32">
        <div className="guide-module-label stockly">Stockly &mdash; Inventory &amp; Stock</div>
        <h2>30. Recipes &amp; Ingredients</h2>
      </div>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Stockly <span className="sep opacity-50">&rsaquo;</span> Recipes</span></p>

      <p className="mb-3 text-theme-secondary">Build recipes with ingredient quantities and costings. The system calculates the cost per portion and theoretical food cost percentage. Recipes also feed into production batches for traceability.</p>

      <h4 className="text-sm font-semibold mt-5 mb-2">Ingredients Library</h4>
      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Stockly <span className="sep opacity-50">&rsaquo;</span> Libraries <span className="sep opacity-50">&rsaquo;</span> Ingredients</span></p>
      <p className="mb-3 text-theme-secondary">Master list of all ingredients with allergen information, supplier links, and unit costs. Allergens are tracked at the ingredient level and roll up to recipes automatically.</p>

      {/* Section 31 */}
      <div id="section-31" className="guide-section-header stockly scroll-mt-32">
        <div className="guide-module-label stockly">Stockly &mdash; Inventory &amp; Stock</div>
        <h2>31. Production Batches &amp; Traceability</h2>
      </div>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Stockly <span className="sep opacity-50">&rsaquo;</span> Production Batches</span></p>

      <p className="mb-3 text-theme-secondary">Create production batches to track what was made, when, by whom, and from which ingredients. Each batch gets a unique reference and records shelf-life dates.</p>

      <h4 className="text-sm font-semibold mt-5 mb-2">Traceability</h4>
      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Stockly <span className="sep opacity-50">&rsaquo;</span> Traceability</span></p>
      <p className="mb-3 text-theme-secondary">Full forward and backward traceability: from supplier delivery through to the finished product. Essential for recall situations &mdash; you can quickly identify affected batches and customers.</p>

      <h4 className="text-sm font-semibold mt-5 mb-2">Recalls</h4>
      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Stockly <span className="sep opacity-50">&rsaquo;</span> Recalls</span></p>
      <p className="mb-3 text-theme-secondary">If a recall is needed, create a recall record to track the affected product, batches, and resolution actions.</p>

      {/* Section 32 */}
      <div id="section-32" className="guide-section-header stockly scroll-mt-32">
        <div className="guide-module-label stockly">Stockly &mdash; Inventory &amp; Stock</div>
        <h2>32. SALSA Compliance</h2>
      </div>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Stockly <span className="sep opacity-50">&rsaquo;</span> SALSA</span></p>

      <p className="mb-3 text-theme-secondary">If your business is SALSA accredited (or working towards it), the SALSA module guides you through the compliance requirements. It tracks your progress across all SALSA standards with a phase-based approach.</p>

      <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-200 mb-4">
        <strong className="block mb-1">Tip:</strong> A dedicated SALSA How-To Guide is available at <span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Stockly <span className="sep opacity-50">&rsaquo;</span> SALSA <span className="sep opacity-50">&rsaquo;</span> Guide</span> with step-by-step instructions for each compliance phase.
      </div>

      {/* Section 33 */}
      <div id="section-33" className="guide-section-header stockly scroll-mt-32">
        <div className="guide-module-label stockly">Stockly &mdash; Inventory &amp; Stock</div>
        <h2>33. Stockly Reports</h2>
      </div>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Stockly <span className="sep opacity-50">&rsaquo;</span> Reports</span></p>

      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-theme">
              <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-theme-tertiary font-semibold">Report</th>
              <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-theme-tertiary font-semibold">What It Shows</th>
            </tr>
          </thead>
          <tbody className="text-theme-secondary">
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Stock Value</td><td className="py-2 px-3">Current stock on hand valued at cost price</td></tr>
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Gross Profit</td><td className="py-2 px-3">Sales vs. cost of goods sold, GP percentage by category</td></tr>
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Price Analysis</td><td className="py-2 px-3">Price trends across suppliers, price comparison</td></tr>
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Supplier Spend</td><td className="py-2 px-3">Spend breakdown by supplier over time</td></tr>
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Wastage</td><td className="py-2 px-3">Waste by category, reason, and trend over time</td></tr>
            <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Variance</td><td className="py-2 px-3">Difference between expected and actual stock levels</td></tr>
            <tr><td className="py-2 px-3 font-medium text-theme-primary">Dead Stock</td><td className="py-2 px-3">Items with no movement over a specified period</td></tr>
          </tbody>
        </table>
      </div>

      </div>{/* end Stockly background */}

      {/* ===== ASSETLY ===== */}
      <div className="guide-page-break" />

      <div className="rounded-2xl bg-assetly/[0.04] dark:bg-assetly/[0.03] border border-assetly/20 px-6 py-2 mb-6">

      <div id="section-34" className="guide-section-header assetly scroll-mt-32">
        <div className="guide-module-label assetly">Assetly &mdash; Assets &amp; Maintenance</div>
        <h2>34. Managing Assets</h2>
      </div>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Assetly <span className="sep opacity-50">&rsaquo;</span> Assets</span></p>

      <p className="mb-3 text-theme-secondary">Register all your physical assets: kitchen equipment, refrigeration units, HVAC, furniture, IT equipment, and more. Each asset record includes:</p>
      <ul className="list-disc ml-6 space-y-1 text-theme-secondary mb-4">
        <li>Name, description, and category</li>
        <li>Location (site and area)</li>
        <li>Make, model, and serial number</li>
        <li>Purchase date, warranty expiry, and expected lifespan</li>
        <li>Linked maintenance schedules and callout history</li>
      </ul>

      <h4 className="text-sm font-semibold mt-5 mb-2">Asset Groups</h4>
      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Assetly <span className="sep opacity-50">&rsaquo;</span> Groups</span></p>
      <p className="mb-3 text-theme-secondary">Organise assets into logical groups (e.g. Refrigeration, Cooking Equipment, Electrical) for easier management and reporting.</p>

      {/* Section 35 */}
      <div id="section-35" className="guide-section-header assetly scroll-mt-32">
        <div className="guide-module-label assetly">Assetly &mdash; Assets &amp; Maintenance</div>
        <h2>35. Preventive Planned Maintenance (PPM)</h2>
      </div>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Assetly <span className="sep opacity-50">&rsaquo;</span> PPM Schedule</span></p>

      <p className="mb-3 text-theme-secondary">Set up recurring maintenance schedules for your assets. PPM ensures equipment is serviced regularly to prevent breakdowns and maintain compliance.</p>
      <ul className="list-disc ml-6 space-y-1 text-theme-secondary mb-4">
        <li>Define maintenance tasks with frequency (weekly, monthly, quarterly, annually)</li>
        <li>Assign to internal staff or external contractors</li>
        <li>Track completion and overdue items</li>
        <li>View compliance rates across all assets</li>
      </ul>

      {/* Section 36 */}
      <div id="section-36" className="guide-section-header assetly scroll-mt-32">
        <div className="guide-module-label assetly">Assetly &mdash; Assets &amp; Maintenance</div>
        <h2>36. Contractors &amp; Callout Logs</h2>
      </div>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Assetly <span className="sep opacity-50">&rsaquo;</span> Contractors</span></p>

      <p className="mb-3 text-theme-secondary">Maintain a directory of your maintenance contractors with contact details, specialities, and service agreements.</p>

      <h4 className="text-sm font-semibold mt-5 mb-2">Callout Logs</h4>
      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Assetly <span className="sep opacity-50">&rsaquo;</span> Callout Logs</span></p>
      <p className="mb-3 text-theme-secondary">Record every contractor callout: which asset, the issue reported, contractor assigned, date, cost, and resolution. This builds a full maintenance history for each asset and helps with budgeting.</p>

      </div>{/* end Assetly background */}

      {/* ===== PLANLY ===== */}
      <div className="guide-page-break" />

      <div className="rounded-2xl bg-planly/[0.04] dark:bg-planly/[0.03] border border-planly/20 px-6 py-2 mb-6">

      <div id="section-37" className="guide-section-header planly scroll-mt-32">
        <div className="guide-module-label planly">Planly &mdash; Production Planning</div>
        <h2>37. Products &amp; Pricing</h2>
      </div>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Planly <span className="sep opacity-50">&rsaquo;</span> Products</span></p>

      <p className="mb-3 text-theme-secondary">Define your product catalogue with categories, unit sizes, and base pricing. Products can be linked to recipes in Stockly for automatic costing.</p>

      <h4 className="text-sm font-semibold mt-5 mb-2">Pricing</h4>
      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Planly <span className="sep opacity-50">&rsaquo;</span> Pricing</span></p>
      <p className="mb-3 text-theme-secondary">Set up pricing tiers and customer-specific pricing. Supports volume discounts, seasonal pricing, and price lists per customer or customer group.</p>

      {/* Section 38 */}
      <div id="section-38" className="guide-section-header planly scroll-mt-32">
        <div className="guide-module-label planly">Planly &mdash; Production Planning</div>
        <h2>38. Customers &amp; Orders</h2>
      </div>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Planly <span className="sep opacity-50">&rsaquo;</span> Customers</span></p>

      <p className="mb-3 text-theme-secondary">Manage your wholesale customer directory with delivery addresses, contact details, preferred delivery days, and order cutoff times. Each customer profile shows their order history and pricing.</p>

      <h4 className="text-sm font-semibold mt-5 mb-2">Order Book</h4>
      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Planly <span className="sep opacity-50">&rsaquo;</span> Order Book</span></p>
      <p className="mb-3 text-theme-secondary">View and manage all customer orders in one place. Create new orders, edit existing ones, and track order status from placement through to delivery.</p>

      {/* Section 39 */}
      <div id="section-39" className="guide-section-header planly scroll-mt-32">
        <div className="guide-module-label planly">Planly &mdash; Production Planning</div>
        <h2>39. Production Planning &amp; Delivery</h2>
      </div>

      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Planly <span className="sep opacity-50">&rsaquo;</span> Production Plan</span></p>

      <p className="mb-3 text-theme-secondary">The production plan aggregates all orders for a given day and calculates what needs to be produced. It breaks down by product, quantity, and production process.</p>

      <h4 className="text-sm font-semibold mt-5 mb-2">Delivery Schedule &amp; Notes</h4>
      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Planly <span className="sep opacity-50">&rsaquo;</span> Delivery Schedule</span></p>
      <p className="mb-3 text-theme-secondary">View the daily delivery schedule showing which customers need deliveries, what products, and delivery sequence. Generate delivery notes for drivers with full order details.</p>

      <h4 className="text-sm font-semibold mt-5 mb-2">Monthly Sales</h4>
      <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Planly <span className="sep opacity-50">&rsaquo;</span> Monthly Sales</span></p>
      <p className="mb-3 text-theme-secondary">Track sales performance by customer and product over time with monthly summaries and trend analysis.</p>

      </div>{/* end Planly background */}

      {/* ===== MSGLY ===== */}
      <div className="guide-page-break" />

      <div className="rounded-2xl bg-msgly/[0.04] dark:bg-msgly/[0.03] border border-msgly/20 px-6 py-2 mb-6">

      <div id="section-40" className="guide-section-header msgly scroll-mt-32">
        <div className="guide-module-label msgly">Msgly &mdash; Messaging</div>
        <h2>40. Team Messaging</h2>
      </div>

      <p className="mb-3 text-theme-secondary">Msgly is the built-in messaging system for team communication. Access it from the <strong>Messages</strong> icon in the sidebar or header.</p>

      <h4 className="text-sm font-semibold mt-5 mb-2">Key features:</h4>
      <ul className="list-disc ml-6 space-y-1 text-theme-secondary mb-4">
        <li><strong>Direct messages</strong> &mdash; one-to-one conversations with any team member</li>
        <li><strong>Group channels</strong> &mdash; create channels for teams, departments, or sites</li>
        <li><strong>Unread badges</strong> &mdash; unread message counts shown in the sidebar</li>
        <li><strong>Real-time</strong> &mdash; messages appear instantly without refreshing</li>
      </ul>

      <p className="mb-3 text-theme-secondary">Messaging opens as a side panel so you can reference it alongside your current work without losing your place.</p>

      </div>{/* end Msgly background */}

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
        opsly. &mdash; Manager Guide &mdash; All Modules &mdash; Beta Edition February 2026<br />
        &copy; 2026 Opsly Technologies Ltd. All rights reserved. Confidential.
      </div>
    </div>
    </>
  )
}
