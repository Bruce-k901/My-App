// @salsa - SALSA Compliance: How-to guide for site managers
'use client'

export default function SALSAGuideContent() {
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
          body { background: white !important; color: black !important; }
          nav, aside, header, footer { display: none !important; }
        }
        .guide-section-header {
          padding: 20px 0;
          margin: 40px 0 24px 0;
          border-bottom: 3px solid;
        }
        .guide-section-header.stockly { border-color: #789A99; }
        .dark .guide-section-header.stockly { border-color: #789A99; }
        .guide-section-header.general { border-color: #110f0d; }
        .dark .guide-section-header.general { border-color: #a09890; }
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
        .guide-module-label.stockly { color: #6B8F8E; }
        .dark .guide-module-label.stockly { color: #789A99; }
        .guide-module-label.general { color: #666; }
        .dark .guide-module-label.general { color: #a09890; }
        .guide-step {
          display: flex;
          gap: 14px;
          margin-bottom: 14px;
          padding: 14px 16px;
          border-radius: 8px;
          border-left: 3px solid #ddd;
        }
        .guide-step.stockly { border-left-color: #789A99; }
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
        .guide-step-number.stockly { background: #789A99; color: #fff; }
        .dark .guide-step-number.stockly { background: #789A99; color: #1a1a1a; }
        .guide-step-number.general { background: #110f0d; }
        .dark .guide-step-number.general { background: #a09890; color: #110f0d; }
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

      <div className="guide-content text-theme-primary">
        {/* ===== TABLE OF CONTENTS ===== */}
        <div className="bg-theme-muted/30 rounded-xl p-8 mb-8">
          <h3 className="text-lg font-semibold mb-4">Contents</h3>

          <div className="mb-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-theme-tertiary mb-2 pb-1 border-b-2 border-gray-300 dark:border-gray-600 inline-block">Introduction</div>
            <ol className="ml-5 text-sm text-theme-secondary space-y-1">
              <li>What is SALSA?</li>
              <li>The SALSA Dashboard</li>
            </ol>
          </div>

          <div className="mb-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-stockly-dark dark:text-stockly mb-2 pb-1 border-b-2 border-stockly inline-block">Stockly &mdash; SALSA Compliance</div>
            <ol className="ml-5 text-sm text-theme-secondary space-y-1" start={3}>
              <li>Batch Tracking</li>
              <li>Traceability</li>
              <li>Mock Recall Exercises</li>
              <li>Supplier Approval</li>
              <li>Production Batch Records</li>
              <li>Recalls &amp; Withdrawals</li>
              <li>Non-Conformances</li>
              <li>Calibration Records</li>
              <li>Compliance Templates</li>
            </ol>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-theme-tertiary mb-2 pb-1 border-b-2 border-gray-300 dark:border-gray-600 inline-block">Quick Reference</div>
            <ol className="ml-5 text-sm text-theme-secondary space-y-1" start={12}>
              <li>Daily / Weekly / Monthly Checklist</li>
              <li>Preparing for a SALSA Audit</li>
            </ol>
          </div>
        </div>

        {/* ===== SECTION 1: WHAT IS SALSA? ===== */}
        <div className="guide-section-header general">
          <div className="guide-module-label general">Introduction</div>
          <h2>1. What is SALSA?</h2>
        </div>

        <p className="mb-3 text-theme-secondary">
          SALSA (Safe and Local Supplier Approval) is a food safety standard designed for small and micro food producers in the UK. It demonstrates to buyers that your business operates to a high standard of food safety and legality.
        </p>

        <p className="mb-3 text-theme-secondary">
          Opsly&apos;s Stockly module has been built to cover all five sections of the SALSA standard:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
          <div className="p-3 rounded-lg bg-stockly-dark/5 dark:bg-stockly/10 border border-stockly-dark/20 dark:border-stockly/20">
            <strong className="text-sm text-theme-primary block mb-1">Section 1: Prerequisite Controls</strong>
            <span className="text-xs text-theme-tertiary">Premises, hygiene, temperature, cleaning, pest control, allergens, labelling</span>
          </div>
          <div className="p-3 rounded-lg bg-stockly-dark/5 dark:bg-stockly/10 border border-stockly-dark/20 dark:border-stockly/20">
            <strong className="text-sm text-theme-primary block mb-1">Section 2: HACCP</strong>
            <span className="text-xs text-theme-tertiary">Hazard analysis, CCPs, monitoring, corrective actions</span>
          </div>
          <div className="p-3 rounded-lg bg-stockly-dark/5 dark:bg-stockly/10 border border-stockly-dark/20 dark:border-stockly/20">
            <strong className="text-sm text-theme-primary block mb-1">Section 3: Management Systems</strong>
            <span className="text-xs text-theme-tertiary">Training, traceability, recall procedures, document control, specs</span>
          </div>
          <div className="p-3 rounded-lg bg-stockly-dark/5 dark:bg-stockly/10 border border-stockly-dark/20 dark:border-stockly/20">
            <strong className="text-sm text-theme-primary block mb-1">Section 4: GMP</strong>
            <span className="text-xs text-theme-tertiary">Process control, calibration, metal detection, quantity control</span>
          </div>
          <div className="p-3 rounded-lg bg-stockly-dark/5 dark:bg-stockly/10 border border-stockly-dark/20 dark:border-stockly/20 sm:col-span-2">
            <strong className="text-sm text-theme-primary block mb-1">Section 5: Supplier Approval</strong>
            <span className="text-xs text-theme-tertiary">Risk assessment, supplier specs, goods-in procedures, food fraud</span>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-200 mb-4">
          <strong className="block mb-1">How It All Fits Together</strong>
          The system works across several interconnected areas: raw material batches are tracked from delivery through production to dispatch. Suppliers are approved and monitored. Non-conformances are logged and closed out. Calibration records are maintained. Everything feeds into the SALSA Dashboard for a single audit-ready view.
        </div>

        {/* ===== SECTION 2: SALSA DASHBOARD ===== */}
        <div className="guide-page-break" />
        <div className="guide-section-header stockly">
          <div className="guide-module-label stockly">Stockly</div>
          <h2>2. The SALSA Dashboard</h2>
        </div>

        <p className="mb-3 text-theme-secondary">
          The SALSA Dashboard is your central compliance view &mdash; the page you open before an audit to check everything is in order.
        </p>

        <div className="guide-nav-path bg-theme-muted/30 text-theme-secondary mb-4">
          Stockly <span className="sep">&rsaquo;</span> SALSA Dashboard
        </div>

        <p className="mb-3 text-theme-secondary">The dashboard shows seven summary cards:</p>

        <div className="space-y-2 my-4 text-sm">
          <div className="flex gap-3 items-start p-3 rounded-lg bg-theme-muted/20">
            <span className="text-lg">1.</span>
            <div><strong>Supplier Approval</strong> &mdash; How many suppliers are approved, any with overdue reviews or expired documents</div>
          </div>
          <div className="flex gap-3 items-start p-3 rounded-lg bg-theme-muted/20">
            <span className="text-lg">2.</span>
            <div><strong>Batch Status</strong> &mdash; Active batches, expiring soon, expired, or quarantined</div>
          </div>
          <div className="flex gap-3 items-start p-3 rounded-lg bg-theme-muted/20">
            <span className="text-lg">3.</span>
            <div><strong>Calibration</strong> &mdash; Temperature probe calibration status (current, overdue, due soon)</div>
          </div>
          <div className="flex gap-3 items-start p-3 rounded-lg bg-theme-muted/20">
            <span className="text-lg">4.</span>
            <div><strong>Non-Conformances</strong> &mdash; Open NCs, overdue corrective actions, closed this month</div>
          </div>
          <div className="flex gap-3 items-start p-3 rounded-lg bg-theme-muted/20">
            <span className="text-lg">5.</span>
            <div><strong>Recalls</strong> &mdash; Active recalls and the date of the last mock recall exercise</div>
          </div>
          <div className="flex gap-3 items-start p-3 rounded-lg bg-theme-muted/20">
            <span className="text-lg">6.</span>
            <div><strong>Traceability</strong> &mdash; Dispatch records and production runs this month</div>
          </div>
          <div className="flex gap-3 items-start p-3 rounded-lg bg-theme-muted/20">
            <span className="text-lg">7.</span>
            <div><strong>Compliance Templates</strong> &mdash; SALSA-specific task completion status</div>
          </div>
        </div>

        <p className="mb-3 text-theme-secondary">
          Each card shows a green, amber, or red indicator. Click any card to navigate to the relevant page. Use the <strong>Print</strong> button to produce a clean audit evidence printout.
        </p>

        {/* ===== SECTION 3: BATCH TRACKING ===== */}
        <div className="guide-page-break" />
        <div className="guide-section-header stockly">
          <div className="guide-module-label stockly">Stockly</div>
          <h2>3. Batch Tracking</h2>
        </div>

        <p className="mb-3 text-theme-secondary">
          Every raw material delivery automatically creates batch records, giving you full traceability from goods-in to waste or production.
        </p>

        <div className="guide-nav-path bg-theme-muted/30 text-theme-secondary mb-4">
          Stockly <span className="sep">&rsaquo;</span> Batches
        </div>

        <h3 className="text-base font-semibold mt-6 mb-3 text-theme-primary">How Batches Are Created</h3>

        <div className="space-y-3 my-4">
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">1</div>
            <div>
              <strong className="block mb-1">Receive a delivery</strong>
              <p className="text-sm text-theme-secondary">When you confirm a delivery in Stockly, batches are automatically created for each line item. The system captures the supplier&apos;s batch code, use-by date, best-before date, and temperature reading.</p>
            </div>
          </div>
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">2</div>
            <div>
              <strong className="block mb-1">FIFO ordering</strong>
              <p className="text-sm text-theme-secondary">When selecting batches for waste or production, the system orders by use-by date (oldest first) and warns if you pick a newer batch &mdash; helping you follow First In, First Out.</p>
            </div>
          </div>
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">3</div>
            <div>
              <strong className="block mb-1">Expiry monitoring</strong>
              <p className="text-sm text-theme-secondary">The system automatically flags batches approaching their use-by date and auto-expires them when the date passes. You&apos;ll see colour-coded warnings on the Batches page.</p>
            </div>
          </div>
        </div>

        <h3 className="text-base font-semibold mt-6 mb-3 text-theme-primary">Batch Statuses</h3>
        <div className="overflow-x-auto my-4">
          <table className="w-full text-sm border-collapse">
            <thead><tr className="border-b-2 border-theme">
              <th className="text-left py-2 font-medium">Status</th>
              <th className="text-left py-2 font-medium">Meaning</th>
            </tr></thead>
            <tbody className="text-theme-secondary">
              <tr className="border-b border-theme/50"><td className="py-2 font-medium text-green-600 dark:text-green-400">Active</td><td className="py-2">Batch is in stock and available for use</td></tr>
              <tr className="border-b border-theme/50"><td className="py-2 font-medium text-gray-500">Depleted</td><td className="py-2">All stock has been used (waste or production)</td></tr>
              <tr className="border-b border-theme/50"><td className="py-2 font-medium text-red-600 dark:text-red-400">Expired</td><td className="py-2">Past use-by date &mdash; must not be used</td></tr>
              <tr className="border-b border-theme/50"><td className="py-2 font-medium text-amber-600 dark:text-amber-400">Quarantined</td><td className="py-2">Held pending investigation (e.g. during a recall)</td></tr>
              <tr><td className="py-2 font-medium text-red-700 dark:text-red-300">Recalled</td><td className="py-2">Part of a formal recall &mdash; do not use or dispatch</td></tr>
            </tbody>
          </table>
        </div>

        {/* ===== SECTION 4: TRACEABILITY ===== */}
        <div className="guide-page-break" />
        <div className="guide-section-header stockly">
          <div className="guide-module-label stockly">Stockly</div>
          <h2>4. Traceability</h2>
        </div>

        <p className="mb-3 text-theme-secondary">
          SALSA requires that you can trace any ingredient forward to the customer and any finished product backward to the raw material supplier. Opsly does this automatically.
        </p>

        <div className="guide-nav-path bg-theme-muted/30 text-theme-secondary mb-4">
          Stockly <span className="sep">&rsaquo;</span> Compliance <span className="sep">&rsaquo;</span> Traceability
        </div>

        <h3 className="text-base font-semibold mt-6 mb-3 text-theme-primary">Running a Trace</h3>

        <div className="space-y-3 my-4">
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">1</div>
            <div>
              <strong className="block mb-1">Enter a batch code</strong>
              <p className="text-sm text-theme-secondary">Type or scan a batch code into the search bar on the Traceability page.</p>
            </div>
          </div>
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">2</div>
            <div>
              <strong className="block mb-1">Choose direction</strong>
              <p className="text-sm text-theme-secondary"><strong>Forward trace:</strong> Raw material &rarr; Production &rarr; Finished goods &rarr; Customers. <strong>Backward trace:</strong> Customer &larr; Finished goods &larr; Production &larr; Raw materials &larr; Supplier.</p>
            </div>
          </div>
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">3</div>
            <div>
              <strong className="block mb-1">Review the trace tree</strong>
              <p className="text-sm text-theme-secondary">The system displays a visual tree showing every step in the chain. The mass balance card shows total input vs output quantities.</p>
            </div>
          </div>
        </div>

        {/* ===== SECTION 5: MOCK RECALL ===== */}
        <div className="guide-page-break" />
        <div className="guide-section-header stockly">
          <div className="guide-module-label stockly">Stockly</div>
          <h2>5. Mock Recall Exercises</h2>
        </div>

        <p className="mb-3 text-theme-secondary">
          SALSA requires at least one mock recall exercise per year. The target is to complete the trace within <strong>4 hours</strong>. Opsly includes a built-in timer on the Traceability page.
        </p>

        <div className="space-y-3 my-4">
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">1</div>
            <div>
              <strong className="block mb-1">Start the exercise</strong>
              <p className="text-sm text-theme-secondary">On the Traceability page, click <strong>Start Mock Recall</strong>. The timer starts immediately.</p>
            </div>
          </div>
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">2</div>
            <div>
              <strong className="block mb-1">Pick a batch and trace both ways</strong>
              <p className="text-sm text-theme-secondary">Enter a batch code and run both a forward and backward trace. Verify you can identify all customers and all raw material suppliers.</p>
            </div>
          </div>
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">3</div>
            <div>
              <strong className="block mb-1">Check the mass balance</strong>
              <p className="text-sm text-theme-secondary">The mass balance should be within &plusmn;5%. If variance is higher, investigate the difference.</p>
            </div>
          </div>
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">4</div>
            <div>
              <strong className="block mb-1">Record the result</strong>
              <p className="text-sm text-theme-secondary">Complete the <strong>Mock Recall Exercise</strong> compliance template in Checkly, recording the batch code, time taken, and outcome (pass/fail).</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200 mb-4">
          <strong className="block mb-1">What If It Takes Longer Than 4 Hours?</strong>
          Record a &ldquo;fail&rdquo; and document corrective actions &mdash; what will you improve to be faster next time? Common issues: missing dispatch records, incomplete batch codes on deliveries, or gaps in production records.
        </div>

        {/* ===== SECTION 6: SUPPLIER APPROVAL ===== */}
        <div className="guide-page-break" />
        <div className="guide-section-header stockly">
          <div className="guide-module-label stockly">Stockly</div>
          <h2>6. Supplier Approval</h2>
        </div>

        <p className="mb-3 text-theme-secondary">
          SALSA requires a documented supplier approval process. Every supplier providing ingredients or food-contact materials must be formally approved with supporting documents.
        </p>

        <div className="guide-nav-path bg-theme-muted/30 text-theme-secondary mb-4">
          Stockly <span className="sep">&rsaquo;</span> Suppliers <span className="sep">&rsaquo;</span> [Supplier Name]
        </div>

        <h3 className="text-base font-semibold mt-6 mb-3 text-theme-primary">Approving a Supplier</h3>

        <div className="space-y-3 my-4">
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">1</div>
            <div>
              <strong className="block mb-1">Click on the supplier</strong>
              <p className="text-sm text-theme-secondary">Navigate to the supplier detail page from the Suppliers list.</p>
            </div>
          </div>
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">2</div>
            <div>
              <strong className="block mb-1">Upload documents</strong>
              <p className="text-sm text-theme-secondary">Go to the <strong>Documents</strong> tab. Upload certificates (food safety, allergen, insurance, etc.) with expiry dates. The system will warn you when documents are approaching expiry.</p>
            </div>
          </div>
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">3</div>
            <div>
              <strong className="block mb-1">Set approval status</strong>
              <p className="text-sm text-theme-secondary">Go to the <strong>Approval</strong> tab. Set the status to Approved, Conditional, or Not Approved. Assign a risk rating (Low, Medium, High) and set the next review date.</p>
            </div>
          </div>
        </div>

        <div className="guide-nav-path bg-theme-muted/30 text-theme-secondary mb-3">
          Stockly <span className="sep">&rsaquo;</span> Suppliers <span className="sep">&rsaquo;</span> Approved List
        </div>
        <p className="mb-3 text-theme-secondary">
          The <strong>Approved Supplier List</strong> page provides a print-friendly report with CSV export. Use this for your SALSA audit file.
        </p>

        {/* ===== SECTION 7: PRODUCTION BATCH RECORDS ===== */}
        <div className="guide-page-break" />
        <div className="guide-section-header stockly">
          <div className="guide-module-label stockly">Stockly</div>
          <h2>7. Production Batch Records</h2>
        </div>

        <p className="mb-3 text-theme-secondary">
          When you make a product, a production batch record links the raw material batches you used to the finished product batches you created &mdash; maintaining full traceability and allergen tracking.
        </p>

        <div className="guide-nav-path bg-theme-muted/30 text-theme-secondary mb-4">
          Planly <span className="sep">&rsaquo;</span> Production Batches
        </div>

        <div className="space-y-3 my-4">
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">1</div>
            <div>
              <strong className="block mb-1">Create a production batch</strong>
              <p className="text-sm text-theme-secondary">Select the recipe, set the date and planned quantity. A batch code is auto-generated.</p>
            </div>
          </div>
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">2</div>
            <div>
              <strong className="block mb-1">Add input batches</strong>
              <p className="text-sm text-theme-secondary">Select the raw material batches you&apos;re using. The system follows FIFO and warns if you pick newer stock. Quantities are deducted from the raw material batches.</p>
            </div>
          </div>
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">3</div>
            <div>
              <strong className="block mb-1">Record CCP measurements</strong>
              <p className="text-sm text-theme-secondary">Record Critical Control Point readings: cooking temperatures, cooling times, metal detection results, pH levels. Each reading is checked against target values.</p>
            </div>
          </div>
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">4</div>
            <div>
              <strong className="block mb-1">Record finished product output</strong>
              <p className="text-sm text-theme-secondary">Enter the quantity of finished product. A new stock batch is created with a batch code, use-by date, and allergens automatically inherited from the inputs.</p>
            </div>
          </div>
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">5</div>
            <div>
              <strong className="block mb-1">Complete the batch</strong>
              <p className="text-sm text-theme-secondary">Mark the production batch as complete. The system calculates yield and aggregates all allergens from input batches.</p>
            </div>
          </div>
        </div>

        {/* ===== SECTION 8: RECALLS ===== */}
        <div className="guide-page-break" />
        <div className="guide-section-header stockly">
          <div className="guide-module-label stockly">Stockly</div>
          <h2>8. Recalls &amp; Withdrawals</h2>
        </div>

        <p className="mb-3 text-theme-secondary">
          If a food safety issue is discovered, you need to be able to recall affected products quickly. Opsly manages the full recall workflow.
        </p>

        <div className="guide-nav-path bg-theme-muted/30 text-theme-secondary mb-4">
          Stockly <span className="sep">&rsaquo;</span> Compliance <span className="sep">&rsaquo;</span> Recalls
        </div>

        <div className="space-y-3 my-4">
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">1</div>
            <div>
              <strong className="block mb-1">Create a recall</strong>
              <p className="text-sm text-theme-secondary">Click <strong>New Recall</strong>. Enter a title, reason, type (recall or withdrawal), and severity (Class 1/2/3). A recall code is auto-generated.</p>
            </div>
          </div>
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">2</div>
            <div>
              <strong className="block mb-1">Add affected batches</strong>
              <p className="text-sm text-theme-secondary">Search for and add the batches involved. They are automatically quarantined and a batch movement record is created.</p>
            </div>
          </div>
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">3</div>
            <div>
              <strong className="block mb-1">Trace downstream customers</strong>
              <p className="text-sm text-theme-secondary">Use the <strong>Trace</strong> tab to automatically identify all customers who received the affected batches via dispatch records.</p>
            </div>
          </div>
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">4</div>
            <div>
              <strong className="block mb-1">Record customer notifications</strong>
              <p className="text-sm text-theme-secondary">On the <strong>Notifications</strong> tab, log each customer contact: method (phone, email), when, response received, stock returned.</p>
            </div>
          </div>
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">5</div>
            <div>
              <strong className="block mb-1">Notify FSA and SALSA</strong>
              <p className="text-sm text-theme-secondary">Record when you&apos;ve notified the FSA and SALSA. SALSA must be notified within 3 working days &mdash; the system will alert you if this is overdue.</p>
            </div>
          </div>
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">6</div>
            <div>
              <strong className="block mb-1">Generate the recall report</strong>
              <p className="text-sm text-theme-secondary">Use the <strong>Report</strong> tab to generate a comprehensive print-friendly report covering all aspects of the recall.</p>
            </div>
          </div>
        </div>

        <p className="mb-3 text-theme-secondary">
          <strong>Status workflow:</strong> Draft &rarr; Active &rarr; Investigating &rarr; Notified &rarr; Resolved &rarr; Closed
        </p>

        {/* ===== SECTION 9: NON-CONFORMANCES ===== */}
        <div className="guide-page-break" />
        <div className="guide-section-header stockly">
          <div className="guide-module-label stockly">Stockly</div>
          <h2>9. Non-Conformances</h2>
        </div>

        <p className="mb-3 text-theme-secondary">
          A non-conformance (NC) is anything that doesn&apos;t meet your food safety standards &mdash; a missed temperature log, a cleaning schedule not followed, an expired supplier certificate. SALSA requires a formal register of these with corrective action closure evidence.
        </p>

        <div className="guide-nav-path bg-theme-muted/30 text-theme-secondary mb-4">
          Stockly <span className="sep">&rsaquo;</span> Compliance <span className="sep">&rsaquo;</span> Non-Conformances
        </div>

        <h3 className="text-base font-semibold mt-6 mb-3 text-theme-primary">Raising a Non-Conformance</h3>

        <div className="space-y-3 my-4">
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">1</div>
            <div>
              <strong className="block mb-1">Click &ldquo;New Non-Conformance&rdquo;</strong>
              <p className="text-sm text-theme-secondary">Enter a title, select the category (hygiene, temperature, cleaning, etc.), severity (minor/major/critical), and source (internal audit, staff observation, etc.).</p>
            </div>
          </div>
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">2</div>
            <div>
              <strong className="block mb-1">NC code is auto-generated</strong>
              <p className="text-sm text-theme-secondary">The system assigns a sequential code like NC-2026-001. Set a corrective action due date.</p>
            </div>
          </div>
        </div>

        <h3 className="text-base font-semibold mt-6 mb-3 text-theme-primary">The 5-Step Workflow</h3>

        <div className="overflow-x-auto my-4">
          <table className="w-full text-sm border-collapse">
            <thead><tr className="border-b-2 border-theme">
              <th className="text-left py-2 font-medium">Status</th>
              <th className="text-left py-2 font-medium">What Happens</th>
              <th className="text-left py-2 font-medium">Action Required</th>
            </tr></thead>
            <tbody className="text-theme-secondary">
              <tr className="border-b border-theme/50"><td className="py-2 font-medium text-red-600 dark:text-red-400">Open</td><td className="py-2">NC has been raised</td><td className="py-2">Investigate the issue</td></tr>
              <tr className="border-b border-theme/50"><td className="py-2 font-medium text-amber-600 dark:text-amber-400">Investigating</td><td className="py-2">Root cause entered</td><td className="py-2">Define corrective action</td></tr>
              <tr className="border-b border-theme/50"><td className="py-2 font-medium text-blue-600 dark:text-blue-400">Corrective Action</td><td className="py-2">Action defined</td><td className="py-2">Complete the action, upload evidence</td></tr>
              <tr className="border-b border-theme/50"><td className="py-2 font-medium text-purple-600 dark:text-purple-400">Verification</td><td className="py-2">Action marked complete</td><td className="py-2">Verify it was effective</td></tr>
              <tr><td className="py-2 font-medium text-green-600 dark:text-green-400">Closed</td><td className="py-2">Verified and closed</td><td className="py-2">None &mdash; archived for audit evidence</td></tr>
            </tbody>
          </table>
        </div>

        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-200 mb-4">
          <strong className="block mb-1">Tip: Status Transitions Are Automatic</strong>
          When you enter a root cause, the NC moves to &ldquo;Investigating&rdquo;. When you enter a corrective action, it moves to &ldquo;Corrective Action&rdquo;. When you mark it complete, it moves to &ldquo;Verification&rdquo;. You only need to manually close it after verification.
        </div>

        {/* ===== SECTION 10: CALIBRATION ===== */}
        <div className="guide-page-break" />
        <div className="guide-section-header stockly">
          <div className="guide-module-label stockly">Stockly</div>
          <h2>10. Calibration Records</h2>
        </div>

        <p className="mb-3 text-theme-secondary">
          SALSA requires formal calibration records for temperature probes. Opsly stores calibration certificates with readings and automatically alerts you when recalibration is due.
        </p>

        <div className="guide-nav-path bg-theme-muted/30 text-theme-secondary mb-4">
          Assetly <span className="sep">&rsaquo;</span> Assets <span className="sep">&rsaquo;</span> [Probe Name] <span className="sep">&rsaquo;</span> Calibration History
        </div>

        <div className="space-y-3 my-4">
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">1</div>
            <div>
              <strong className="block mb-1">Find the probe in Assets</strong>
              <p className="text-sm text-theme-secondary">Navigate to the Assets page and expand a temperature probe. The <strong>Calibration History</strong> section shows at the bottom.</p>
            </div>
          </div>
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">2</div>
            <div>
              <strong className="block mb-1">Click &ldquo;Add Calibration&rdquo;</strong>
              <p className="text-sm text-theme-secondary">Enter the calibration date, who performed it, the method (ice bath &amp; boiling water, external lab, or manufacturer), and the readings.</p>
            </div>
          </div>
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">3</div>
            <div>
              <strong className="block mb-1">Record results</strong>
              <p className="text-sm text-theme-secondary">For ice bath/boiling water calibration, enter both readings. The variance is calculated automatically. Set the result as Pass, Fail, or Adjusted. Enter the certificate reference number.</p>
            </div>
          </div>
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">4</div>
            <div>
              <strong className="block mb-1">Set next due date</strong>
              <p className="text-sm text-theme-secondary">The next calibration due date defaults to 12 months. The system shows a status badge: <span className="text-green-600 dark:text-green-400 font-medium">Current</span>, <span className="text-amber-600 dark:text-amber-400 font-medium">Due Soon</span> (within 14 days), or <span className="text-red-600 dark:text-red-400 font-medium">Overdue</span>.</p>
            </div>
          </div>
        </div>

        {/* ===== SECTION 11: COMPLIANCE TEMPLATES ===== */}
        <div className="guide-page-break" />
        <div className="guide-section-header stockly">
          <div className="guide-module-label stockly">Stockly</div>
          <h2>11. Compliance Templates</h2>
        </div>

        <p className="mb-3 text-theme-secondary">
          Seven SALSA-specific compliance templates are built into the system. These generate scheduled tasks that staff complete as evidence of ongoing compliance.
        </p>

        <div className="overflow-x-auto my-4">
          <table className="w-full text-sm border-collapse">
            <thead><tr className="border-b-2 border-theme">
              <th className="text-left py-2 font-medium">Template</th>
              <th className="text-left py-2 font-medium">Frequency</th>
              <th className="text-left py-2 font-medium">Purpose</th>
            </tr></thead>
            <tbody className="text-theme-secondary">
              <tr className="border-b border-theme/50"><td className="py-2 font-medium text-theme-primary">Annual SALSA Food Safety Review</td><td className="py-2">Annually</td><td className="py-2">Full review of all 5 SALSA sections</td></tr>
              <tr className="border-b border-theme/50"><td className="py-2 font-medium text-theme-primary">Mock Recall Exercise</td><td className="py-2">Annually</td><td className="py-2">Demonstrate traceability within 4 hours</td></tr>
              <tr className="border-b border-theme/50"><td className="py-2 font-medium text-theme-primary">Food Fraud Vulnerability Assessment</td><td className="py-2">Annually</td><td className="py-2">Assess authenticity, substitution, dilution risks</td></tr>
              <tr className="border-b border-theme/50"><td className="py-2 font-medium text-theme-primary">HACCP Plan Review</td><td className="py-2">Annually</td><td className="py-2">Verify HACCP plan is current and effective</td></tr>
              <tr className="border-b border-theme/50"><td className="py-2 font-medium text-theme-primary">Internal Food Safety Audit</td><td className="py-2">Quarterly</td><td className="py-2">Audit hygiene, cleaning, temps, allergens, docs</td></tr>
              <tr className="border-b border-theme/50"><td className="py-2 font-medium text-theme-primary">Supplier Approval Review</td><td className="py-2">Annually</td><td className="py-2">Verify all supplier certificates and risk ratings</td></tr>
              <tr><td className="py-2 font-medium text-theme-primary">Goods-In Inspection Verification</td><td className="py-2">Weekly</td><td className="py-2">Check goods-in procedures are being followed</td></tr>
            </tbody>
          </table>
        </div>

        <p className="mb-3 text-theme-secondary">
          These templates are imported via the Checkly compliance templates system. Once imported, they automatically generate tasks at the correct frequency.
        </p>

        {/* ===== SECTION 12: CHECKLIST ===== */}
        <div className="guide-page-break" />
        <div className="guide-section-header general">
          <div className="guide-module-label general">Quick Reference</div>
          <h2>12. Daily / Weekly / Monthly Checklist</h2>
        </div>

        <h3 className="text-base font-semibold mt-4 mb-3 text-stockly-dark dark:text-stockly">Daily</h3>
        <ul className="list-disc ml-6 text-sm text-theme-secondary space-y-1 mb-4">
          <li>Complete temperature checks (Checkly tasks)</li>
          <li>Record batch codes and temperatures on all deliveries</li>
          <li>Check for expired batches on the Batches page</li>
          <li>Record any waste against the correct batch</li>
          <li>Raise non-conformances for any food safety issues observed</li>
        </ul>

        <h3 className="text-base font-semibold mt-4 mb-3 text-stockly-dark dark:text-stockly">Weekly</h3>
        <ul className="list-disc ml-6 text-sm text-theme-secondary space-y-1 mb-4">
          <li>Complete the Goods-In Inspection Verification template</li>
          <li>Review open non-conformances &mdash; chase overdue corrective actions</li>
          <li>Check the SALSA Dashboard for any red/amber indicators</li>
        </ul>

        <h3 className="text-base font-semibold mt-4 mb-3 text-stockly-dark dark:text-stockly">Monthly</h3>
        <ul className="list-disc ml-6 text-sm text-theme-secondary space-y-1 mb-4">
          <li>Check supplier document expiry dates (system sends alerts 30 days before)</li>
          <li>Review calibration status for all probes</li>
          <li>Close out any verified non-conformances</li>
          <li>Record dispatch records for all customer deliveries</li>
        </ul>

        <h3 className="text-base font-semibold mt-4 mb-3 text-stockly-dark dark:text-stockly">Quarterly</h3>
        <ul className="list-disc ml-6 text-sm text-theme-secondary space-y-1 mb-4">
          <li>Complete the Internal Food Safety Audit template</li>
        </ul>

        <h3 className="text-base font-semibold mt-4 mb-3 text-stockly-dark dark:text-stockly">Annually</h3>
        <ul className="list-disc ml-6 text-sm text-theme-secondary space-y-1 mb-4">
          <li>Complete the Annual SALSA Food Safety Review template</li>
          <li>Run a Mock Recall Exercise (target: under 4 hours)</li>
          <li>Complete the Food Fraud Vulnerability Assessment</li>
          <li>Complete the HACCP Plan Review</li>
          <li>Complete the Supplier Approval Review</li>
          <li>Recalibrate all temperature probes and upload certificates</li>
        </ul>

        {/* ===== SECTION 13: AUDIT PREP ===== */}
        <div className="guide-page-break" />
        <div className="guide-section-header general">
          <div className="guide-module-label general">Quick Reference</div>
          <h2>13. Preparing for a SALSA Audit</h2>
        </div>

        <p className="mb-3 text-theme-secondary">
          Before your SALSA audit, work through this checklist using the SALSA Dashboard as your central reference point.
        </p>

        <div className="space-y-3 my-4">
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">1</div>
            <div>
              <strong className="block mb-1">Open the SALSA Dashboard</strong>
              <p className="text-sm text-theme-secondary">Check all 7 cards are green. Address any amber or red items before the audit.</p>
            </div>
          </div>
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">2</div>
            <div>
              <strong className="block mb-1">Suppliers: All approved with current documents</strong>
              <p className="text-sm text-theme-secondary">Print the Approved Supplier List. Ensure no documents are expired and all risk ratings are up to date.</p>
            </div>
          </div>
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">3</div>
            <div>
              <strong className="block mb-1">Batches: No expired or quarantined stock</strong>
              <p className="text-sm text-theme-secondary">Clear any expired batches. Investigate and resolve any quarantined stock.</p>
            </div>
          </div>
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">4</div>
            <div>
              <strong className="block mb-1">Calibrations: All probes current</strong>
              <p className="text-sm text-theme-secondary">Ensure all temperature probes have valid calibration certificates. Recalibrate any that are overdue.</p>
            </div>
          </div>
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">5</div>
            <div>
              <strong className="block mb-1">Non-conformances: All closed out</strong>
              <p className="text-sm text-theme-secondary">Close any open NCs. The auditor will check that corrective actions were completed and verified.</p>
            </div>
          </div>
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">6</div>
            <div>
              <strong className="block mb-1">Mock recall: Completed within 12 months</strong>
              <p className="text-sm text-theme-secondary">If your last mock recall was more than 12 months ago, run one before the audit.</p>
            </div>
          </div>
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">7</div>
            <div>
              <strong className="block mb-1">Compliance templates: All completed</strong>
              <p className="text-sm text-theme-secondary">Ensure all SALSA compliance tasks are completed for the current period. The auditor will want to see signed-off records.</p>
            </div>
          </div>
          <div className="guide-step stockly bg-theme-muted/20">
            <div className="guide-step-number stockly">8</div>
            <div>
              <strong className="block mb-1">Print the SALSA Dashboard</strong>
              <p className="text-sm text-theme-secondary">Click <strong>Print</strong> on the SALSA Dashboard for a clean summary to show the auditor.</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-200 mb-4">
          <strong className="block mb-1">Tip: The Auditor Will Ask You to Demonstrate a Trace</strong>
          Be ready to pick a batch code and show a forward and backward trace. Practice this before the audit using the Traceability page &mdash; the system does the heavy lifting for you.
        </div>

        {/* End */}
        <div className="mt-12 pt-6 border-t border-theme text-center text-sm text-theme-tertiary">
          <p>SALSA Compliance Guide &mdash; Opsly Stockly Module</p>
          <p className="mt-1">For support, contact your system administrator or visit the Help Centre.</p>
        </div>
      </div>
    </>
  )
}
