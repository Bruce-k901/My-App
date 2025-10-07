"use client";

import { useEffect, useMemo, useState } from "react";
import { AppContextProvider, useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";

type Include = { tasks: boolean; temperature: boolean; maintenance: boolean; incidents: boolean };

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function EHOForm({ onChange }: { onChange: (v: { siteId: string; start: string; end: string; include: Include }) => void }) {
  const { role, companyId, siteId } = useAppContext();
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>(siteId || "");
  const [start, setStart] = useState<string>(daysAgo(7));
  const [end, setEnd] = useState<string>(new Date().toISOString().split("T")[0]);
  const [include, setInclude] = useState<Include>({ tasks: true, temperature: true, maintenance: true, incidents: true });

  useEffect(() => {
    const loadSites = async () => {
      if (!companyId) return;
      const { data } = await supabase.from("sites").select("id,name").eq("company_id", companyId).order("name");
      const list = (data || []) as { id: string; name: string }[];
      // Scope restrictions
      if (role === "staff" && siteId) {
        setSites(list.filter((s) => s.id === siteId));
        setSelectedSite(siteId);
        setStart(daysAgo(7));
      } else if (role === "manager" && siteId) {
        setSites(list.filter((s) => s.id === siteId));
        setSelectedSite(siteId);
      } else {
        setSites(list);
        setSelectedSite(siteId || list[0]?.id || "");
      }
    };
    loadSites();
  }, [companyId, role, siteId]);

  useEffect(() => {
    if (selectedSite) onChange({ siteId: selectedSite, start, end, include });
  }, [selectedSite, start, end, include, onChange]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <div style={{ gridColumn: "1 / span 2" }}>
        <label>Site</label>
        <select value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)} style={{ width: "100%", padding: 8 }}>
          <option value="">Select site…</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Start</label>
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} style={{ width: "100%", padding: 8 }} />
      </div>
      <div>
        <label>End</label>
        <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} style={{ width: "100%", padding: 8 }} />
      </div>
      <div style={{ gridColumn: "1 / span 2", display: "flex", gap: 12, alignItems: "center" }}>
        <label>
          <input type="checkbox" checked={include.tasks} onChange={(e) => setInclude((i) => ({ ...i, tasks: e.target.checked }))} /> Tasks
        </label>
        <label>
          <input
            type="checkbox"
            checked={include.temperature}
            onChange={(e) => setInclude((i) => ({ ...i, temperature: e.target.checked }))}
          />
          Temperature
        </label>
        <label>
          <input
            type="checkbox"
            checked={include.maintenance}
            onChange={(e) => setInclude((i) => ({ ...i, maintenance: e.target.checked }))}
          />
          Maintenance
        </label>
        <label>
          <input
            type="checkbox"
            checked={include.incidents}
            onChange={(e) => setInclude((i) => ({ ...i, incidents: e.target.checked }))}
          />
          Incidents
        </label>
      </div>
    </div>
  );
}

function EHOReportPreview({ siteId, start, end }: { siteId: string; start: string; end: string }) {
  const [summary, setSummary] = useState<{ tasks: number; temperature: number; maintenance: number; incidents: number }>({
    tasks: 0,
    temperature: 0,
    maintenance: 0,
    incidents: 0,
  });
  useEffect(() => {
    const load = async () => {
      if (!siteId) return;
      const startISO = new Date(start).toISOString();
      const endISO = new Date(end).toISOString();
      const [t, temp, m, inc] = await Promise.all([
        supabase.from("tasks").select("id").eq("site_id", siteId).gte("completed_at", startISO).lte("completed_at", endISO),
        supabase.from("temperature_logs").select("id").eq("site_id", siteId).gte("recorded_at", startISO).lte("recorded_at", endISO),
        supabase.from("maintenance_logs").select("id").eq("site_id", siteId).gte("performed_at", startISO).lte("performed_at", endISO),
        supabase.from("incidents").select("id").eq("site_id", siteId).gte("created_at", startISO).lte("created_at", endISO),
      ]);
      setSummary({
        tasks: t.data?.length || 0,
        temperature: temp.data?.length || 0,
        maintenance: m.data?.length || 0,
        incidents: inc.data?.length || 0,
      });
    };
    load();
  }, [siteId, start, end]);

  return (
    <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
      {["Tasks", "Temperature", "Maintenance", "Incidents"].map((label, idx) => (
        <div key={label} style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>{label}</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{[summary.tasks, summary.temperature, summary.maintenance, summary.incidents][idx]}</div>
        </div>
      ))}
    </div>
  );
}

function EHOHistory({ companyId, siteId }: { companyId: string; siteId: string }) {
  const [files, setFiles] = useState<{ name: string; created_at: string }[]>([]);
  useEffect(() => {
    const load = async () => {
      if (!companyId || !siteId) return;
      const { data } = await supabase.storage.from("reports").list(`${companyId}/${siteId}/`);
      setFiles((data || []).map((f: any) => ({ name: f.name, created_at: f.created_at })));
    };
    load();
  }, [companyId, siteId]);

  const downloadUrl = (name: string) => {
    const { data } = supabase.storage.from("reports").getPublicUrl(`${companyId}/${siteId}/${name}`);
    return data.publicUrl;
  };

  return (
    <div style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700 }}>Past Exports</h2>
      {files.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No previous EHO packs found.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 8 }}>Filename</th>
              <th style={{ textAlign: "left", padding: 8 }}>Created</th>
              <th style={{ textAlign: "left", padding: 8 }}>Download</th>
            </tr>
          </thead>
          <tbody>
            {files.map((f) => (
              <tr key={f.name} style={{ borderTop: "1px solid #e5e7eb" }}>
                <td style={{ padding: 8 }}>{f.name}</td>
                <td style={{ padding: 8 }}>{new Date(f.created_at).toLocaleString()}</td>
                <td style={{ padding: 8 }}>
                  <a href={downloadUrl(f.name)} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
                    Download
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function EHOGenerateButton({ payload }: { payload: { company_id: string; site_id: string; start_date: string; end_date: string; include: Include } | null }) {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onGenerate = async () => {
    setError(null);
    setUrl(null);
    if (!payload) return;
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("generate_eho_pack", { body: payload });
    setLoading(false);
    if (error) setError(error.message);
    else setUrl((data as any)?.url || null);
  };
  return (
    <div style={{ marginTop: 16 }}>
      <button
        disabled={!payload || loading}
        onClick={onGenerate}
        style={{ padding: "10px 16px", background: "#111827", color: "white", borderRadius: 6 }}
      >
        {loading ? "Compiling logs…" : "Generate EHO Pack"}
      </button>
      {error && <p style={{ color: "#ef4444", marginTop: 8 }}>Error: {error}</p>}
      {url && (
        <div style={{ marginTop: 12 }}>
          <p style={{ color: "#16a34a" }}>EHO Pack ready — click to download.</p>
          <a href={url} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
            Download PDF
          </a>
        </div>
      )}
    </div>
  );
}

function EHOPackInner() {
  const { companyId } = useAppContext();
  const [payload, setPayload] = useState<{ siteId: string; start: string; end: string; include: Include } | null>(null);

  const invokePayload = useMemo(() => {
    if (!payload || !companyId) return null;
    return {
      company_id: companyId,
      site_id: payload.siteId,
      start_date: payload.start,
      end_date: payload.end,
      include: payload.include,
    };
  }, [payload, companyId]);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>EHO Compliance Pack</h1>
      <EHOForm onChange={(v) => setPayload(v)} />
      {payload?.siteId && <EHOReportPreview siteId={payload.siteId} start={payload.start} end={payload.end} />}
      <EHOGenerateButton payload={invokePayload} />
      {payload?.siteId && companyId && <EHOHistory companyId={companyId} siteId={payload.siteId} />}
    </div>
  );
}

export default function EHOPackPage() {
  return (
    <AppContextProvider>
      <EHOPackInner />
    </AppContextProvider>
  );
}