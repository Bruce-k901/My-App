"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui";
import UploadGlobalDocModal from "@/components/modals/UploadGlobalDocModal";
import { useAppContext } from "@/context/AppContext";

type GlobalDoc = {
  id: string;
  category: string;
  name: string;
  version?: string | null;
  expiry_date?: string | null;
  notes?: string | null;
  file_path: string;
  created_at?: string;
};

export default function DocumentsPoliciesSection() {
  const { companyId } = useAppContext();
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState<GlobalDoc[]>([]);
  const [latestDoc, setLatestDoc] = useState<GlobalDoc | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    let query = supabase
      .from("global_documents")
      .select("id,category,name,version,expiry_date,notes,file_path,created_at");
    if (companyId) {
      query = query.eq("company_id", companyId);
    }
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) {
      setError(error.message);
      setDocs([]);
      setLatestDoc(null);
    } else {
      const list = (data || []) as GlobalDoc[];
      setDocs(list);
      setLatestDoc(list[0] || null);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Load (or reload) whenever company context changes
    load();
  }, [companyId]);

  // Live updates: re-fetch when global_documents changes for this company
  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel("global_documents_updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "global_documents", filter: `company_id=eq.${companyId}` },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [companyId]);
  // Fade the highlight after 20 seconds
  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => setHighlightId(null), 20000);
    return () => clearTimeout(timer);
  }, [highlightId]);

  const getPublicUrl = (path: string) => {
    // Paths are stored company-scoped: `${companyId}/folder/filename`
    const { data } = supabase.storage.from("global_docs").getPublicUrl(path);
    return data.publicUrl;
  };

  // Debug: trace docs right before render to confirm data source
  console.log('Docs from Supabase:', docs);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Global Documents</h3>
        <Button onClick={() => setOpen(true)}>Upload Document</Button>
      </div>

      {/* Latest upload card */}
      {!loading && !error && latestDoc && (
        <a
          href={getPublicUrl(latestDoc.file_path)}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl p-4 border border-pink-500/40 bg-white/[0.06] hover:border-pink-500/60 hover:bg-white/[0.08] transition-all duration-200 cursor-pointer"
        >
          <div>
            <div className="text-white font-medium">Latest Upload: {latestDoc.name}</div>
            <div className="text-slate-400 text-sm">
              {latestDoc.category} · {latestDoc.version || "v1"}
              {latestDoc.expiry_date ? ` · expires ${new Date(latestDoc.expiry_date).toLocaleDateString()}` : ""}
              {latestDoc.created_at ? ` · uploaded ${new Date(latestDoc.created_at).toLocaleDateString()}` : ""}
            </div>
            {latestDoc.notes && <div className="text-slate-400 text-sm mt-1">{latestDoc.notes}</div>}
          </div>
        </a>
      )}

      {loading ? (
        <p className="text-slate-400">Loading documents…</p>
      ) : error ? (
        <p className="text-red-400">Error: {error}</p>
      ) : docs.length === 0 ? (
        <p className="text-slate-400">No documents yet. Upload one to get started.</p>
      ) : (
        <ul className="space-y-2">
          {docs.filter((d) => d.id !== latestDoc?.id).map((d) => {
            const url = getPublicUrl(d.file_path);
            const isNew = d.id === highlightId;
            return (
              <li key={d.id}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block rounded-xl p-4 border ${isNew ? "border-pink-500" : "border-white/[0.1] hover:border-white/[0.2]"} bg-white/[0.06] hover:bg-white/[0.08] transition-all duration-200 cursor-pointer`}
                >
                  <div>
                    <div className="text-white font-medium">{d.name}</div>
                    <div className="text-slate-400 text-sm">
                      {d.category} · {d.version || "v1"}
                      {d.expiry_date ? ` · expires ${new Date(d.expiry_date).toLocaleDateString()}` : ""}
                      {d.created_at ? ` · uploaded ${new Date(d.created_at).toLocaleDateString()}` : ""}
                    </div>
                    {d.notes && <div className="text-slate-400 text-sm mt-1">{d.notes}</div>}
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <UploadGlobalDocModal
            onClose={() => setOpen(false)}
            onSuccess={(newId) => {
              setOpen(false);
              setHighlightId(newId || null);
              load();
            }}
          />
        </div>
      )}
    </div>
  );
}