"use client";
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";

export type Filters = {
  site_id: string | null;
  creator?: string | null;
  status?: string | null; // open | completed
  frequency?: string | null; // daily | weekly | monthly
};

export default function FiltersSidebar({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  const { companyId, siteId } = useAppContext();
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const loadSites = async () => {
      if (!companyId) return;
      const { data } = await supabase.from("sites").select("id,name").eq("company_id", companyId).order("name");
      setSites((data || []) as any);
    };
    loadSites();
  }, [companyId]);

  const pickSite = (id: string | null) => onChange({ ...filters, site_id: id });
  const setStatus = (v: string | null) => onChange({ ...filters, status: v });
  const setFreq = (v: string | null) => onChange({ ...filters, frequency: v });

  const freqOpts = useMemo(() => ["daily", "weekly", "monthly"], []);

  return (
    <div className="space-y-6">
      {/* Active Site */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
        <p className="uppercase text-xs tracking-widest text-slate-400 mb-2">Site</p>
        <div className="flex flex-wrap gap-2">
          {sites.map((s) => (
            <button
              key={s.id}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${filters.site_id === s.id ? "bg-white/10 border-white/20" : "border-white/10 hover:bg-white/5"}`}
              onClick={() => pickSite(s.id)}
            >
              {s.name}
            </button>
          ))}
          {!sites.length && (
            <button className="px-3 py-1.5 rounded-full text-sm border border-white/10 opacity-70" onClick={() => pickSite(siteId || null)}>
              Use Active Site
            </button>
          )}
          {filters.site_id && (
            <button className="px-3 py-1.5 rounded-full text-xs border border-white/10 ml-2" onClick={() => pickSite(null)}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
        <p className="uppercase text-xs tracking-widest text-slate-400 mb-2">Status</p>
        <div className="flex flex-wrap gap-2">
          {["open", "completed"].map((s) => (
            <button
              key={s}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${filters.status === s ? "bg-blue-500/20 border-blue-500/30" : "border-white/10 hover:bg-white/5"}`}
              onClick={() => setStatus(filters.status === s ? null : s)}
            >
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
          {filters.status && (
            <button className="px-3 py-1.5 rounded-full text-xs border border-white/10 ml-2" onClick={() => setStatus(null)}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Frequency */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
        <p className="uppercase text-xs tracking-widest text-slate-400 mb-2">Frequency</p>
        <div className="flex flex-wrap gap-2">
          {freqOpts.map((f) => (
            <button
              key={f}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${filters.frequency === f ? "bg-magenta-500/20 border-magenta-500/30" : "border-white/10 hover:bg-white/5"}`}
              onClick={() => setFreq(filters.frequency === f ? null : f)}
            >
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
          {filters.frequency && (
            <button className="px-3 py-1.5 rounded-full text-xs border border-white/10 ml-2" onClick={() => setFreq(null)}>
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}