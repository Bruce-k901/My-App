"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Breakdown = {
  id: string;
  site_name: string;
  asset_name: string;
  issue: string;
  priority: string;
  reported_at: string;
  status: string;
};

export default function EmergencyBreakdowns() {
  const [data, setData] = useState<Breakdown[]>([]);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function fetchBreakdowns() {
      const { data, error } = await supabase
        .from("breakdowns")
        .select("id, site_name, asset_name, issue, priority, reported_at, status")
        .eq("status", "open")
        .order("reported_at", { ascending: false });
      if (!error && data) setData(data);
    }
    fetchBreakdowns();
  }, []);

  if (!data.length)
    return (
      <div className="bg-[#0b0d13]/80 border border-white/[0.06] rounded-2xl p-5 shadow-[0_0_12px_rgba(236,72,153,0.05)] text-white/70 flex items-center justify-center">
        <p>No active breakdowns. All systems operational.</p>
      </div>
    );

  return (
    <div className="rounded-2xl bg-red-950/30 border border-red-500/40 p-5 shadow-[0_0_12px_rgba(236,72,153,0.05)]">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-red-400" />
        <h2 className="text-lg font-semibold text-red-400">Emergency Breakdowns</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-white/90">
          <thead className="border-b border-white/[0.1] text-white/60">
            <tr>
              <th className="text-left py-2">Site</th>
              <th className="text-left py-2">Asset</th>
              <th className="text-left py-2">Issue</th>
              <th className="text-left py-2">Priority</th>
              <th className="text-left py-2">Reported</th>
            </tr>
          </thead>
          <tbody>
            {data.map((b) => (
              <tr key={b.id} className="border-b border-white/[0.05] hover:bg-white/[0.05] transition-colors">
                <td className="py-2">{b.site_name}</td>
                <td className="py-2">{b.asset_name}</td>
                <td className="py-2">{b.issue}</td>
                <td className="py-2">
                  <span
                    className={`inline-block w-2 h-2 rounded-full mr-2 ${
                      b.priority === "high"
                        ? "bg-red-500"
                        : b.priority === "medium"
                        ? "bg-amber-400"
                        : "bg-green-400"
                    }`}
                  />
                  {b.priority}
                </td>
                <td className="py-2 text-white/60">
                  {formatDistanceToNow(new Date(b.reported_at), { addSuffix: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}