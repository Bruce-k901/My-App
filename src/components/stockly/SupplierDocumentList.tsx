// @salsa - SALSA Compliance: Supplier documents list with download/archive
'use client';

import { useState } from 'react';
import { FileText, Download, Archive, Trash2, AlertTriangle, Clock } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { SupplierDocument } from '@/lib/types/stockly';

// @salsa
const DOC_TYPE_LABELS: Record<string, string> = {
  certificate: 'Certificate',
  insurance: 'Insurance',
  spec_sheet: 'Spec Sheet',
  audit_report: 'Audit Report',
  contract: 'Contract',
  other: 'Other',
};

const DOC_TYPE_COLORS: Record<string, string> = {
  certificate: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  insurance: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  spec_sheet: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
  audit_report: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  contract: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
  other: 'bg-gray-500/15 text-gray-400 border-gray-500/25',
};

interface SupplierDocumentListProps {
  documents: SupplierDocument[];
  onRefresh: () => void;
}

export default function SupplierDocumentList({ documents, onRefresh }: SupplierDocumentListProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // @salsa — Download document via signed URL
  async function handleDownload(doc: SupplierDocument) {
    if (!doc.file_path) {
      toast.error('No file attached to this document');
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('supplier-docs')
        .createSignedUrl(doc.file_path, 60 * 60); // 1 hour expiry

      if (error || !data?.signedUrl) {
        throw error || new Error('Failed to generate download URL');
      }

      window.open(data.signedUrl, '_blank');
    } catch (err: any) {
      toast.error('Failed to download document');
    }
  }

  // @salsa — Archive document
  async function handleArchive(doc: SupplierDocument) {
    setActionLoading(doc.id);
    try {
      const { error } = await supabase
        .from('supplier_documents')
        .update({ is_archived: true })
        .eq('id', doc.id);

      if (error) throw error;
      toast.success('Document archived');
      onRefresh();
    } catch (err: any) {
      toast.error('Failed to archive document');
    } finally {
      setActionLoading(null);
    }
  }

  function isExpiringSoon(expiryDate: string | null | undefined): boolean {
    if (!expiryDate) return false;
    const days = Math.ceil(
      (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return days <= 30 && days > 0;
  }

  function isExpired(expiryDate: string | null | undefined): boolean {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  }

  if (documents.length === 0) {
    return (
      <div className="bg-theme-surface border border-theme rounded-xl p-8 text-center">
        <FileText className="w-8 h-8 text-theme-tertiary mx-auto mb-3" />
        <p className="text-theme-secondary text-sm">No documents uploaded</p>
        <p className="text-theme-tertiary text-xs mt-1">Upload certificates, insurance, and spec sheets</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => {
        const expired = isExpired(doc.expiry_date);
        const expiringSoon = isExpiringSoon(doc.expiry_date);

        return (
          <div
            key={doc.id}
            className={`bg-theme-surface border rounded-xl p-4 flex items-start gap-3 ${
              expired ? 'border-red-500/30' : expiringSoon ? 'border-amber-500/30' : 'border-theme'
            }`}
          >
            <div className="w-10 h-10 rounded-lg bg-theme-button flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-theme-tertiary" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-medium text-theme-primary truncate">{doc.name}</h4>
                <span className={`px-2 py-0.5 rounded-full text-xs border ${DOC_TYPE_COLORS[doc.document_type] || DOC_TYPE_COLORS.other}`}>
                  {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                </span>
                {doc.version && (
                  <span className="text-xs text-theme-tertiary">{doc.version}</span>
                )}
              </div>

              {doc.description && (
                <p className="text-xs text-theme-tertiary mb-1 truncate">{doc.description}</p>
              )}

              <div className="flex items-center gap-3 text-xs text-theme-tertiary">
                {doc.uploaded_at && (
                  <span>Uploaded: {new Date(doc.uploaded_at).toLocaleDateString('en-GB')}</span>
                )}
                {doc.expiry_date && (
                  <span className={`flex items-center gap-1 ${expired ? 'text-red-400' : expiringSoon ? 'text-amber-400' : ''}`}>
                    {(expired || expiringSoon) && <AlertTriangle className="w-3 h-3" />}
                    {expired ? 'Expired' : 'Expires'}: {new Date(doc.expiry_date).toLocaleDateString('en-GB')}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {doc.file_path && (
                <button
                  onClick={() => handleDownload(doc)}
                  className="p-2 text-theme-tertiary hover:text-module-fg transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => handleArchive(doc)}
                disabled={actionLoading === doc.id}
                className="p-2 text-theme-tertiary hover:text-amber-400 transition-colors"
                title="Archive"
              >
                <Archive className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
