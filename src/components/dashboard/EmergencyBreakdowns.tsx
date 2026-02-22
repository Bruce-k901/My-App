"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AlertTriangle } from '@/components/ui/icons';
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
        // Fetch assets without relationship query (fetch sites separately)
        const { data: assetsData, error } = await supabase
          .from("assets")
          .select(`
            id,
            name,
            notes,
            status,
            created_at,
            site_id
          `)
          .eq("status", "maintenance")
          .eq("archived", false)
          .order("created_at", { ascending: false });
          
        if (error) {
          // Check if error is empty
          const errorKeys = Object.keys(error || {});
          const isEmpty = errorKeys.length === 0;
          
          if (isEmpty) {
            console.error("Error fetching breakdowns: Empty error object", {
              query: 'assets.select(...).eq(status, maintenance)',
              companyId: companyId
            });
          } else {
            const errorMessage = error.message || error.code || 'Unknown error';
            const errorDetails = {
              message: error.message || null,
              code: error.code || null,
              details: error.details || null,
              hint: error.hint || null,
              keys: errorKeys
            };
            console.error("Error fetching breakdowns:", errorMessage, errorDetails);
          }
          setData([]);
          return;
        }
        
        // Fetch sites separately to avoid relationship issues
        const siteIds = [...new Set((assetsData || []).map((item: any) => item.site_id).filter(Boolean))];
        let sitesMap = new Map<string, { name: string }>();
        
        if (siteIds.length > 0) {
          const { data: sitesData, error: sitesError } = await supabase
            .from("sites")
            .select("id, name")
            .in("id", siteIds);
          
          if (!sitesError && sitesData) {
            sitesMap = new Map(sitesData.map((s: any) => [s.id, { name: s.name }]));
          }
        }
        
        // Transform data to include site name
        const formattedData = (assetsData || []).map((item: any) => ({
          ...item,
          sites: item.site_id ? (sitesMap.get(item.site_id) || { name: 'Unknown Site' }) : { name: 'Unknown Site' },
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
      <div className="bg-[#0b0d13]/80 border border-white/[0.06] rounded-2xl p-5 shadow-[0_0_12px_rgba(211, 126, 145,0.05)] text-theme-secondary flex items-center justify-center">
        <p>No pending maintenance tasks. All systems operational.</p>
      </div>
    );

  return (
    <div className="rounded-2xl bg-red-950/30 border border-red-500/40 p-5 shadow-[0_0_12px_rgba(211, 126, 145,0.05)]">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-red-400" />
        <h2 className="text-lg font-semibold text-red-400">Pending Maintenance</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-white/90">
          <thead className="border-b border-white/[0.1] text-theme-tertiary">
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
                <td className="py-2 text-theme-tertiary">{b.notes || "—"}</td>
                <td className="py-2 text-theme-tertiary">
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