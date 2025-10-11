"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui";
import UploadGlobalDocModal from "@/components/modals/UploadGlobalDocModal";

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
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState<GlobalDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("global_documents")
      .select("id,category,name,version,expiry_date,notes,file_path,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      setError(error.message);
      setDocs([]);
    } else {
      setDocs((data || []) as GlobalDoc[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("global_docs").getPublicUrl(path);
    return data.publicUrl;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Global Documents</h3>
        <Button onClick={() => setOpen(true)}>Upload Document</Button>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading documents…</p>
      ) : error ? (
        <p className="text-red-400">Error: {error}</p>
      ) : docs.length === 0 ? (
        <p className="text-slate-400">No documents yet. Upload one to get started.</p>
      ) : (
        <ul className="space-y-2">
          {docs.map((d) => {
            const url = getPublicUrl(d.file_path);
            return (
              <li key={d.id} className="rounded-xl bg-white/[0.06] border border-white/[0.1] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">{d.name}</div>
                    <div className="text-slate-400 text-sm">
                      {d.category} · {d.version || "v1"}
                      {d.expiry_date ? ` · expires ${new Date(d.expiry_date).toLocaleDateString()}` : ""}
                    </div>
                    {d.notes && <div className="text-slate-400 text-sm mt-1">{d.notes}</div>}
                  </div>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded bg-white/[0.08] border border-white/[0.12] text-white hover:bg-white/[0.14] text-sm"
                  >
                    View
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <UploadGlobalDocModal onClose={() => setOpen(false)} onSuccess={load} />
        </div>
      )}
    </div>
  );
}