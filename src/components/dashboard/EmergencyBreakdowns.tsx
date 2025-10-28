"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Breakdown {
  id: string;
  name: string;
  notes?: string;
  status: string;
  created_at: string;
  sites?: { name: string };
  assets?: { name: string };
}

export default function EmergencyBreakdowns() {
  const [data, setData] = useState<Breakdown[]>([]);
  // Remove: const supabase = createClientComponentClient();

  useEffect(() => {
    async function fetchBreakdowns() {
      try {
        const { data, error } = await supabase
          .from("assets")
          .select(`
            id,
            name,
            notes,
            status,
            created_at,
            sites(name)
          `)
          .eq("status", "maintenance")
          .eq("archived", false)
          .order("created_at", { ascending: false });
          
        if (error) {
          console.error("Error fetching breakdowns:", error);
          setData([]);
          return;
        }
        
        const formattedData = (data || []).map(item => ({
          ...item,
          sites: item.sites || { name: 'Unknown Site' },
          assets: { name: item.name || 'Unknown Asset' }
        }));
        setData(formattedData);
      } catch (err) {
        console.error("Failed to fetch breakdowns:", err);
        setData([]);
      }
    }
    fetchBreakdowns();
  }, []);

  if (!data.length)
    return (
      <div className="bg-[#0b0d13]/80 border border-white/[0.06] rounded-2xl p-5 shadow-[0_0_12px_rgba(236,72,153,0.05)] text-white/70 flex items-center justify-center">
        <p>No pending maintenance tasks. All systems operational.</p>
      </div>
    );

  return (
    <div className="rounded-2xl bg-red-950/30 border border-red-500/40 p-5 shadow-[0_0_12px_rgba(236,72,153,0.05)]">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-red-400" />
        <h2 className="text-lg font-semibold text-red-400">Pending Maintenance</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-white/90">
          <thead className="border-b border-white/[0.1] text-white/60">
            <tr>
              <th className="text-left py-2">Site</th>
              <th className="text-left py-2">Asset</th>
              <th className="text-left py-2">Task</th>
              <th className="text-left py-2">Notes</th>
              <th className="text-left py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {data.map((b) => (
              <tr key={b.id} className="border-b border-white/[0.05] hover:bg-white/[0.05] transition-colors">
                <td className="py-2">{b.sites?.name || "—"}</td>
                <td className="py-2">{b.assets?.name || "—"}</td>
                <td className="py-2">{b.name}</td>
                <td className="py-2 text-white/60">{b.notes || "—"}</td>
                <td className="py-2 text-white/60">
                  {formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}