"use client";

import { useEffect, useMemo, useState } from "react";
import { AppProvider, useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";

type Asset = { 
  id: string; 
  name: string; 
  type?: string;
  working_temp_min?: number | null;
  working_temp_max?: number | null;
};
type TempLog = {
  id: string;
  asset_id: string;
  reading: number;
  unit: string;
  recorded_at: string;
  day_part?: string | null;
  status: "ok" | "warning" | "failed";
  notes?: string | null;
};

function getCurrentDayPart(): string {
  const now = new Date();
  const hour = now.getHours();
  if (hour < 11) return "Morning";
  if (hour < 16) return "Lunch";
  if (hour < 21) return "Dinner";
  return "Late";
}

function StatusBadge({ status }: { status: TempLog["status"] }) {
  const color = status === "ok" ? "#16a34a" : status === "warning" ? "#f59e0b" : "#ef4444";
  const label = status === "ok" ? "OK" : status === "warning" ? "Warning" : "Failed";
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "2px 8px",
      borderRadius: 9999,
      background: `${color}22`,
      color,
      fontSize: 12,
      fontWeight: 600,
    }}>
      {status === "ok" ? "✅" : status === "warning" ? "⚠️" : "❌"} {label}
    </span>
  );
}

function LineChart({ points }: { points: { x: number; y: number }[] }) {
  const width = 300;
  const height = 100;
  if (!points.length) return null;
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const nx = (x: number) => ((x - minX) / (maxX - minX || 1)) * (width - 20) + 10;
  const ny = (y: number) => height - (((y - minY) / (maxY - minY || 1)) * (height - 20) + 10);
  const d = points
    .sort((a, b) => a.x - b.x)
    .map((p, i) => `${i === 0 ? "M" : "L"}${nx(p.x)},${ny(p.y)}`)
    .join(" ");
  return (
    <svg width={width} height={height} style={{ background: "#f8fafc", borderRadius: 8 }}>
      <path d={d} fill="none" stroke="#2563eb" strokeWidth={2} />
    </svg>
  );
}

function TemperatureLogsInner() {
  const { userId, companyId, siteId } = useAppContext();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetId, setAssetId] = useState<string>("");
  const [reading, setReading] = useState<string>("");
  const [unit, setUnit] = useState<string>("°C");
  const [notes, setNotes] = useState<string>("");
  const [dayPart, setDayPart] = useState<string>(getCurrentDayPart());
  const [logs, setLogs] = useState<TempLog[]>([]);
  const [filterAsset, setFilterAsset] = useState<string>("");
  const [filterDayPart, setFilterDayPart] = useState<string>("");
  const [showFailedOnly, setShowFailedOnly] = useState<boolean>(false);
  const [exportStart, setExportStart] = useState<string>("");
  const [exportEnd, setExportEnd] = useState<string>("");

  useEffect(() => {
    const loadAssets = async () => {
      if (!siteId) return;
      const { data } = await supabase
        .from("assets")
        .select("id,name,type,working_temp_min,working_temp_max")
        .eq("site_id", siteId)
        .order("name");
      setAssets(data || []);
    };
    loadAssets();
  }, [siteId]);

  useEffect(() => {
    const loadLogs = async () => {
      if (!siteId) return;
      const { data } = await supabase
        .from("temperature_logs")
        .select("id,asset_id,reading,unit,recorded_at,day_part,status,notes")
        .eq("site_id", siteId)
        .order("recorded_at", { ascending: false })
        .limit(200);
      setLogs((data || []) as TempLog[]);
    };
    loadLogs();

    const sub = supabase
      .channel("temperature_logs_rt")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "temperature_logs" },
        (payload: any) => {
          setLogs(prev => [payload.new as TempLog, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "temperature_logs" },
        (payload: any) => {
          setLogs(prev => prev.map(l => (l.id === payload.new.id ? (payload.new as TempLog) : l)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [siteId]);

  const computeStatus = (val: number, asset: { working_temp_min: number | null, working_temp_max: number | null } | null): TempLog["status"] => {
    // If asset has temperature ranges defined, use them
    if (asset && (asset.working_temp_min !== null || asset.working_temp_max !== null)) {
      const min = asset.working_temp_min ?? -Infinity;
      const max = asset.working_temp_max ?? Infinity;
      
      // Define tolerance ranges (2°C outside range = failed, 1°C outside = warning)
      const tolerance = 2;
      const warningTolerance = 1;
      
      if (val > max + tolerance || val < min - tolerance) {
        return "failed";
      }
      if (val > max + warningTolerance || val < min - warningTolerance) {
        return "warning";
      }
      if (val > max || val < min) {
        return "warning";
      }
      return "ok";
    }
    
    // Fallback to hardcoded values for assets without ranges (backward compatibility)
    if (val > 8 || val < -2) return "failed";
    if (val > 5 || val < 0) return "warning";
    return "ok";
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !siteId || !userId) return;
    const val = parseFloat(reading);
    if (isNaN(val) || !assetId) return;
    const { data: asset } = await supabase
      .from("assets")
      .select("name,type,working_temp_min,working_temp_max")
      .eq("id", assetId)
      .single();
    const status = computeStatus(val, asset);
    const { data: inserted, error } = await supabase.from("temperature_logs").insert({
      company_id: companyId,
      site_id: siteId,
      asset_id: assetId,
      recorded_by: userId,
      reading: val,
      unit,
      day_part: dayPart,
      status,
      notes,
    }).select();
    if (!error && status === "failed") {
      await supabase.from("incidents").insert({
        company_id: companyId,
        site_id: siteId,
        reported_by: userId,
        type: "Temperature Alert",
        description: `${asset?.name ?? "Asset"} (${asset?.type ?? ""}) recorded ${val}${unit}`,
        severity: "high",
        status: "open",
      });
    }
    // Clear for next reading
    setReading("");
    setNotes("");
    setUnit("°C");
    setDayPart(getCurrentDayPart());
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(l =>
      (!filterAsset || l.asset_id === filterAsset) &&
      (!filterDayPart || (l.day_part || "") === filterDayPart) &&
      (!showFailedOnly || l.status === "failed")
    );
  }, [logs, filterAsset, filterDayPart, showFailedOnly]);

  const exportCsv = async () => {
    if (!supabase || !siteId) return;
    const from = exportStart ? new Date(exportStart).toISOString() : undefined;
    const to = exportEnd ? new Date(exportEnd).toISOString() : undefined;
    let q = supabase
      .from("temperature_logs")
      .select("recorded_at,reading,unit,status,day_part,notes,asset_id")
      .eq("site_id", siteId)
      .order("recorded_at", { ascending: false });
    if (from) q = q.gte("recorded_at", from);
    if (to) q = q.lte("recorded_at", to);
    const { data } = await q;
    const assetMap = new Map<string, string>();
    for (const a of assets) assetMap.set(a.id, a.name);
    const rows = [
      ["recorded_at", "asset", "reading", "unit", "status", "day_part", "notes"].join(","),
      ...(data || []).map(r => [
        r.recorded_at,
        assetMap.get(r.asset_id) || r.asset_id,
        r.reading,
        r.unit,
        r.status,
        r.day_part || "",
        (r.notes || "").replace(/\n/g, " ").replace(/,/g, ";"),
      ].join(","))
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `temperature_logs_${exportStart || "start"}_${exportEnd || "end"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Temperature Logs</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <div style={{ gridColumn: "1 / span 2" }}>
          <label>Asset</label>
          <select value={assetId} onChange={e => setAssetId(e.target.value)} style={{ width: "100%", padding: 8 }}>
            <option value="">Select asset...</option>
            {assets.map(a => (
              <option key={a.id} value={a.id}>{a.name}{a.type ? ` (${a.type})` : ""}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Reading</label>
          <input type="number" step="0.1" value={reading} onChange={e => setReading(e.target.value)} placeholder="e.g. 4.5" style={{ width: "100%", padding: 8, fontSize: 24 }} />
        </div>
        <div>
          <label>Unit</label>
          <select value={unit} onChange={e => setUnit(e.target.value)} style={{ width: "100%", padding: 8 }}>
            <option>°C</option>
            <option>°F</option>
          </select>
        </div>
        <div style={{ gridColumn: "1 / span 2" }}>
          <label>Notes (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ width: "100%", padding: 8 }} />
        </div>
        <div>
          <label>Day Part</label>
          <input type="text" value={dayPart} onChange={e => setDayPart(e.target.value)} style={{ width: "100%", padding: 8 }} />
        </div>
        <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
          <button type="submit" style={{ padding: "10px 16px", background: "#111827", color: "white", borderRadius: 6 }}>Save Reading</button>
          <button type="button" onClick={() => { setReading(""); setNotes(""); setDayPart(getCurrentDayPart()); }} style={{ padding: "10px 16px", background: "#6b7280", color: "white", borderRadius: 6 }}>Clear</button>
        </div>
      </form>

      <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label>Filter by asset</label>
          <select value={filterAsset} onChange={e => setFilterAsset(e.target.value)} style={{ width: "100%", padding: 8 }}>
            <option value="">All assets</option>
            {assets.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Filter by day part</label>
          <select value={filterDayPart} onChange={e => setFilterDayPart(e.target.value)} style={{ width: "100%", padding: 8 }}>
            <option value="">All</option>
            {Array.from(new Set(logs.map(l => l.day_part).filter(Boolean)))
              .map((dp) => <option key={dp as string} value={dp as string}>{dp as string}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input id="failedOnly" type="checkbox" checked={showFailedOnly} onChange={e => setShowFailedOnly(e.target.checked)} />
          <label htmlFor="failedOnly">Show failed only</label>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Recent Readings</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8 }}>Time</th>
                <th style={{ textAlign: "left", padding: 8 }}>Asset</th>
                <th style={{ textAlign: "left", padding: 8 }}>Reading</th>
                <th style={{ textAlign: "left", padding: 8 }}>Status</th>
                <th style={{ textAlign: "left", padding: 8 }}>Day Part</th>
                <th style={{ textAlign: "left", padding: 8 }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(l => {
                const asset = assets.find(a => a.id === l.asset_id);
                return (
                  <tr key={l.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                    <td style={{ padding: 8 }}>{new Date(l.recorded_at).toLocaleString()}</td>
                    <td style={{ padding: 8 }}>{asset ? asset.name : l.asset_id}</td>
                    <td style={{ padding: 8 }}>{l.reading}{l.unit}</td>
                    <td style={{ padding: 8 }}><StatusBadge status={l.status} /></td>
                    <td style={{ padding: 8 }}>{l.day_part || ""}</td>
                    <td style={{ padding: 8 }}>{l.notes || ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Manager Tools</h2>
        <div style={{ display: "flex", gap: 12, alignItems: "end" }}>
          <div>
            <label>Start</label>
            <input type="date" value={exportStart} onChange={e => setExportStart(e.target.value)} />
          </div>
          <div>
            <label>End</label>
            <input type="date" value={exportEnd} onChange={e => setExportEnd(e.target.value)} />
          </div>
          <button type="button" onClick={exportCsv} style={{ padding: "8px 12px", background: "#2563eb", color: "white", borderRadius: 6 }}>Export CSV</button>
        </div>

        <div style={{ marginTop: 12 }}>
          <LineChart points={filteredLogs
            .slice(0, 50)
            .map((l, idx) => ({ x: filteredLogs.length - idx, y: l.reading }))} />
        </div>
      </div>
    </div>
  );
}

export default function TemperatureLogsPage() {
  return (
    <AppProvider>
      <TemperatureLogsInner />
    </AppProvider>
  );
}