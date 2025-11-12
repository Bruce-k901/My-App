"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui";
import UploadGlobalDocModal from "@/components/modals/UploadGlobalDocModal";
import { useAppContext } from "@/context/AppContext";
import { Trash2, X } from "lucide-react";
import { toast } from "sonner";

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  const handleDelete = async (doc: GlobalDoc) => {
    setDeletingId(doc.id);
    try {
      // 1. Delete file from storage
      const { error: storageError } = await supabase.storage
        .from("global_docs")
        .remove([doc.file_path]);

      if (storageError) {
        console.error("Error deleting file from storage:", storageError);
        // Continue anyway - might already be deleted
      }

      // 2. Delete record from database
      const { error: dbError } = await supabase
        .from("global_documents")
        .delete()
        .eq("id", doc.id);

      if (dbError) {
        throw dbError;
      }

      toast.success("Document deleted successfully");
      setConfirmDeleteId(null);
      load(); // Reload the list
    } catch (error: any) {
      console.error("Error deleting document:", error);
      toast.error(`Failed to delete document: ${error.message || "Unknown error"}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Debug: trace docs right before render to confirm data source
  console.log('Docs from Supabase:', docs);

  // Expected EHO Documents - shown as helper
  const expectedDocuments = [
    { name: "Food Safety Policy", category: "Food Safety & Hygiene", required: true },
    { name: "HACCP Plan", category: "Food Safety & Hygiene", required: true },
    { name: "Allergen Management Policy", category: "Food Safety & Hygiene", required: true },
    { name: "Health & Safety Policy", category: "Health & Safety", required: true },
    { name: "Competent Person Appointment Letter", category: "Health & Safety", required: true },
    { name: "COSHH Register", category: "Health & Safety", required: true },
    { name: "Fire Safety Policy", category: "Fire & Premises", required: true },
    { name: "Training Matrix", category: "Training & Competency", required: true },
    { name: "Cleaning Schedule", category: "Cleaning & Hygiene", required: true },
    { name: "Public Liability Insurance", category: "Legal & Certificates", required: true },
    { name: "Employers Liability Insurance", category: "Legal & Certificates", required: true },
    { name: "Food Business Registration", category: "Legal & Certificates", required: true },
    { name: "Waste Management Policy", category: "Environmental & Waste", required: true },
    { name: "Staff Handbook", category: "Compliance", required: true },
  ]

  // Check which expected documents are uploaded
  const uploadedDocNames = docs.map(d => d.name)
  const missingDocs = expectedDocuments.filter(exp => !uploadedDocNames.includes(exp.name))
  const uploadedDocs = expectedDocuments.filter(exp => uploadedDocNames.includes(exp.name))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Global Documents</h3>
        <Button onClick={() => setOpen(true)}>Upload Document</Button>
      </div>

      {/* EHO Requirements Helper */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">EHO Required Documents</h4>
            <p className="text-xs text-white/60">
              Upload these documents to improve your EHO Readiness Pack score
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-green-400">{uploadedDocs.length}</div>
            <div className="text-xs text-white/60">of {expectedDocuments.length}</div>
          </div>
        </div>
        
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {expectedDocuments.map((doc) => {
            const isUploaded = uploadedDocNames.includes(doc.name)
            return (
              <div
                key={doc.name}
                className={`flex items-center gap-2 text-xs p-2 rounded ${
                  isUploaded
                    ? 'bg-green-500/10 border border-green-500/30'
                    : 'bg-white/[0.03] border border-white/[0.1]'
                }`}
              >
                {isUploaded ? (
                  <span className="text-green-400">✓</span>
                ) : (
                  <span className="text-red-400">○</span>
                )}
                <span className={`flex-1 ${isUploaded ? 'text-white/80' : 'text-white/60'}`}>
                  {doc.name}
                </span>
                {doc.required && (
                  <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">Required</span>
                )}
              </div>
            )
          })}
        </div>
        
        {missingDocs.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/[0.1]">
            <p className="text-xs text-yellow-400">
              ⚠ {missingDocs.length} required document{missingDocs.length > 1 ? 's' : ''} missing
            </p>
          </div>
        )}
      </div>

      {/* Latest upload card */}
      {!loading && !error && latestDoc && (
        <div className="relative group">
          {confirmDeleteId === latestDoc.id ? (
            <div className="rounded-xl p-4 border border-red-500/50 bg-red-500/10">
              <div className="text-white font-medium mb-2">Delete "{latestDoc.name}"?</div>
              <div className="text-sm text-white/60 mb-3">This action cannot be undone.</div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleDelete(latestDoc)}
                  disabled={deletingId === latestDoc.id}
                  className="bg-red-500 hover:bg-red-600 text-white"
                  size="sm"
                >
                  {deletingId === latestDoc.id ? "Deleting..." : "Delete"}
                </Button>
                <Button
                  onClick={() => setConfirmDeleteId(null)}
                  variant="ghost"
                  size="sm"
                  disabled={deletingId === latestDoc.id}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <a
                href={getPublicUrl(latestDoc.file_path)}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl p-4 border border-pink-500/40 bg-white/[0.06] hover:border-pink-500/60 hover:bg-white/[0.08] transition-all duration-200 cursor-pointer pr-12"
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
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setConfirmDeleteId(latestDoc.id);
                }}
                className="absolute top-4 right-4 p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={deletingId === latestDoc.id}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-slate-400">Loading documents…</p>
      ) : error ? (
        <p className="text-red-400">Error: {error}</p>
      ) : docs.length === 0 ? (
        <p className="text-slate-400">No documents yet. Upload one to get started.</p>
      ) : (
        <>
          {/* Info about renaming */}
          {docs.some(d => !expectedDocuments.find(ed => ed.name === d.name)) && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
              <p className="text-xs text-yellow-400">
                💡 <strong>Tip:</strong> Some documents may not match EHO requirements. 
                When uploading new documents, use the "Document Type" selector to ensure they're recognized by the EHO Readiness Pack.
              </p>
            </div>
          )}
          
          <ul className="space-y-2">
            {docs.filter((d) => d.id !== latestDoc?.id).map((d) => {
              const url = getPublicUrl(d.file_path);
              const isNew = d.id === highlightId;
              const isEHORequired = expectedDocuments.find(ed => ed.name === d.name)
              const isDeleting = deletingId === d.id
              const showConfirm = confirmDeleteId === d.id
              
              return (
                <li key={d.id} className="relative group">
                  {showConfirm ? (
                    <div className="rounded-xl p-4 border border-red-500/50 bg-red-500/10">
                      <div className="text-white font-medium mb-2">Delete "{d.name}"?</div>
                      <div className="text-sm text-white/60 mb-3">This action cannot be undone.</div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleDelete(d)}
                          disabled={isDeleting}
                          className="bg-red-500 hover:bg-red-600 text-white"
                          size="sm"
                        >
                          {isDeleting ? "Deleting..." : "Delete"}
                        </Button>
                        <Button
                          onClick={() => setConfirmDeleteId(null)}
                          variant="ghost"
                          size="sm"
                          disabled={isDeleting}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block rounded-xl p-4 border ${isNew ? "border-pink-500" : isEHORequired ? "border-green-500/30" : "border-white/[0.1] hover:border-white/[0.2]"} ${isEHORequired ? "bg-green-500/5" : "bg-white/[0.06]"} hover:bg-white/[0.08] transition-all duration-200 cursor-pointer pr-12`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="text-white font-medium">{d.name}</div>
                              {isEHORequired && (
                                <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">EHO</span>
                              )}
                            </div>
                            <div className="text-slate-400 text-sm">
                              {d.category} · {d.version || "v1"}
                              {d.expiry_date ? ` · expires ${new Date(d.expiry_date).toLocaleDateString()}` : ""}
                              {d.created_at ? ` · uploaded ${new Date(d.created_at).toLocaleDateString()}` : ""}
                            </div>
                            {d.notes && <div className="text-slate-400 text-sm mt-1">{d.notes}</div>}
                          </div>
                        </div>
                      </a>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setConfirmDeleteId(d.id);
                        }}
                        className="absolute top-4 right-4 p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={isDeleting}
                        title="Delete document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </>
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