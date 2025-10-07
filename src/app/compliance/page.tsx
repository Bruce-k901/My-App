"use client";

import Link from "next/link";

export default function CompliancePage() {
  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Compliance Hub</h1>
      <p className="text-slate-300 mb-6 text-sm">
        Quick access to incidents, temperature reports, and export tools.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/incidents" className="rounded-xl border border-neutral-800 bg-[#141823] p-4 hover:border-magenta-500/40">
          <h2 className="text-lg font-semibold mb-1">Incidents</h2>
          <p className="text-slate-400 text-sm">Track safety and compliance issues.</p>
        </Link>

        <Link href="/logs/temperature" className="rounded-xl border border-neutral-800 bg-[#141823] p-4 hover:border-magenta-500/40">
          <h2 className="text-lg font-semibold mb-1">Temperature Logs</h2>
          <p className="text-slate-400 text-sm">Record and review fridge/freezer readings.</p>
        </Link>

        <Link href="/reports/temperature" className="rounded-xl border border-neutral-800 bg-[#141823] p-4 hover:border-magenta-500/40">
          <h2 className="text-lg font-semibold mb-1">Temperature Compliance</h2>
          <p className="text-slate-400 text-sm">7-day OK/total compliance rate by site.</p>
        </Link>

        <Link href="/compliance/eho-pack" className="rounded-xl border border-neutral-800 bg-[#141823] p-4 hover:border-magenta-500/40">
          <h2 className="text-lg font-semibold mb-1">EHO Pack Generator</h2>
          <p className="text-slate-400 text-sm">Export a PDF pack for any site and period.</p>
        </Link>
      </div>
    </div>
  );
}