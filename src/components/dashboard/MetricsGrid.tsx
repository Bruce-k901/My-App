"use client";

export default function MetricsGrid() {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* A. Task Performance Summary */}
      <div className="bg-[#0b0d13]/80 border border-white/[0.06] rounded-2xl p-5 shadow-[0_0_12px_rgba(236,72,153,0.05)]">
        <h3 className="text-2xl font-semibold mb-3">Task Performance Summary</h3>
        <div className="text-sm text-slate-300">Completed / Total</div>
        <div className="mt-2 h-3 w-full rounded-full bg-white/10 overflow-hidden">
          <div className="h-3 bg-green-500/70" style={{ width: "65%" }} />
        </div>
        <div className="mt-3 text-sm text-slate-300">Late / Missed / On Time</div>
        <div className="mt-2 h-3 w-full rounded-full bg-white/10 overflow-hidden flex">
          <div className="h-3 bg-red-500/70" style={{ width: "10%" }} />
          <div className="h-3 bg-amber-500/70" style={{ width: "15%" }} />
          <div className="h-3 bg-green-500/70" style={{ width: "75%" }} />
        </div>
        <div className="mt-4 text-xs text-slate-500">7-day completion rate (sparkline)</div>
      </div>

      {/* B. PPM Compliance */}
      <div className="bg-[#0b0d13]/80 border border-white/[0.06] rounded-2xl p-5 shadow-[0_0_12px_rgba(236,72,153,0.05)]">
        <h3 className="text-2xl font-semibold mb-3">PPM Compliance</h3>
        <p className="text-sm text-slate-300">Next 30 days: due vs completed</p>
        <div className="mt-3 w-24 h-24 rounded-full bg-white/10 grid place-items-center">
          <span className="text-slate-400 text-xs">Donut</span>
        </div>
        <p className="mt-3 text-sm text-slate-300">Overdue count: 3</p>
      </div>

      {/* C. Training Coverage */}
      <div className="bg-[#0b0d13]/80 border border-white/[0.06] rounded-2xl p-5 shadow-[0_0_12px_rgba(236,72,153,0.05)]">
        <h3 className="text-2xl font-semibold mb-3">Training Coverage</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: "First Aiders", value: "2 / 3", color: "bg-green-500/60" },
            { label: "Fire Marshals", value: "1 / 2", color: "bg-amber-500/60" },
            { label: "H&S", value: "3 / 5", color: "bg-amber-500/60" },
            { label: "Barista Trainers", value: "0 / 1", color: "bg-red-500/60" },
          ].map((r) => (
            <div key={r.label} className="rounded-lg border border-white/10 p-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">{r.label}</span>
                <span className="text-slate-400">{r.value}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                <div className={`h-2 ${r.color}`} style={{ width: "60%" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* D. Certificate Expiry */}
      <div className="bg-[#0b0d13]/80 border border-white/[0.06] rounded-2xl p-5 shadow-[0_0_12px_rgba(236,72,153,0.05)]">
        <h3 className="text-2xl font-semibold mb-3">Certificate Expiry</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5">
              <tr className="text-left text-slate-400">
                <th className="p-2">Certificate</th>
                <th className="p-2">Site</th>
                <th className="p-2">Expires</th>
              </tr>
            </thead>
            <tbody>
              {[{ c: "Food Hygiene Level 2", s: "Downtown", e: "2025-11-12" }].map((row, i) => (
                <tr key={i} className="border-t border-white/10">
                  <td className="p-2">{row.c}</td>
                  <td className="p-2">{row.s}</td>
                  <td className="p-2">{row.e}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <a href="/certificates" className="inline-block mt-3 text-sm text-magenta-400 hover:text-magenta-300">View All Certificates</a>
      </div>

      {/* E. Site Comparison */}
      <div className="bg-[#0b0d13]/80 border border-white/[0.06] rounded-2xl p-5 shadow-[0_0_12px_rgba(236,72,153,0.05)]">
        <h3 className="text-2xl font-semibold mb-3">Site Comparison</h3>
        <div className="space-y-2 text-sm">
          {[{ name: "Downtown", value: 72 }, { name: "Riverside", value: 85 }].map((s) => (
            <div key={s.name}>
              <div className="flex items-center justify-between text-slate-300">
                <span>{s.name}</span>
                <span>{s.value}%</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-2 bg-blue-500/70" style={{ width: `${s.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* F. SOP Review Status */}
      <div className="bg-[#0b0d13]/80 border border-white/[0.06] rounded-2xl p-5 shadow-[0_0_12px_rgba(236,72,153,0.05)]">
        <h3 className="text-2xl font-semibold mb-3">SOP Review Status</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Due for review", value: 4, color: "bg-amber-500/60" },
            { label: "Updated this month", value: 3, color: "bg-green-500/60" },
            { label: "Overdue", value: 2, color: "bg-red-500/60" },
          ].map((c) => (
            <div key={c.label} className="rounded-lg border border-white/10 p-3">
              <p className="text-slate-300 text-sm">{c.label}</p>
              <p className="text-3xl font-semibold mt-2">{c.value}</p>
              <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                <div className={`h-2 ${c.color}`} style={{ width: "60%" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* G. Alerts Feed */}
      <div className="bg-[#0b0d13]/80 border border-white/[0.06] rounded-2xl p-5 shadow-[0_0_12px_rgba(236,72,153,0.05)]">
        <h3 className="text-2xl font-semibold mb-3">Alerts Feed</h3>
        <p className="text-sm text-slate-400">No alerts to show right now.</p>
      </div>
    </section>
  );
}