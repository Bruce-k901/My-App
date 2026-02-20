'use client'

import { useState, useEffect } from 'react'

export default function StaffGuideContent() {
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
        .guide-module-label.msgly { color: #2872A1; }
        .guide-module-label.general { color: #666; }
        .dark .guide-module-label.checkly { color: #F1E194; }
        .dark .guide-module-label.stockly { color: #789A99; }
        .dark .guide-module-label.assetly { color: #F3E7D9; }
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
        .guide-quick-ref {
          border: 2px solid;
          border-radius: 12px;
          padding: 24px;
          margin: 20px 0;
        }
        .guide-quick-ref h3 {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 600;
        }
        .guide-quick-ref-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .guide-quick-ref-item {
          padding: 12px 16px;
          border-radius: 8px;
        }
        .guide-quick-ref-item strong {
          display: block;
          font-size: 10pt;
          margin-bottom: 4px;
        }
        .guide-quick-ref-item span {
          font-size: 9.5pt;
        }
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
                <li><a href="#section-1" className="text-theme-secondary hover:text-teamly transition-colors">Setting Up Your Account</a></li>
                <li><a href="#section-2" className="text-theme-secondary hover:text-teamly transition-colors">Finding Your Way Around</a></li>
                <li><a href="#section-3" className="text-theme-secondary hover:text-teamly transition-colors">Your Profile &amp; Settings</a></li>
                <li><a href="#section-4" className="text-theme-secondary hover:text-teamly transition-colors">Installing on Your Phone</a></li>
              </ol>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-checkly-dark dark:text-checkly mb-1.5 pb-1 border-b-2 border-checkly inline-block">Checkly &mdash; Your Daily Tasks</div>
              <ol className="ml-5 text-sm space-y-0.5" start={5}>
                <li><a href="#section-5" className="text-theme-secondary hover:text-teamly transition-colors">Viewing Today&apos;s Tasks</a></li>
                <li><a href="#section-6" className="text-theme-secondary hover:text-teamly transition-colors">Completing a Task</a></li>
                <li><a href="#section-7" className="text-theme-secondary hover:text-teamly transition-colors">Temperature Checks</a></li>
                <li><a href="#section-8" className="text-theme-secondary hover:text-teamly transition-colors">Taking Photo Evidence</a></li>
                <li><a href="#section-9" className="text-theme-secondary hover:text-teamly transition-colors">Flagging Issues</a></li>
              </ol>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-teamly-dark dark:text-teamly mb-1.5 pb-1 border-b-2 border-teamly inline-block">Teamly &mdash; Your Shifts &amp; Time Off</div>
              <ol className="ml-5 text-sm space-y-0.5" start={10}>
                <li><a href="#section-10" className="text-theme-secondary hover:text-teamly transition-colors">Viewing Your Rota</a></li>
                <li><a href="#section-11" className="text-theme-secondary hover:text-teamly transition-colors">Clocking In &amp; Out</a></li>
                <li><a href="#section-12" className="text-theme-secondary hover:text-teamly transition-colors">Setting Your Availability</a></li>
                <li><a href="#section-13" className="text-theme-secondary hover:text-teamly transition-colors">Requesting Leave</a></li>
                <li><a href="#section-14" className="text-theme-secondary hover:text-teamly transition-colors">Checking Your Leave Balance</a></li>
                <li><a href="#section-15" className="text-theme-secondary hover:text-teamly transition-colors">Your Training Records</a></li>
                <li><a href="#section-16" className="text-theme-secondary hover:text-teamly transition-colors">Onboarding Documents</a></li>
              </ol>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-stockly-dark dark:text-stockly mb-1.5 pb-1 border-b-2 border-stockly inline-block">Stockly &mdash; Stock &amp; Deliveries</div>
              <ol className="ml-5 text-sm space-y-0.5" start={17}>
                <li><a href="#section-17" className="text-theme-secondary hover:text-teamly transition-colors">Booking In Deliveries</a></li>
                <li><a href="#section-18" className="text-theme-secondary hover:text-teamly transition-colors">Logging Waste</a></li>
                <li><a href="#section-19" className="text-theme-secondary hover:text-teamly transition-colors">Stock Counts</a></li>
              </ol>

              <div className="text-xs font-semibold uppercase tracking-wider text-assetly-dark dark:text-assetly mb-1.5 mt-3 pb-1 border-b-2 border-assetly inline-block">Assetly &mdash; Reporting Issues</div>
              <ol className="ml-5 text-sm space-y-0.5" start={20}>
                <li><a href="#section-20" className="text-theme-secondary hover:text-teamly transition-colors">Reporting Equipment Issues</a></li>
              </ol>

              <div className="text-xs font-semibold uppercase tracking-wider text-msgly-dark dark:text-msgly mb-1.5 mt-3 pb-1 border-b-2 border-msgly inline-block">Msgly &mdash; Messaging</div>
              <ol className="ml-5 text-sm space-y-0.5" start={21}>
                <li><a href="#section-21" className="text-theme-secondary hover:text-teamly transition-colors">Sending &amp; Receiving Messages</a></li>
              </ol>

              <div className="text-xs font-semibold uppercase tracking-wider text-theme-tertiary mb-1.5 mt-3 pb-1 border-b-2 border-gray-300 dark:border-gray-600 inline-block">Quick Reference</div>
              <ol className="ml-5 text-sm space-y-0.5" start={22}>
                <li><a href="#section-22" className="text-theme-secondary hover:text-teamly transition-colors">Daily Checklist</a></li>
                <li><a href="#section-23" className="text-theme-secondary hover:text-teamly transition-colors">Getting Help</a></li>
              </ol>
            </div>
          </div>
        </div>

        {/* ===== GETTING STARTED ===== */}
        <div className="guide-page-break" />

        <div className="rounded-2xl bg-theme-muted/10 border border-theme px-6 py-2 mb-6">

        <div id="section-1" className="guide-section-header general scroll-mt-32">
          <div className="guide-module-label general">Getting Started</div>
          <h2>1. Setting Up Your Account</h2>
        </div>

        <p className="mb-3 text-theme-secondary">Your manager will add you to the system and you&apos;ll receive an email from Opsly to set up your account.</p>

        <div className="space-y-3 my-4">
          <div className="guide-step bg-theme-muted/20" style={{ borderLeftColor: '#110f0d' }}>
            <div className="guide-step-number general">1</div>
            <div>
              <strong className="block mb-1">Check your email</strong>
              <p className="text-sm text-theme-secondary">Look for an invitation email from Opsly. Click the setup link inside.</p>
            </div>
          </div>
          <div className="guide-step bg-theme-muted/20" style={{ borderLeftColor: '#110f0d' }}>
            <div className="guide-step-number general">2</div>
            <div>
              <strong className="block mb-1">Create your password</strong>
              <p className="text-sm text-theme-secondary">Choose a password you&apos;ll remember (minimum 6 characters). There&apos;s a password generator button if you want a suggestion.</p>
            </div>
          </div>
          <div className="guide-step bg-theme-muted/20" style={{ borderLeftColor: '#110f0d' }}>
            <div className="guide-step-number general">3</div>
            <div>
              <strong className="block mb-1">Set your 4-digit PIN</strong>
              <p className="text-sm text-theme-secondary">Choose a PIN you&apos;ll remember &mdash; you&apos;ll use this for quick actions like completing tasks and clocking in.</p>
            </div>
          </div>
          <div className="guide-step bg-theme-muted/20" style={{ borderLeftColor: '#110f0d' }}>
            <div className="guide-step-number general">4</div>
            <div>
              <strong className="block mb-1">Log in</strong>
              <p className="text-sm text-theme-secondary">Go to your Opsly URL and sign in with your email and password. You&apos;ll see the home screen with your tasks and schedule.</p>
            </div>
          </div>
        </div>

        {/* Section 2 */}
        <div id="section-2" className="guide-section-header general scroll-mt-32">
          <div className="guide-module-label general">Getting Started</div>
          <h2>2. Finding Your Way Around</h2>
        </div>

        <h3 className="text-base font-semibold mt-6 mb-3">On Your Phone (recommended for daily use)</h3>
        <p className="mb-3 text-theme-secondary">The bottom of the screen has 5 tabs:</p>

        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-theme">
                <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-theme-tertiary font-semibold">Tab</th>
                <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-theme-tertiary font-semibold">What It Does</th>
              </tr>
            </thead>
            <tbody className="text-theme-secondary">
              <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Home</td><td className="py-2 px-3">Your dashboard &mdash; weather, priority items, upcoming tasks, activity feed</td></tr>
              <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Tasks</td><td className="py-2 px-3">Today&apos;s compliance tasks that need completing (Checkly)</td></tr>
              <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Calendar</td><td className="py-2 px-3">Your shifts and leave in calendar view</td></tr>
              <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Rota</td><td className="py-2 px-3">The weekly rota showing your shifts</td></tr>
              <tr><td className="py-2 px-3 font-medium text-theme-primary">More</td><td className="py-2 px-3">Quick actions (clock in, report incident, temp check) and links to everything else</td></tr>
            </tbody>
          </table>
        </div>

        <p className="mb-3 text-theme-secondary">Tap your <strong>avatar</strong> (top-right) to access your profile, switch sites (if you work at more than one), change theme, or log out.</p>

        <h3 className="text-base font-semibold mt-6 mb-3">On Desktop</h3>
        <p className="mb-3 text-theme-secondary">Use the <strong>Module Bar</strong> at the top to switch between <strong>Checkly</strong> (tasks) and <strong>Teamly</strong> (shifts/leave). A sidebar on the left shows navigation for whichever module you&apos;re in.</p>

        {/* Section 3 */}
        <div id="section-3" className="guide-section-header general scroll-mt-32">
          <div className="guide-module-label general">Getting Started</div>
          <h2>3. Your Profile &amp; Settings</h2>
        </div>

        <p className="mb-3 text-theme-secondary">You can update your personal details at any time:</p>
        <ul className="list-disc ml-6 space-y-1 text-theme-secondary mb-4">
          <li><strong>Phone:</strong> Tap avatar &rarr; Settings &rarr; Profile</li>
          <li><strong>Password:</strong> Settings &rarr; Profile &rarr; Change Password</li>
          <li><strong>Theme:</strong> Switch between dark mode and light mode in Settings &rarr; Appearance</li>
          <li><strong>Notifications:</strong> Choose which email alerts you receive in Settings &rarr; Notifications</li>
        </ul>

        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200 mb-4">
          <strong className="block mb-1">Note:</strong> Your name, email, job title, and site assignment are managed by your manager. If any of these are wrong, let your manager know.
        </div>

        {/* Section 4 */}
        <div id="section-4" className="guide-section-header general scroll-mt-32">
          <div className="guide-module-label general">Getting Started</div>
          <h2>4. Installing on Your Phone</h2>
        </div>

        <p className="mb-3 text-theme-secondary">Opsly works best when installed as an app on your phone. Here&apos;s how:</p>

        <h4 className="text-sm font-semibold mt-5 mb-2">iPhone (Safari)</h4>
        <ol className="list-decimal ml-6 space-y-1 text-theme-secondary mb-4">
          <li>Open Opsly in Safari</li>
          <li>Tap the <strong>Share</strong> button (square with arrow)</li>
          <li>Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong></li>
          <li>Tap <strong>&ldquo;Add&rdquo;</strong></li>
        </ol>

        <h4 className="text-sm font-semibold mt-5 mb-2">Android (Chrome)</h4>
        <ol className="list-decimal ml-6 space-y-1 text-theme-secondary mb-4">
          <li>Open Opsly in Chrome</li>
          <li>Tap the <strong>three dots</strong> menu (top-right)</li>
          <li>Tap <strong>&ldquo;Add to Home screen&rdquo;</strong> or <strong>&ldquo;Install app&rdquo;</strong></li>
          <li>Tap <strong>&ldquo;Install&rdquo;</strong></li>
        </ol>

        <p className="mb-3 text-theme-secondary">Once installed, Opsly will open full-screen like a regular app &mdash; no browser bars.</p>

        </div>{/* end Getting Started background */}

        {/* ===== CHECKLY ===== */}
        <div className="guide-page-break" />

        <div className="rounded-2xl bg-checkly/[0.04] dark:bg-checkly/[0.03] border border-checkly/20 px-6 py-2 mb-6">

        <div id="section-5" className="guide-section-header checkly scroll-mt-32">
          <div className="guide-module-label checkly">Checkly &mdash; Your Daily Tasks</div>
          <h2>5. Viewing Today&apos;s Tasks</h2>
        </div>

        <p className="mb-3 text-theme-secondary">Your daily compliance tasks are in the <strong>Tasks</strong> tab (mobile) or under <span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Checkly <span className="sep opacity-50">&rsaquo;</span> Today&apos;s Tasks</span> (desktop).</p>

        <p className="mb-3 text-theme-secondary">Tasks are organised by time of day:</p>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-theme">
                <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-theme-tertiary font-semibold">Daypart</th>
                <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-theme-tertiary font-semibold">Time</th>
                <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-theme-tertiary font-semibold">Examples</th>
              </tr>
            </thead>
            <tbody className="text-theme-secondary">
              <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Morning</td><td className="py-2 px-3">5am &ndash; 12pm</td><td className="py-2 px-3">Opening checks, morning temperature logs</td></tr>
              <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Afternoon</td><td className="py-2 px-3">12pm &ndash; 5pm</td><td className="py-2 px-3">Midday temperature checks, cleaning tasks</td></tr>
              <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Evening</td><td className="py-2 px-3">5pm &ndash; 10pm</td><td className="py-2 px-3">Evening checks, close-down tasks</td></tr>
              <tr><td className="py-2 px-3 font-medium text-theme-primary">Night</td><td className="py-2 px-3">10pm &ndash; 5am</td><td className="py-2 px-3">End-of-night cleaning, security checks</td></tr>
            </tbody>
          </table>
        </div>

        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200 mb-4">
          <strong className="block mb-1">Note:</strong> You only see tasks that are due around now. Tasks for later in the day will appear when it&apos;s time to do them.
        </div>

        {/* Section 6 */}
        <div id="section-6" className="guide-section-header checkly scroll-mt-32">
          <div className="guide-module-label checkly">Checkly &mdash; Your Daily Tasks</div>
          <h2>6. Completing a Task</h2>
        </div>

        <p className="mb-3 text-theme-secondary">Tap on any task card to open it. The completion form will guide you through what needs to be done.</p>

        <div className="space-y-3 my-4">
          <div className="guide-step checkly bg-theme-muted/20">
            <div className="guide-step-number checkly">1</div>
            <div>
              <strong className="block mb-1">Read the instructions</strong>
              <p className="text-sm text-theme-secondary">At the top of the form, you&apos;ll see instructions explaining what to check and how.</p>
            </div>
          </div>
          <div className="guide-step checkly bg-theme-muted/20">
            <div className="guide-step-number checkly">2</div>
            <div>
              <strong className="block mb-1">Work through each item</strong>
              <p className="text-sm text-theme-secondary">The form will have a mix of items depending on the task:</p>
              <ul className="list-disc ml-5 mt-2 space-y-1 text-sm text-theme-secondary">
                <li><strong>Checklist items</strong> &mdash; tick each one as you complete it</li>
                <li><strong>Yes / No questions</strong> &mdash; answer honestly</li>
                <li><strong>Temperature readings</strong> &mdash; enter the reading from your thermometer (see Section 7)</li>
                <li><strong>Photos</strong> &mdash; take a photo as evidence (see Section 8)</li>
                <li><strong>Notes</strong> &mdash; add any observations or comments</li>
              </ul>
            </div>
          </div>
          <div className="guide-step checkly bg-theme-muted/20">
            <div className="guide-step-number checkly">3</div>
            <div>
              <strong className="block mb-1">Submit</strong>
              <p className="text-sm text-theme-secondary">Once all required fields are completed, tap <strong>Submit</strong>. The task will move to the Completed section. Your name and the time are recorded automatically.</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-200 mb-4">
          <strong className="block mb-1">Tip:</strong> The system tracks how long each task takes (from when you open it to when you submit). This is just for reporting &mdash; take the time you need to do it properly.
        </div>

        {/* Section 7 */}
        <div id="section-7" className="guide-section-header checkly scroll-mt-32">
          <div className="guide-module-label checkly">Checkly &mdash; Your Daily Tasks</div>
          <h2>7. Temperature Checks</h2>
        </div>

        <p className="mb-3 text-theme-secondary">For temperature tasks, you&apos;ll see a list of equipment (e.g. &ldquo;Walk-in Fridge&rdquo;, &ldquo;Freezer 1&rdquo;, &ldquo;Hot Hold Unit&rdquo;). For each one:</p>

        <div className="space-y-3 my-4">
          <div className="guide-step checkly bg-theme-muted/20">
            <div className="guide-step-number checkly">1</div>
            <div>
              <strong className="block mb-1">Take the reading</strong>
              <p className="text-sm text-theme-secondary">Use your probe thermometer or check the unit&apos;s display.</p>
            </div>
          </div>
          <div className="guide-step checkly bg-theme-muted/20">
            <div className="guide-step-number checkly">2</div>
            <div>
              <strong className="block mb-1">Enter the temperature</strong>
              <p className="text-sm text-theme-secondary">Type the reading into the field. The system will immediately show you whether it&apos;s <strong className="text-green-600 dark:text-green-400">In Range</strong> (green) or <strong className="text-red-600 dark:text-red-400">Out of Range</strong> (red).</p>
            </div>
          </div>
          <div className="guide-step checkly bg-theme-muted/20">
            <div className="guide-step-number checkly">3</div>
            <div>
              <strong className="block mb-1">If it&apos;s out of range</strong>
              <p className="text-sm text-theme-secondary">Don&apos;t panic. Record the actual reading &mdash; the system will handle the rest. It may ask you to re-check later or your manager will be notified. Add a note explaining anything relevant (e.g. &ldquo;door was left open, closed and will recheck in 30 mins&rdquo;).</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200 mb-4">
          <strong className="block mb-1">Important:</strong> Always record the actual temperature, even if it&apos;s out of range. Never &ldquo;fudge&rdquo; a reading &mdash; the system is designed to help you manage breaches, not punish them. Honest recording protects you and the business.
        </div>

        {/* Section 8 */}
        <div id="section-8" className="guide-section-header checkly scroll-mt-32">
          <div className="guide-module-label checkly">Checkly &mdash; Your Daily Tasks</div>
          <h2>8. Taking Photo Evidence</h2>
        </div>

        <p className="mb-3 text-theme-secondary">Some tasks require photo evidence (e.g. cleaning completion, probe calibration, delivery checks).</p>
        <ul className="list-disc ml-6 space-y-1 text-theme-secondary mb-4">
          <li>Tap the <strong>camera icon</strong> or <strong>&ldquo;Add Photo&rdquo;</strong> button</li>
          <li>Take a clear photo showing what&apos;s being evidenced</li>
          <li>You can add multiple photos if needed</li>
          <li>Photos are uploaded and stored securely &mdash; they&apos;re visible to managers in the audit trail</li>
        </ul>

        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-200 mb-4">
          <strong className="block mb-1">Tip:</strong> Make sure photos are clear and well-lit. A blurry or dark photo won&apos;t serve as good evidence if needed for an audit.
        </div>

        {/* Section 9 */}
        <div id="section-9" className="guide-section-header checkly scroll-mt-32">
          <div className="guide-module-label checkly">Checkly &mdash; Your Daily Tasks</div>
          <h2>9. Flagging Issues</h2>
        </div>

        <p className="mb-3 text-theme-secondary">If you spot a problem while completing a task, you can <strong>flag it</strong>:</p>
        <ul className="list-disc ml-6 space-y-1 text-theme-secondary mb-4">
          <li>Look for the <strong>flag option</strong> on the completion form</li>
          <li>Turn it on and enter a brief <strong>reason</strong> (e.g. &ldquo;grease trap needs emptying&rdquo;, &ldquo;fire exit blocked by delivery&rdquo;)</li>
          <li>You can still submit the task &mdash; the flag alerts your manager that something needs attention</li>
        </ul>
        <p className="mb-3 text-theme-secondary">Flagged tasks are highlighted in the completed tasks list and in reports, so your manager can follow up.</p>

        </div>{/* end Checkly background */}

        {/* ===== TEAMLY ===== */}
        <div className="guide-page-break" />

        <div className="rounded-2xl bg-teamly/[0.04] dark:bg-teamly/[0.03] border border-teamly/20 px-6 py-2 mb-6">

        <div id="section-10" className="guide-section-header teamly scroll-mt-32">
          <div className="guide-module-label teamly">Teamly &mdash; Your Shifts &amp; Time Off</div>
          <h2>10. Viewing Your Rota</h2>
        </div>

        <p className="mb-3 text-theme-secondary">Your shifts are in the <strong>Rota</strong> tab (mobile) or under <span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Teamly <span className="sep opacity-50">&rsaquo;</span> Schedule <span className="sep opacity-50">&rsaquo;</span> Rota</span> (desktop).</p>

        <p className="mb-3 text-theme-secondary">The rota shows a weekly view with your shifts for each day. Each shift shows:</p>
        <ul className="list-disc ml-6 space-y-1 text-theme-secondary mb-4">
          <li>Start time and finish time</li>
          <li>Break duration</li>
          <li>Which section/role you&apos;re covering</li>
          <li>Any notes from your manager</li>
        </ul>

        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200 mb-4">
          <strong className="block mb-1">Note:</strong> You&apos;ll receive a notification when your manager publishes a new rota. Until it&apos;s published, shifts are in draft and may change.
        </div>

        {/* Section 11 */}
        <div id="section-11" className="guide-section-header teamly scroll-mt-32">
          <div className="guide-module-label teamly">Teamly &mdash; Your Shifts &amp; Time Off</div>
          <h2>11. Clocking In &amp; Out</h2>
        </div>

        <p className="mb-3 text-theme-secondary">Clock in when you arrive for your shift and out when you leave.</p>

        <h4 className="text-sm font-semibold mt-5 mb-2">On mobile:</h4>
        <div className="space-y-3 my-4">
          <div className="guide-step teamly bg-theme-muted/20">
            <div className="guide-step-number teamly">1</div>
            <div>
              <strong className="block mb-1">Tap &ldquo;More&rdquo; (bottom tab)</strong>
              <p className="text-sm text-theme-secondary">The <strong>Clock In</strong> button is one of the priority actions at the top.</p>
            </div>
          </div>
          <div className="guide-step teamly bg-theme-muted/20">
            <div className="guide-step-number teamly">2</div>
            <div>
              <strong className="block mb-1">Tap &ldquo;Clock In&rdquo;</strong>
              <p className="text-sm text-theme-secondary">Your clock-in time is recorded. The button changes to &ldquo;Clock Out&rdquo;.</p>
            </div>
          </div>
          <div className="guide-step teamly bg-theme-muted/20">
            <div className="guide-step-number teamly">3</div>
            <div>
              <strong className="block mb-1">Clock out at the end of your shift</strong>
              <p className="text-sm text-theme-secondary">Tap &ldquo;Clock Out&rdquo; when your shift ends. Your hours are recorded for the timesheet.</p>
            </div>
          </div>
        </div>

        <h4 className="text-sm font-semibold mt-5 mb-2">On desktop:</h4>
        <p className="mb-3 text-theme-secondary">The <span className="px-2 py-0.5 rounded bg-theme-muted/50 text-xs font-medium">Clock In</span> button is in the Module Bar (top-right, always visible).</p>

        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200 mb-4">
          <strong className="block mb-1">Don&apos;t forget to clock out!</strong> If you forget, your manager will need to manually adjust your timesheet. Get into the habit of clocking out before you leave.
        </div>

        {/* Section 12 */}
        <div id="section-12" className="guide-section-header teamly scroll-mt-32">
          <div className="guide-module-label teamly">Teamly &mdash; Your Shifts &amp; Time Off</div>
          <h2>12. Setting Your Availability</h2>
        </div>

        <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Teamly <span className="sep opacity-50">&rsaquo;</span> Schedule <span className="sep opacity-50">&rsaquo;</span> Availability</span></p>
        <p className="mb-3 text-theme-secondary">Let your manager know when you can and can&apos;t work:</p>

        <h4 className="text-sm font-semibold mt-5 mb-2">Recurring availability (your regular pattern):</h4>
        <p className="mb-3 text-theme-secondary">Set your general weekly pattern, e.g. &ldquo;available Monday to Friday, 8am to 6pm&rdquo;. This repeats every week and helps your manager build the rota.</p>

        <h4 className="text-sm font-semibold mt-5 mb-2">Specific date overrides:</h4>
        <p className="mb-3 text-theme-secondary">Need a specific day off or have a commitment on a particular date? Add a date-specific override, e.g. &ldquo;unavailable Saturday 8th March&rdquo;.</p>

        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200 mb-4">
          <strong className="block mb-1">Note:</strong> Availability changes may need manager approval. Once submitted, they&apos;ll appear as pending until approved.
        </div>

        {/* Section 13 */}
        <div id="section-13" className="guide-section-header teamly scroll-mt-32">
          <div className="guide-module-label teamly">Teamly &mdash; Your Shifts &amp; Time Off</div>
          <h2>13. Requesting Leave</h2>
        </div>

        <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Teamly <span className="sep opacity-50">&rsaquo;</span> Leave <span className="sep opacity-50">&rsaquo;</span> Request Leave</span></p>

        <div className="space-y-3 my-4">
          <div className="guide-step teamly bg-theme-muted/20">
            <div className="guide-step-number teamly">1</div>
            <div>
              <strong className="block mb-1">Choose the leave type</strong>
              <p className="text-sm text-theme-secondary">Select from: Annual Leave, Sick Leave, TOIL, Unpaid Leave, Compassionate Leave, or others as configured by your manager.</p>
            </div>
          </div>
          <div className="guide-step teamly bg-theme-muted/20">
            <div className="guide-step-number teamly">2</div>
            <div>
              <strong className="block mb-1">Select your dates</strong>
              <p className="text-sm text-theme-secondary">Pick the start and end dates. Half-days are available for some leave types.</p>
            </div>
          </div>
          <div className="guide-step teamly bg-theme-muted/20">
            <div className="guide-step-number teamly">3</div>
            <div>
              <strong className="block mb-1">Check your balance</strong>
              <p className="text-sm text-theme-secondary">The system shows your remaining leave balance before you submit, so you know exactly how many days you have left.</p>
            </div>
          </div>
          <div className="guide-step teamly bg-theme-muted/20">
            <div className="guide-step-number teamly">4</div>
            <div>
              <strong className="block mb-1">Add a reason (optional)</strong>
              <p className="text-sm text-theme-secondary">You can add a note for your manager if needed.</p>
            </div>
          </div>
          <div className="guide-step teamly bg-theme-muted/20">
            <div className="guide-step-number teamly">5</div>
            <div>
              <strong className="block mb-1">Submit</strong>
              <p className="text-sm text-theme-secondary">Your request will be sent to your manager for approval. You&apos;ll be notified when it&apos;s approved or declined.</p>
            </div>
          </div>
        </div>

        {/* Section 14 */}
        <div id="section-14" className="guide-section-header teamly scroll-mt-32">
          <div className="guide-module-label teamly">Teamly &mdash; Your Shifts &amp; Time Off</div>
          <h2>14. Checking Your Leave Balance</h2>
        </div>

        <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Teamly <span className="sep opacity-50">&rsaquo;</span> Leave <span className="sep opacity-50">&rsaquo;</span> Balances</span></p>
        <p className="mb-3 text-theme-secondary">View how many leave days you have:</p>
        <ul className="list-disc ml-6 space-y-1 text-theme-secondary mb-4">
          <li><strong>Entitled</strong> &mdash; your total annual allowance</li>
          <li><strong>Carried over</strong> &mdash; days carried from last year</li>
          <li><strong>Taken</strong> &mdash; days already used</li>
          <li><strong>Pending</strong> &mdash; days requested but not yet approved</li>
          <li><strong>Remaining</strong> &mdash; days still available</li>
        </ul>

        <p className="mb-3 text-theme-secondary">You can also see the <strong>Team Calendar</strong> to see when your colleagues are off &mdash; helpful for planning your own requests.</p>

        {/* Section 15 */}
        <div id="section-15" className="guide-section-header teamly scroll-mt-32">
          <div className="guide-module-label teamly">Teamly &mdash; Your Shifts &amp; Time Off</div>
          <h2>15. Your Training Records</h2>
        </div>

        <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Teamly <span className="sep opacity-50">&rsaquo;</span> Training</span></p>
        <p className="mb-3 text-theme-secondary">Your training and certification status is tracked in the app. You can view:</p>
        <ul className="list-disc ml-6 space-y-1 text-theme-secondary mb-4">
          <li>Which courses you&apos;ve completed</li>
          <li>Certificate expiry dates</li>
          <li>Which courses are due for renewal</li>
        </ul>
        <p className="mb-3 text-theme-secondary">Categories tracked include: Food Safety, Health &amp; Safety, Fire Marshal, First Aid, and COSHH/Allergen Awareness.</p>

        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200 mb-4">
          <strong className="block mb-1">Note:</strong> Your manager records training completions for you. If you&apos;ve completed a course and it&apos;s not showing, let your manager know so they can log it.
        </div>

        {/* Section 16 */}
        <div id="section-16" className="guide-section-header teamly scroll-mt-32">
          <div className="guide-module-label teamly">Teamly &mdash; Your Shifts &amp; Time Off</div>
          <h2>16. Onboarding Documents</h2>
        </div>

        <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Teamly <span className="sep opacity-50">&rsaquo;</span> Onboarding <span className="sep opacity-50">&rsaquo;</span> My Docs</span></p>
        <p className="mb-3 text-theme-secondary">If you&apos;re a new starter, your manager will assign you an onboarding pack containing important documents (employee handbook, policies, contracts, etc.).</p>

        <div className="space-y-3 my-4">
          <div className="guide-step teamly bg-theme-muted/20">
            <div className="guide-step-number teamly">1</div>
            <div>
              <strong className="block mb-1">Go to My Docs</strong>
              <p className="text-sm text-theme-secondary">You&apos;ll see a list of documents assigned to you.</p>
            </div>
          </div>
          <div className="guide-step teamly bg-theme-muted/20">
            <div className="guide-step-number teamly">2</div>
            <div>
              <strong className="block mb-1">Read each document</strong>
              <p className="text-sm text-theme-secondary">Download and read them carefully &mdash; they contain important information about your role, policies, and procedures.</p>
            </div>
          </div>
          <div className="guide-step teamly bg-theme-muted/20">
            <div className="guide-step-number teamly">3</div>
            <div>
              <strong className="block mb-1">Acknowledge</strong>
              <p className="text-sm text-theme-secondary">Once you&apos;ve read a document, mark it as acknowledged. Your manager can see which documents you&apos;ve completed.</p>
            </div>
          </div>
        </div>

        </div>{/* end Teamly background */}

        {/* ===== STOCKLY ===== */}
        <div className="guide-page-break" />

        <div className="rounded-2xl bg-stockly/[0.04] dark:bg-stockly/[0.03] border border-stockly/20 px-6 py-2 mb-6">

        <div id="section-17" className="guide-section-header stockly scroll-mt-32">
          <div className="guide-module-label stockly">Stockly &mdash; Stock &amp; Deliveries</div>
          <h2>17. Booking In Deliveries</h2>
        </div>

        <p className="mb-3 text-theme-secondary">When a delivery arrives at your site, your manager may ask you to book it in. Here&apos;s what to do:</p>

        <div className="space-y-3 my-4">
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">1</div>
            <div>
              <strong className="block mb-1">Check the delivery note</strong>
              <p className="text-sm text-theme-secondary">Match the items delivered against the delivery note. Check quantities and look for any damage.</p>
            </div>
          </div>
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">2</div>
            <div>
              <strong className="block mb-1">Check temperatures</strong>
              <p className="text-sm text-theme-secondary">For chilled and frozen goods, check the temperature on arrival and record it. Flag anything outside the safe range.</p>
            </div>
          </div>
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">3</div>
            <div>
              <strong className="block mb-1">Record in the app</strong>
              <p className="text-sm text-theme-secondary">Go to <span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Stockly <span className="sep opacity-50">&rsaquo;</span> Deliveries</span>, find the order, and confirm what was received. Note any discrepancies.</p>
            </div>
          </div>
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">4</div>
            <div>
              <strong className="block mb-1">Take a photo</strong>
              <p className="text-sm text-theme-secondary">Photograph the delivery note and any issues (damaged items, missing goods) as evidence.</p>
            </div>
          </div>
        </div>

        {/* Section 18 */}
        <div id="section-18" className="guide-section-header stockly scroll-mt-32">
          <div className="guide-module-label stockly">Stockly &mdash; Stock &amp; Deliveries</div>
          <h2>18. Logging Waste</h2>
        </div>

        <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Stockly <span className="sep opacity-50">&rsaquo;</span> Waste</span></p>

        <p className="mb-3 text-theme-secondary">Whenever you throw away food or stock, log it in the app:</p>
        <ul className="list-disc ml-6 space-y-1 text-theme-secondary mb-4">
          <li>Select the item from the stock list</li>
          <li>Enter the quantity wasted</li>
          <li>Choose a reason: spoilage, out of date, preparation waste, customer return, dropped/damaged</li>
          <li>Add a note if helpful (e.g. &ldquo;found at back of fridge, 3 days past use-by&rdquo;)</li>
        </ul>

        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200 mb-4">
          <strong className="block mb-1">Note:</strong> Logging waste isn&apos;t about blame &mdash; it helps the business understand where waste happens so it can be reduced. Always log it honestly.
        </div>

        {/* Section 19 */}
        <div id="section-19" className="guide-section-header stockly scroll-mt-32">
          <div className="guide-module-label stockly">Stockly &mdash; Stock &amp; Deliveries</div>
          <h2>19. Stock Counts</h2>
        </div>

        <p className="mb-1 text-theme-secondary"><span className="guide-nav-path bg-theme-muted/30 text-theme-tertiary">Stockly <span className="sep opacity-50">&rsaquo;</span> Stock Counts</span></p>

        <p className="mb-3 text-theme-secondary">Your manager may assign you to help with stock counts. You&apos;ll count the physical stock in a storage area and enter the quantities into the app. Be accurate &mdash; count carefully and double-check if unsure.</p>

        </div>{/* end Stockly background */}

        {/* ===== ASSETLY ===== */}
        <div className="guide-page-break" />

        <div className="rounded-2xl bg-assetly/[0.04] dark:bg-assetly/[0.03] border border-assetly/20 px-6 py-2 mb-6">

        <div id="section-20" className="guide-section-header assetly scroll-mt-32">
          <div className="guide-module-label assetly">Assetly &mdash; Reporting Issues</div>
          <h2>20. Reporting Equipment Issues</h2>
        </div>

        <p className="mb-3 text-theme-secondary">If a piece of equipment breaks down or isn&apos;t working properly (e.g. a fridge not cooling, a dishwasher leaking, an oven not heating), report it through the app:</p>

        <ul className="list-disc ml-6 space-y-1 text-theme-secondary mb-4">
          <li>Flag the issue on the relevant Checkly task if you notice it during a check</li>
          <li>Or tell your manager directly so they can log a callout in Assetly</li>
        </ul>

        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200 mb-4">
          <strong className="block mb-1">Important:</strong> If a fridge or freezer fails, do not move food without manager approval. Report it immediately &mdash; time is critical for food safety.
        </div>

        </div>{/* end Assetly background */}

        {/* ===== MSGLY ===== */}

        <div className="rounded-2xl bg-msgly/[0.04] dark:bg-msgly/[0.03] border border-msgly/20 px-6 py-2 mb-6">

        <div id="section-21" className="guide-section-header msgly scroll-mt-32">
          <div className="guide-module-label msgly">Msgly &mdash; Messaging</div>
          <h2>21. Sending &amp; Receiving Messages</h2>
        </div>

        <p className="mb-3 text-theme-secondary">Opsly has built-in messaging so you can communicate with your team without needing separate apps.</p>

        <ul className="list-disc ml-6 space-y-1 text-theme-secondary mb-4">
          <li>Access messages from the <strong>Messages</strong> icon in the sidebar</li>
          <li>Send direct messages to any colleague</li>
          <li>Join group channels for your team or department</li>
          <li>Unread messages show a badge count so you don&apos;t miss anything</li>
        </ul>

        <p className="mb-3 text-theme-secondary">Messages open in a side panel, so you can read and reply without leaving your current page.</p>

        </div>{/* end Msgly background */}

        {/* ===== QUICK REFERENCE ===== */}
        <div className="guide-page-break" />

        <div className="rounded-2xl bg-theme-muted/10 border border-theme px-6 py-2 mb-6">

        <div id="section-22" className="guide-section-header general scroll-mt-32">
          <div className="guide-module-label general">Quick Reference</div>
          <h2>22. Your Daily Checklist</h2>
        </div>

        <p className="mb-3 text-theme-secondary">Here&apos;s a quick summary of what to do each day:</p>

        <div className="guide-quick-ref border-theme">
          <h3>Start of Shift</h3>
          <div className="guide-quick-ref-grid">
            <div className="guide-quick-ref-item bg-theme-muted/20">
              <strong className="text-theme-primary">Clock In</strong>
              <span className="text-theme-tertiary">More tab &rarr; Clock In</span>
            </div>
            <div className="guide-quick-ref-item bg-theme-muted/20">
              <strong className="text-theme-primary">Check Tasks</strong>
              <span className="text-theme-tertiary">Tasks tab &rarr; see what&apos;s due</span>
            </div>
          </div>
        </div>

        <div className="guide-quick-ref border-theme">
          <h3>During Your Shift</h3>
          <div className="guide-quick-ref-grid">
            <div className="guide-quick-ref-item bg-theme-muted/20">
              <strong className="text-theme-primary">Complete Tasks</strong>
              <span className="text-theme-tertiary">Tap each task &rarr; fill in &rarr; submit</span>
            </div>
            <div className="guide-quick-ref-item bg-theme-muted/20">
              <strong className="text-theme-primary">Temperature Checks</strong>
              <span className="text-theme-tertiary">Record actual readings &mdash; always honest</span>
            </div>
            <div className="guide-quick-ref-item bg-theme-muted/20">
              <strong className="text-theme-primary">Photo Evidence</strong>
              <span className="text-theme-tertiary">Clear, well-lit photos when required</span>
            </div>
            <div className="guide-quick-ref-item bg-theme-muted/20">
              <strong className="text-theme-primary">Flag Issues</strong>
              <span className="text-theme-tertiary">Use the flag option if something&apos;s wrong</span>
            </div>
          </div>
        </div>

        <div className="guide-quick-ref border-theme">
          <h3>End of Shift</h3>
          <div className="guide-quick-ref-grid">
            <div className="guide-quick-ref-item bg-theme-muted/20">
              <strong className="text-theme-primary">Complete Remaining Tasks</strong>
              <span className="text-theme-tertiary">Finish any evening/closing tasks assigned to you</span>
            </div>
            <div className="guide-quick-ref-item bg-theme-muted/20">
              <strong className="text-theme-primary">Clock Out</strong>
              <span className="text-theme-tertiary">More tab &rarr; Clock Out (don&apos;t forget!)</span>
            </div>
          </div>
        </div>

        <div className="guide-quick-ref border-theme">
          <h3>When You Need To</h3>
          <div className="guide-quick-ref-grid">
            <div className="guide-quick-ref-item bg-theme-muted/20">
              <strong className="text-theme-primary">Request Leave</strong>
              <span className="text-theme-tertiary">Teamly &rarr; Leave &rarr; Request</span>
            </div>
            <div className="guide-quick-ref-item bg-theme-muted/20">
              <strong className="text-theme-primary">Set Availability</strong>
              <span className="text-theme-tertiary">Teamly &rarr; Schedule &rarr; Availability</span>
            </div>
            <div className="guide-quick-ref-item bg-theme-muted/20">
              <strong className="text-theme-primary">Check Rota</strong>
              <span className="text-theme-tertiary">Rota tab or Calendar tab</span>
            </div>
            <div className="guide-quick-ref-item bg-theme-muted/20">
              <strong className="text-theme-primary">View Leave Balance</strong>
              <span className="text-theme-tertiary">Teamly &rarr; Leave &rarr; Balances</span>
            </div>
          </div>
        </div>

        {/* Section 23 */}
        <div id="section-23" className="guide-section-header general scroll-mt-32">
          <div className="guide-module-label general">Quick Reference</div>
          <h2>23. Getting Help</h2>
        </div>

        <p className="mb-3 text-theme-secondary">If you&apos;re stuck or something isn&apos;t working:</p>

        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-theme">
                <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-theme-tertiary font-semibold">Method</th>
                <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-theme-tertiary font-semibold">How</th>
              </tr>
            </thead>
            <tbody className="text-theme-secondary">
              <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Ask Opsly (AI)</td><td className="py-2 px-3">Tap the &ldquo;Ask Opsly&rdquo; button (top-right on desktop, or in the More sheet on mobile)</td></tr>
              <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Help Centre</td><td className="py-2 px-3">Menu &rarr; Help &amp; Support. Browse guides, common tasks, and quick tips.</td></tr>
              <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Ask your manager</td><td className="py-2 px-3">For anything specific to your site, your manager is your first point of contact.</td></tr>
              <tr className="border-b border-theme-muted/30"><td className="py-2 px-3 font-medium text-theme-primary">Email support</td><td className="py-2 px-3">hello@opslytech.com (response within 24 hours)</td></tr>
              <tr><td className="py-2 px-3 font-medium text-theme-primary">Phone support</td><td className="py-2 px-3">+44 07891 710002 (Mon&ndash;Fri, 9am&ndash;6pm)</td></tr>
            </tbody>
          </table>
        </div>

        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-200 mb-4">
          <strong className="block mb-1">Welcome to Opsly!</strong>
          The app is designed to make your daily work easier. Tasks guide you through exactly what needs to be done, the rota keeps you up to date on your shifts, and everything is recorded so there&apos;s no more paper checklists or guesswork. If something doesn&apos;t seem right, just flag it &mdash; that&apos;s what the system is for.
        </div>

        </div>{/* end Quick Reference background */}

        <div className="text-center pt-10 mt-16 border-t border-theme text-xs text-theme-tertiary">
          opsly. &mdash; Staff Guide &mdash; All Modules &mdash; Beta Edition February 2026<br />
          &copy; 2026 Opsly Technologies Ltd. All rights reserved. Confidential.
        </div>
      </div>
    </>
  )
}