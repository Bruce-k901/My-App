"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";
import SiteFormNew from "@/components/sites/SiteFormNew";
import { useToast } from "@/components/ui/ToastProvider";

type Site = Record<string, any>;

export default function SiteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const idParam = (params?.id ?? "") as string;
  const { profile } = useAppContext();
  const { showToast } = useToast();

  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!idParam) return;
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from("sites")
          .select("*")
          .eq("id", idParam)
          .maybeSingle();
        if (error) throw error;
        setSite((data as any) || null);
      } catch (e: any) {
        setError(e?.message || "Failed to load site");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [idParam]);

  const handleDelete = async () => {
    if (!site?.id) return;
    if (!confirm("Delete this site?")) return;
    const { error } = await supabase.from("sites").delete().eq("id", site.id);
    if (error) {
      showToast({ title: "Delete failed", description: error.message || "Unable to delete", type: "error" });
    } else {
      // Update subscription site count after deletion
      if (profile?.company_id) {
        try {
          const { updateSubscriptionSiteCount } = await import("@/lib/subscriptions");
          await updateSubscriptionSiteCount(profile.company_id);
        } catch (err) {
          console.error("Failed to update subscription site count:", err);
          // Don't fail the delete if this fails
        }
      }
      showToast({ title: "Site deleted", type: "success" });
      router.replace("/dashboard/sites");
    }
  };

  const handleSaved = async () => {
    setFormOpen(false);
    try {
      const { data } = await supabase
        .from("sites")
        .select("*")
        .eq("id", idParam)
        .maybeSingle();
      setSite((data as any) || null);
      showToast({ title: "Site updated", type: "success" });
    } catch {}
  };

  return (
    <div className="px-6 py-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Site Details</h1>
          <Link href="/dashboard/sites" className="px-3 py-1.5 rounded bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.12] text-sm">Back to Sites</Link>
        </div>

        {loading && <div className="text-slate-400">Loading site…</div>}
        {error && (
          <div className="mb-4 rounded-xl bg-white/[0.06] border border-white/[0.1] px-4 py-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {site && (
          <div className="rounded-xl border border-white/[0.1] bg-white/[0.04] p-4">
            <div className="mb-4">
              <div className="text-white font-semibold text-lg">{site.name || site.site_name || "Untitled site"}</div>
              <div className="text-slate-400 text-sm">{site.address_line1 || site.address || "No address"}</div>
            </div>

            {/* Simple details list */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.keys(site)
                .filter((k) => !["id", "company_id", "created_at"].includes(k))
                .map((key) => (
                  <div key={key} className="p-2 rounded bg-white/[0.06] border border-white/[0.1]">
                    <div className="text-xs text-slate-400 mb-1">{key.replace(/_/g, " ")}</div>
                    <div className="text-sm text-white/90">{String(site[key] ?? "")}</div>
                  </div>
                ))}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setFormOpen(true)} className="px-4 py-2 rounded-md bg-[#D37E91]/25 border border-[#D37E91]/40 text-[#D37E91] hover:bg-[#D37E91]/35">Edit</button>
              <button onClick={handleDelete} className="px-4 py-2 rounded-md bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30">Delete</button>
            </div>
          </div>
        )}

        {formOpen && (
          <SiteFormNew
              open={formOpen}
              onClose={() => setFormOpen(false)}
              onSaved={handleSaved}
              initial={site || null}
              companyId={profile?.company_id || ""}
            />
        )}
      </div>
    </div>
  );
}