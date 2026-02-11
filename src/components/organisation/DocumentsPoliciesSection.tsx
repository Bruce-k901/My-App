"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui";
import UploadGlobalDocModal from "@/components/modals/UploadGlobalDocModal";
import { useAppContext } from "@/context/AppContext";
import { Trash2, X, Archive, ArrowLeft, FileText, Edit } from '@/components/ui/icons';
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import DocumentReviewModal from "@/components/modals/DocumentReviewModal";

type GlobalDoc = {
  id: string;
  category: string;
  name: string;
  version?: string | null;
  expiry_date?: string | null;
  notes?: string | null;
  file_path: string | null;
  created_at?: string;
  is_archived?: boolean;
  is_placeholder?: boolean | null;
  doc_key?: string | null;
};

export default function DocumentsPoliciesSection() {
  const { companyId, company } = useAppContext();
  
  // Use selected company from context (for multi-company support)
  const effectiveCompanyId = company?.id || companyId;
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const documentIdParam = searchParams?.get('document_id');
  const showArchived = searchParams?.get('archived') === 'true';
  const [open, setOpen] = useState(false);
  const [replaceDoc, setReplaceDoc] = useState<GlobalDoc | null>(null);
  const [docs, setDocs] = useState<GlobalDoc[]>([]);
  const [latestDoc, setLatestDoc] = useState<GlobalDoc | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<GlobalDoc | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const isPlaceholderFilePath = (filePath: unknown): boolean => {
    if (!filePath) return true;
    if (typeof filePath !== "string") return true;
    return filePath.includes("/_onboarding_placeholders/");
  };

  const load = useCallback(async () => {
    if (!effectiveCompanyId) {
      setLoading(false);
      setDocs([]);
      setLatestDoc(null);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      // Build query - handle is_archived column gracefully
      // First try with is_archived filter, fallback to without if column doesn't exist
      const baseSelect = "id,category,name,version,expiry_date,notes,file_path,created_at";
      const selectWithAll = `${baseSelect},is_archived,is_placeholder,doc_key`;
      const selectNoArchive = `${baseSelect},is_placeholder,doc_key`;
      const selectLegacy = baseSelect;

      let query = supabase
        .from("global_documents")
        .select(selectWithAll)
        .eq("company_id", effectiveCompanyId);
      
      // Try to filter by is_archived
      if (showArchived) {
        query = query.eq("is_archived", true);
      } else {
        // For active documents, show all (is_archived=false or null/undefined)
        // We'll filter in JavaScript as fallback
      }
      
      query = query.order("created_at", { ascending: false });
      
      let { data, error } = await query;
      
      // If error is about is_archived column not existing, retry without filter
      if (error && (error.message?.includes('is_archived') || error.code === 'PGRST204')) {
        console.log('is_archived column not found, querying without filter');
        query = supabase
          .from("global_documents")
          .select(selectNoArchive)
          .eq("company_id", effectiveCompanyId)
          .order("created_at", { ascending: false });
        
        const retryResult = await query;
        data = retryResult.data;
        error = retryResult.error;
      }

      // If error is about newer columns not existing (is_placeholder/doc_key), retry legacy select
      if (error && (String((error as any)?.message || '').includes('is_placeholder') || String((error as any)?.message || '').includes('doc_key') || (error as any)?.code === 'PGRST204')) {
        query = supabase
          .from("global_documents")
          .select(selectLegacy)
          .eq("company_id", effectiveCompanyId)
          .order("created_at", { ascending: false });

        const retryLegacy = await query;
        data = retryLegacy.data;
        error = retryLegacy.error;
      }
        
      if (error) {
        setError(error.message);
        setDocs([]);
        setLatestDoc(null);
      } else {
        let list = (data || []) as GlobalDoc[];
        
        // Filter by is_archived in JavaScript (handles both DB filter and fallback)
        if (!showArchived) {
          // Show documents where is_archived is false, null, or undefined
          list = list.filter(doc => !doc.is_archived);
        } else {
          // Show only archived documents
          list = list.filter(doc => doc.is_archived === true);
        }
        
        setDocs(list);
        setLatestDoc(list[0] || null);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load documents");
      setDocs([]);
      setLatestDoc(null);
    } finally {
      setLoading(false);
    }
  }, [effectiveCompanyId]);

  useEffect(() => {
    // Load (or reload) whenever company context changes
    load();
  }, [load]);

  // Live updates: re-fetch when global_documents changes for this company
  useEffect(() => {
    if (!effectiveCompanyId) return;
    
    // Debounce realtime updates to prevent infinite loops
    let debounceTimeout: NodeJS.Timeout;
    const debouncedLoad = () => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        load();
      }, 500); // 500ms debounce
    };
    
    const channel = supabase
      .channel("global_documents_updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "global_documents", filter: `company_id=eq.${effectiveCompanyId}` },
        debouncedLoad
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimeout);
      supabase.removeChannel(channel);
    };
  }, [effectiveCompanyId, load]);
  // Fade the highlight after 20 seconds
  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => setHighlightId(null), 20000);
    return () => clearTimeout(timer);
  }, [highlightId]);

  // Handle query params for navigation from tasks
  useEffect(() => {
    if (documentIdParam && docs.length > 0) {
      const doc = docs.find(d => d.id === documentIdParam);
      if (doc) {
        // Highlight the document
        setHighlightId(documentIdParam);
        
        // Scroll to the document after a short delay
        setTimeout(() => {
          const element = document.getElementById(`document-row-${documentIdParam}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Remove highlight after 5 seconds
            setTimeout(() => {
              setHighlightId(null);
            }, 5000);
          }
        }, 500);
      }
    }
  }, [documentIdParam, docs]);

  const getPublicUrl = (path: string | null) => {
    // Paths are stored company-scoped: `${effectiveCompanyId}/folder/filename`
    if (!path || isPlaceholderFilePath(path)) return null;
    const { data } = supabase.storage.from("global_docs").getPublicUrl(path);
    return data.publicUrl || null;
  };

  const handleArchive = async (doc: GlobalDoc) => {
    try {
      // Check if is_archived column exists by trying to update it
      const { error: updateError } = await supabase
        .from("global_documents")
        .update({ is_archived: true })
        .eq("id", doc.id);

      if (updateError) {
        // If column doesn't exist, show helpful message
        if (updateError.message?.includes('is_archived') || updateError.code === 'PGRST204') {
          toast.error("Archive feature requires database migration. Please run: add_is_archived_to_global_documents.sql");
          return;
        }
        throw updateError;
      }

      toast.success("Document archived successfully");
      load();
    } catch (error: any) {
      console.error("Error archiving document:", error);
      toast.error(`Failed to archive document: ${error.message || "Unknown error"}`);
    }
  };

  const handleUnarchive = async (doc: GlobalDoc) => {
    try {
      const { error: updateError } = await supabase
        .from("global_documents")
        .update({ is_archived: false })
        .eq("id", doc.id);

      if (updateError) {
        if (updateError.message?.includes('is_archived') || updateError.code === 'PGRST204') {
          toast.error("Unarchive feature requires database migration. Please run: add_is_archived_to_global_documents.sql");
          return;
        }
        throw updateError;
      }

      toast.success("Document unarchived successfully");
      load();
    } catch (error: any) {
      console.error("Error unarchiving document:", error);
      toast.error(`Failed to unarchive document: ${error.message || "Unknown error"}`);
    }
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
        <div className="flex items-center gap-4">
          {showArchived && (
            <button
              onClick={() => router.push('/dashboard/documents')}
              className="flex items-center gap-2 text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Documents</span>
            </button>
          )}
          <h3 className="text-gray-900 dark:text-white font-semibold">
            {showArchived ? "Archived Documents" : "Global Documents"}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {!showArchived && (
            <Button
              onClick={() => router.push('/dashboard/documents?archived=true')}
              variant="outline"
            >
              <Archive className="h-4 w-4 mr-2" />
              View Archived
            </Button>
          )}
          {!showArchived && (
            <Button onClick={() => { setReplaceDoc(null); setOpen(true); }}>Upload Document</Button>
          )}
        </div>
      </div>

      {/* EHO Requirements Helper */}
      <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">EHO Required Documents</h4>
            <p className="text-xs text-gray-500 dark:text-white/60">
              Upload these documents to improve your EHO Readiness Pack score
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-green-600 dark:text-green-400">{uploadedDocs.length}</div>
            <div className="text-xs text-gray-500 dark:text-white/60">of {expectedDocuments.length}</div>
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
                    ? 'bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30'
                    : 'bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.1]'
                }`}
              >
                {isUploaded ? (
                  <span className="text-green-600 dark:text-green-400">✓</span>
                ) : (
                  <span className="text-red-500 dark:text-red-400">○</span>
                )}
                <span className={`flex-1 ${isUploaded ? 'text-gray-700 dark:text-white/80' : 'text-gray-500 dark:text-white/60'}`}>
                  {doc.name}
                </span>
                {doc.required && (
                  <span className="text-xs px-1.5 py-0.5 bg-red-100 dark:bg-red-500/20 text-red-500 dark:text-red-400 rounded">Required</span>
                )}
              </div>
            )
          })}
        </div>
        
        {missingDocs.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/[0.1]">
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              ⚠ {missingDocs.length} required document{missingDocs.length > 1 ? 's' : ''} missing
            </p>
          </div>
        )}
      </div>

      {/* Latest upload card */}
      {!loading && !error && latestDoc && (
        <div className="relative group">
          <>
            <div
                className="block rounded-xl p-4 border border-[#D37E91] dark:border-[#D37E91]/40 bg-[#D37E91]/10 dark:bg-white/[0.06] hover:border-[#D37E91] dark:hover:border-[#D37E91]/60 hover:bg-[#D37E91]/10 dark:hover:bg-white/[0.08] transition-all duration-200 pr-12 group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-gray-900 dark:text-white font-medium">Latest Upload: {latestDoc.name}</div>
                    <div className="text-gray-500 dark:text-slate-400 text-sm">
                      {latestDoc.category} · {latestDoc.version || "v1"}
                      {latestDoc.expiry_date ? ` · expires ${new Date(latestDoc.expiry_date).toLocaleDateString()}` : ""}
                      {latestDoc.created_at ? ` · uploaded ${new Date(latestDoc.created_at).toLocaleDateString()}` : ""}
                    </div>
                    {latestDoc.notes && <div className="text-gray-500 dark:text-slate-400 text-sm mt-1">{latestDoc.notes}</div>}
                    {(!latestDoc.file_path || isPlaceholderFilePath(latestDoc.file_path) || latestDoc.is_placeholder) && (
                      <div className="text-amber-600 dark:text-amber-300 text-xs mt-2">
                        Placeholder document (no file uploaded yet)
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {(!latestDoc.file_path || isPlaceholderFilePath(latestDoc.file_path) || latestDoc.is_placeholder) && !showArchived ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplaceDoc(latestDoc);
                          setOpen(true);
                        }}
                        className="p-2.5 rounded-lg bg-[#D37E91]/10 hover:bg-[#D37E91]/20 text-[#D37E91] border border-[#D37E91]/30 hover:border-[#D37E91]/50 transition-colors"
                        title="Upload file for this placeholder document"
                      >
                        <FileText className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!latestDoc.file_path || isPlaceholderFilePath(latestDoc.file_path)) return;
                          setSelectedDocument(latestDoc);
                          setShowReviewModal(true);
                        }}
                        className="p-2.5 rounded-lg bg-[#D37E91]/10 hover:bg-[#D37E91]/20 text-[#D37E91] border border-[#D37E91]/30 hover:border-[#D37E91]/50 transition-colors"
                        title="Edit document - update expiry date or upload new version"
                        disabled={!latestDoc.file_path || isPlaceholderFilePath(latestDoc.file_path)}
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                    )}
                    {!showArchived && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleArchive(latestDoc);
                        }}
                        className="p-2.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 transition-colors"
                        title="Archive document"
                      >
                        <Archive className="w-5 h-5" />
                      </button>
                    )}
                    {showArchived && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleUnarchive(latestDoc);
                        }}
                        className="p-2.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors"
                        title="Unarchive document"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
          </>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 dark:text-slate-400">Loading documents…</p>
      ) : error ? (
        <p className="text-red-500 dark:text-red-400">Error: {error}</p>
      ) : docs.length === 0 ? (
        <p className="text-gray-500 dark:text-slate-400">No documents yet. Upload one to get started.</p>
      ) : (
        <>
          {/* Info about renaming */}
          {docs.some(d => !expectedDocuments.find(ed => ed.name === d.name)) && (
            <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-lg p-3 mb-4">
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                💡 <strong>Tip:</strong> Some documents may not match EHO requirements. 
                When uploading new documents, use the "Document Type" selector to ensure they're recognized by the EHO Readiness Pack.
              </p>
            </div>
          )}
          
          <ul className="space-y-2">
            {docs.filter((d) => d.id !== latestDoc?.id).map((d) => {
              const isNew = d.id === highlightId;
              const isEHORequired = expectedDocuments.find(ed => ed.name === d.name)
              const needsUpload = !d.file_path || isPlaceholderFilePath(d.file_path) || d.is_placeholder
              
              return (
                <li
                  key={d.id}
                  id={`document-row-${d.id}`}
                  className={`relative group ${isNew ? 'animate-pulse' : ''} ${
                    isNew ? 'border-2 border-blue-500/60 bg-blue-500/10 rounded-xl' : ''
                  }`}
                >
                  <>
                    <div
                        className={`block rounded-xl p-4 border ${isNew ? "border-blue-300 dark:border-blue-500/60 bg-blue-50 dark:bg-blue-500/10" : isEHORequired ? "border-green-200 dark:border-green-500/30" : "border-gray-200 dark:border-white/[0.1] hover:border-gray-300 dark:hover:border-white/[0.2]"} ${isEHORequired && !isNew ? "bg-green-50 dark:bg-green-500/5" : !isNew ? "bg-white dark:bg-white/[0.06]" : ""} hover:bg-gray-50 dark:hover:bg-white/[0.08] transition-all duration-200 pr-12 group`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="text-gray-900 dark:text-white font-medium">{d.name}</div>
                              {isEHORequired && (
                                <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded">EHO</span>
                              )}
                              {needsUpload && (
                                <span className="text-xs px-1.5 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 rounded">
                                  Placeholder
                                </span>
                              )}
                            </div>
                            <div className="text-gray-500 dark:text-slate-400 text-sm">
                              {d.category} · {d.version || "v1"}
                              {d.expiry_date ? ` · expires ${new Date(d.expiry_date).toLocaleDateString()}` : ""}
                              {d.created_at ? ` · uploaded ${new Date(d.created_at).toLocaleDateString()}` : ""}
                            </div>
                            {d.notes && <div className="text-gray-500 dark:text-slate-400 text-sm mt-1">{d.notes}</div>}
                          </div>
                          <div className="flex items-center gap-3">
                            {!showArchived && needsUpload && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReplaceDoc(d);
                                  setOpen(true);
                                }}
                                className="p-2.5 rounded-lg bg-[#D37E91]/10 hover:bg-[#D37E91]/20 text-[#D37E91] border border-[#D37E91]/30 hover:border-[#D37E91]/50 transition-colors"
                                title="Upload file for this placeholder document"
                              >
                                <FileText className="w-5 h-5" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!d.file_path || isPlaceholderFilePath(d.file_path)) return;
                                setSelectedDocument(d);
                                setShowReviewModal(true);
                              }}
                              className="p-2.5 rounded-lg bg-[#D37E91]/10 hover:bg-[#D37E91]/20 text-[#D37E91] border border-[#D37E91]/30 hover:border-[#D37E91]/50 transition-colors"
                              title="Edit document - update expiry date or upload new version"
                              disabled={!d.file_path || isPlaceholderFilePath(d.file_path)}
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            {!showArchived && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleArchive(d);
                                }}
                                className="p-2.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 transition-colors"
                                title="Archive document"
                              >
                                <Archive className="w-5 h-5" />
                              </button>
                            )}
                            {showArchived && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleUnarchive(d);
                                }}
                                className="p-2.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors"
                                title="Unarchive document"
                              >
                                <ArrowLeft className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                  </>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <UploadGlobalDocModal
            existingDocumentId={replaceDoc?.id}
            initialCategory={replaceDoc?.category}
            initialName={replaceDoc?.name}
            initialNotes={replaceDoc?.notes || ''}
            onClose={() => { setOpen(false); setReplaceDoc(null); }}
            onSuccess={(newId) => {
              setOpen(false);
              setReplaceDoc(null);
              setHighlightId(newId || null);
              load();
            }}
          />
        </div>
      )}

      {selectedDocument && selectedDocument.file_path && !isPlaceholderFilePath(selectedDocument.file_path) && (
        <DocumentReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false)
            setSelectedDocument(null)
          }}
          documentId={selectedDocument.id}
          documentName={selectedDocument.name}
          currentExpiryDate={selectedDocument.expiry_date || null}
          currentVersion={selectedDocument.version || null}
          currentFilePath={selectedDocument.file_path}
          onSuccess={() => {
            setShowReviewModal(false)
            setSelectedDocument(null)
            load()
          }}
        />
      )}
    </div>
  );
}