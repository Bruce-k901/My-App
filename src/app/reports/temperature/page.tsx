"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AppContextProvider, useAppContext } from "@/context/AppContext";

type ComplianceRow = { site_id: string; site_name: string; ok: number; total: number; rate: number };

function TemperatureComplianceInner() {
  const { companyId } = useAppContext();
  const [rows, setRows] = useState<ComplianceRow[]>([]);
  const [days, setDays] = useState<number>(7);

  useEffect(() => {
    const load = async () => {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      let q = supabase
        .from("temperature_logs")
        .select("site_id,status,recorded_at")
        .gte("recorded_at", since);
      if (companyId) q = q.eq("company_id", companyId);
      const { data } = await q;

      const map = new Map<string, { ok: number; total: number }>();
      for (const r of data || []) {
        const sid = (r as any).site_id as string;
        const status = (r as any).status as string;
        const prev = map.get(sid) || { ok: 0, total: 0 };
        prev.total += 1;
        if (status === "ok") prev.ok += 1;
        map.set(sid, prev);
      }
      const siteIds = Array.from(map.keys());
      const { data: sites } = await supabase.from("sites").select("id,name").in("id", siteIds);
      const nameMap = new Map<string, string>();
      for (const s of sites || []) nameMap.set((s as any).id, (s as any).name);
      const arr: ComplianceRow[] = [];
      for (const [sid, v] of map.entries()) {
        const rate = v.total > 0 ? Math.round((v.ok / v.total) * 1000) / 10 : 0;
        arr.push({ site_id: sid, site_name: nameMap.get(sid) || sid, ok: v.ok, total: v.total, rate });
      }
      arr.sort((a, b) => b.rate - a.rate);
      setRows(arr);
    };
    load();
  }, [companyId, days]);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Temperature Compliance</h1>
      <div style={{ marginTop: 12 }}>
        <label>Window (days): </label>
        <input type="number" min={1} max={30} value={days} onChange={e => setDays(parseInt(e.target.value || "7"))} />
      </div>
      <div style={{ marginTop: 16, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 8 }}>Site</th>
              <th style={{ textAlign: "left", padding: 8 }}>OK</th>
              <th style={{ textAlign: "left", padding: 8 }}>Total</th>
              <th style={{ textAlign: "left", padding: 8 }}>Compliance %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.site_id} style={{ borderTop: "1px solid #e5e7eb" }}>
                <td style={{ padding: 8 }}>{r.site_name}</td>
                <td style={{ padding: 8 }}>{r.ok}</td>
                <td style={{ padding: 8 }}>{r.total}</td>
                <td style={{ padding: 8 }}>{r.rate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TemperatureCompliancePage() {
  return (
    <AppContextProvider>
      <TemperatureComplianceInner />
    </AppContextProvider>
  );
}