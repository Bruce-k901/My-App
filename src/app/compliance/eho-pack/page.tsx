"use client";

import { useEffect, useMemo, useState } from "react";
import { AppProvider, useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { FileText, Download, Loader2, CheckCircle2, AlertCircle, Calendar, Building2 } from "lucide-react";
import Link from "next/link";

type Include = { tasks: boolean; temperature: boolean; maintenance: boolean; incidents: boolean };
type ExportFormat = "pdf" | "json";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function EHOForm({ 
  onChange, 
  onFormatChange 
}: { 
  onChange: (v: { siteId: string; start: string; end: string; include: Include }) => void;
  onFormatChange: (format: ExportFormat) => void;
}) {
  const { role, companyId, siteId } = useAppContext();
  const { isRoleGuardEnabled } = require("@/lib/featureFlags");
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>(siteId || "");
  const [start, setStart] = useState<string>(daysAgo(30));
  const [end, setEnd] = useState<string>(new Date().toISOString().split("T")[0]);
  const [include, setInclude] = useState<Include>({ tasks: true, temperature: true, maintenance: true, incidents: true });
  const [format, setFormat] = useState<ExportFormat>("pdf");

  useEffect(() => {
    const loadSites = async () => {
      if (!companyId) return;
      const { data } = await supabase.from("sites").select("id,name").eq("company_id", companyId).order("name");
      const list = (data || []) as { id: string; name: string }[];
      if (isRoleGuardEnabled()) {
        if (role === "Staff" && siteId) {
          setSites(list.filter((s) => s.id === siteId));
          setSelectedSite(siteId);
          setStart(daysAgo(7));
        } else if (role === "Manager" && siteId) {
          setSites(list.filter((s) => s.id === siteId));
          setSelectedSite(siteId);
        } else {
          setSites(list);
          setSelectedSite(siteId || list[0]?.id || "");
        }
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

  useEffect(() => {
    onFormatChange(format);
  }, [format, onFormatChange]);

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">Export Configuration</h2>
        <p className="text-xs sm:text-sm text-white/60">Select site, date range, and data to include in the EHO Compliance Pack</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-white/80 mb-2">Site</label>
          <select 
            value={selectedSite} 
            onChange={(e) => setSelectedSite(e.target.value)} 
            className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            <option value="">Select site…</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Start Date</label>
          <input 
            type="date" 
            value={start} 
            onChange={(e) => setStart(e.target.value)} 
            className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">End Date</label>
          <input 
            type="date" 
            value={end} 
            onChange={(e) => setEnd(e.target.value)} 
            className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-white/80 mb-2">Export Format</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="format" 
                value="pdf" 
                checked={format === "pdf"}
                onChange={(e) => setFormat(e.target.value as ExportFormat)}
                className="w-4 h-4 text-pink-500"
              />
              <span className="text-white">PDF Document</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="format" 
                value="json" 
                checked={format === "json"}
                onChange={(e) => setFormat(e.target.value as ExportFormat)}
                className="w-4 h-4 text-pink-500"
              />
              <span className="text-white">JSON Data</span>
            </label>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-white/80 mb-2">Include Data</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={include.tasks} 
                onChange={(e) => setInclude((i) => ({ ...i, tasks: e.target.checked }))}
                className="w-4 h-4 text-pink-500 rounded"
              />
              <span className="text-white">Tasks & Checklists</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={include.temperature}
                onChange={(e) => setInclude((i) => ({ ...i, temperature: e.target.checked }))}
                className="w-4 h-4 text-pink-500 rounded"
              />
              <span className="text-white">Temperature Logs</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={include.maintenance}
                onChange={(e) => setInclude((i) => ({ ...i, maintenance: e.target.checked }))}
                className="w-4 h-4 text-pink-500 rounded"
              />
              <span className="text-white">Maintenance</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={include.incidents}
                onChange={(e) => setInclude((i) => ({ ...i, incidents: e.target.checked }))}
                className="w-4 h-4 text-pink-500 rounded"
              />
              <span className="text-white">Incidents</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function EHOReportPreview({ siteId, start, end, include }: { siteId: string; start: string; end: string; include: Include }) {
  const [summary, setSummary] = useState<{ 
    tasks: number; 
    temperature: number; 
    maintenance: number; 
    incidents: number;
    evidence: number;
  }>({
    tasks: 0,
    temperature: 0,
    maintenance: 0,
    incidents: 0,
    evidence: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!siteId) return;
      setLoading(true);
      const startISO = new Date(start).toISOString();
      const endISO = new Date(end + "T23:59:59.999Z").toISOString();
      
      const [t, temp, m, inc] = await Promise.all([
        include.tasks
          ? supabase
              .from("checklist_tasks")
              .select("id, task_completion_records(evidence_attachments)")
              .eq("site_id", siteId)
              .in("status", ["completed"])
              .gte("completed_at", startISO)
              .lte("completed_at", endISO)
          : Promise.resolve({ data: [] }),
        include.temperature
          ? supabase
              .from("temperature_logs")
              .select("id")
              .eq("site_id", siteId)
              .gte("recorded_at", startISO)
              .lte("recorded_at", endISO)
          : Promise.resolve({ data: [] }),
        include.maintenance
          ? supabase
              .from("maintenance_logs")
              .select("id")
              .eq("site_id", siteId)
              .gte("performed_at", startISO)
              .lte("performed_at", endISO)
          : Promise.resolve({ data: [] }),
        include.incidents
          ? supabase
              .from("incidents")
              .select("id")
              .eq("site_id", siteId)
              .gte("reported_date", start)
              .lte("reported_date", end)
          : Promise.resolve({ data: [] }),
      ]);

      const tasksData = (t.data || []) as any[];
      const evidenceCount = tasksData.reduce((sum, task) => {
        const records = task.task_completion_records || [];
        return sum + records.reduce((s: number, r: any) => s + (r.evidence_attachments?.length || 0), 0);
      }, 0);

      setSummary({
        tasks: tasksData.length,
        temperature: temp.data?.length || 0,
        maintenance: m.data?.length || 0,
        incidents: inc.data?.length || 0,
        evidence: evidenceCount,
      });
      setLoading(false);
    };
    load();
  }, [siteId, start, end, include]);

  if (loading) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-pink-400 animate-spin mr-3" />
          <span className="text-white/60">Loading preview...</span>
        </div>
      </div>
    );
  }

  const stats = [
    { label: "Completed Tasks", value: summary.tasks, icon: CheckCircle2 },
    { label: "Temperature Logs", value: summary.temperature, icon: Calendar },
    { label: "Maintenance Logs", value: summary.maintenance, icon: Building2 },
    { label: "Incidents", value: summary.incidents, icon: AlertCircle },
    { label: "Evidence Files", value: summary.evidence, icon: FileText },
  ];

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 sm:p-4 md:p-6">
      <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Export Preview</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white/[0.05] border border-white/[0.1] rounded-lg p-2 sm:p-3 md:p-4 text-center">
              <Icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-pink-400 mx-auto mb-1 sm:mb-2" />
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-[10px] sm:text-xs text-white/60 mt-1">{stat.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EHOHistory({ companyId, siteId }: { companyId: string; siteId: string }) {
  const [files, setFiles] = useState<{ name: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!companyId || !siteId) return;
      setLoading(true);
      const { data } = await supabase.storage.from("reports").list(`${companyId}/${siteId}/`);
      setFiles((data || []).map((f: any) => ({ name: f.name, created_at: f.created_at })).sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
      setLoading(false);
    };
    load();
  }, [companyId, siteId]);

  const downloadUrl = (name: string) => {
    const { data } = supabase.storage.from("reports").getPublicUrl(`${companyId}/${siteId}/${name}`);
    return data.publicUrl;
  };

  if (loading) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 text-pink-400 animate-spin mr-2" />
          <span className="text-white/60 text-sm">Loading history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 sm:p-4 md:p-6">
      <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Past Exports</h3>
      {files.length === 0 ? (
        <p className="text-white/60 text-sm">No previous EHO packs found.</p>
      ) : (
        <div className="space-y-2">
          {files.slice(0, 10).map((f) => (
            <div key={f.name} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 bg-white/[0.05] border border-white/[0.1] rounded-lg p-2 sm:p-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs sm:text-sm text-white truncate">{f.name}</div>
                <div className="text-[10px] sm:text-xs text-white/60 mt-1">
                  {new Date(f.created_at).toLocaleString()}
                </div>
              </div>
              <a
                href={downloadUrl(f.name)}
                target="_blank"
                rel="noreferrer"
                className="sm:ml-4 px-3 sm:px-4 py-1.5 sm:py-2 bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] text-xs sm:text-sm rounded-lg transition-all duration-200 flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                Download
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EHOGenerateButton({ 
  payload, 
  format 
}: { 
  payload: { company_id: string; site_id: string; start_date: string; end_date: string; include: Include } | null;
  format: ExportFormat;
}) {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onGenerate = async () => {
    setError(null);
    setUrl(null);
    if (!payload) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("generate_eho_pack", { 
        body: { ...payload, format } 
      });
      
      if (error) {
        setError(error.message);
      } else {
        setUrl((data as any)?.url || null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate export");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 sm:p-4 md:p-6">
      <button
        disabled={!payload || loading}
        onClick={onGenerate}
        className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] disabled:opacity-40 disabled:cursor-not-allowed disabled:border-white/20 disabled:text-white/40 text-sm sm:text-base font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Generating {format.toUpperCase()}...</span>
          </>
        ) : (
          <>
            <FileText className="w-5 h-5" />
            <span>Generate EHO Pack ({format.toUpperCase()})</span>
          </>
        )}
      </button>
      
      {error && (
        <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-red-500/10 border border-red-500/40 rounded-lg">
          <p className="text-xs sm:text-sm text-red-400">Error: {error}</p>
        </div>
      )}
      
      {url && (
        <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-green-500/10 border border-green-500/40 rounded-lg">
          <p className="text-xs sm:text-sm text-green-400 mb-2 sm:mb-3">✅ EHO Pack ready — click to download.</p>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] text-xs sm:text-sm rounded-lg transition-all duration-200 w-full sm:w-auto justify-center"
          >
            <Download className="w-3 h-3 sm:w-4 sm:h-4" />
            Download {format.toUpperCase()}
          </a>
        </div>
      )}
    </div>
  );
}

function EHOPackInner() {
  const { companyId } = useAppContext();
  const [payload, setPayload] = useState<{ siteId: string; start: string; end: string; include: Include } | null>(null);
  const [format, setFormat] = useState<ExportFormat>("pdf");

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
    <div className="flex flex-col w-full items-center">
      <div className="w-full max-w-[1280px] px-3 sm:px-4 md:px-6 lg:px-8 flex flex-col gap-4 sm:gap-5 md:gap-6 text-white py-4 sm:py-6 md:py-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">EHO Compliance Pack</h1>
          <p className="text-sm sm:text-base text-white/60">
            Generate comprehensive compliance reports for Environmental Health Officer inspections
          </p>
        </div>

        <EHOForm onChange={(v) => setPayload(v)} onFormatChange={setFormat} />
        
        {payload?.siteId && (
          <>
            <EHOReportPreview 
              siteId={payload.siteId} 
              start={payload.start} 
              end={payload.end}
              include={payload.include}
            />
            <EHOGenerateButton payload={invokePayload} format={format} />
            {companyId && <EHOHistory companyId={companyId} siteId={payload.siteId} />}
          </>
        )}
      </div>
    </div>
  );
}

export default function EHOPackPage() {
  return (
    <AppProvider>
      <EHOPackInner />
    </AppProvider>
  );
}
