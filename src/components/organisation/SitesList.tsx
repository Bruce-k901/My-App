"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import SiteToolbar from "@/components/sites/SiteToolbar";

type Site = { id: string; name: string; address?: string | null };

export default function SitesList() {
  const { companyId } = useAppContext();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sites")
        .select("id,name,address")
        .eq("company_id", companyId)
        .order("name");
      if (error) throw error;
      setSites(((data || []) as any) as Site[]);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load sites");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="text-slate-400">Loading sites…</div>;
  if (error) return <div className="text-red-400">{error}</div>;

  return (
    <div>
      {/* Actions */}
      <div className="mb-4">
        <SiteToolbar sites={sites as any[]} companyId={companyId || ""} onRefresh={load} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sites.map((s) => (
          <div key={s.id} className="rounded-xl bg-white/[0.06] border border-white/[0.1] p-4">
            <div className="text-white font-semibold">{s.name}</div>
            <div className="text-slate-400 text-sm">{s.address || "No address"}</div>
            <div className="mt-3">
              <Link
                href={`/dashboard/sites/${s.id}`}
                className="inline-block px-3 py-1.5 rounded bg-white/[0.08] border border-white/[0.12] text-white hover:bg-white/[0.14] text-sm"
              >
                View Site
              </Link>
            </div>
          </div>
        ))}
        {sites.length === 0 && (
          <div className="text-slate-400">No sites found for this company.</div>
        )}
      </div>
    </div>
  );
}