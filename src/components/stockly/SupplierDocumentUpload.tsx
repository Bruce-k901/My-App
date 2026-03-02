// @salsa - SALSA Compliance: Supplier document upload modal
'use client';

import { useState, useRef } from 'react';
import { Upload, X, FileText } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { SupplierDocumentType } from '@/lib/types/stockly';

// @salsa
const DOCUMENT_TYPES: { label: string; value: SupplierDocumentType }[] = [
  { label: 'Food Safety Certificate', value: 'certificate' },
  { label: 'Insurance Document', value: 'insurance' },
  { label: 'Product Spec Sheet', value: 'spec_sheet' },
  { label: 'Audit Report', value: 'audit_report' },
  { label: 'Contract', value: 'contract' },
  { label: 'Other', value: 'other' },
];

function sanitizeFileName(fileName: string): string {
  return fileName
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w.-]/g, '_')
    .toLowerCase();
}

interface SupplierDocumentUploadProps {
  isOpen: boolean;
  onClose: () => void;
  supplierId: string;
  companyId: string;
  onUploaded: () => void;
}

export default function SupplierDocumentUpload({
  isOpen,
  onClose,
  supplierId,
  companyId,
  onUploaded,
}: SupplierDocumentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: '',
    document_type: '' as string,
    version: 'v1',
    expiry_date: '',
    description: '',
  });

  function resetForm() {
    setFile(null);
    setForm({ name: '', document_type: '', version: 'v1', expiry_date: '', description: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      if (!form.name) {
        setForm((prev) => ({ ...prev, name: selected.name.replace(/\.[^/.]+$/, '') }));
      }
    }
  }

  async function handleUpload() {
    if (!file || !form.document_type || !form.name) {
      toast.error('Please fill in name, type, and select a file');
      return;
    }

    setUploading(true);
    try {
      // @salsa — Upload file to supplier-docs bucket
      const sanitized = sanitizeFileName(file.name);
      const filePath = `${companyId}/suppliers/${supplierId}/${Date.now()}_${sanitized}`;

      const { error: uploadError } = await supabase.storage
        .from('supplier-docs')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'application/octet-stream',
        });

      if (uploadError) throw uploadError;

      // @salsa — Create document record via API
      const res = await fetch(`/api/stockly/suppliers/${supplierId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          document_type: form.document_type,
          name: form.name,
          description: form.description || null,
          file_path: filePath,
          version: form.version || 'v1',
          expiry_date: form.expiry_date || null,
        }),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      toast.success('Document uploaded');
      resetForm();
      onUploaded();
      onClose();
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetForm(); onClose(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-theme-primary">
            Upload Supplier Document
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-3">
          {/* File picker */}
          <div>
            <label className="block text-sm text-theme-secondary mb-1">File *</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-theme rounded-xl text-theme-secondary hover:border-module-fg/40 hover:text-module-fg transition-colors"
            >
              {file ? (
                <>
                  <FileText className="w-5 h-5" />
                  <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                  <span className="text-xs text-theme-tertiary">({(file.size / 1024).toFixed(0)} KB)</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span className="text-sm">Click to select file</span>
                </>
              )}
            </button>
          </div>

          {/* Document type */}
          <div>
            <label className="block text-sm text-theme-secondary mb-1">Document Type *</label>
            <Select
              value={form.document_type}
              onValueChange={(val) => setForm((prev) => ({ ...prev, document_type: val }))}
              options={DOCUMENT_TYPES}
              placeholder="Select type"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm text-theme-secondary mb-1">Document Name *</label>
            <Input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Food Safety Level 3 Certificate"
            />
          </div>

          {/* Version + Expiry */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-theme-secondary mb-1">Version</label>
              <Input
                value={form.version}
                onChange={(e) => setForm((prev) => ({ ...prev, version: e.target.value }))}
                placeholder="v1"
              />
            </div>
            <div>
              <label className="block text-sm text-theme-secondary mb-1">Expiry Date</label>
              <Input
                type="date"
                value={form.expiry_date}
                onChange={(e) => setForm((prev) => ({ ...prev, expiry_date: e.target.value }))}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-theme-secondary mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Optional notes about this document..."
              rows={2}
              className="w-full px-3 py-2 bg-theme-button border border-theme rounded-lg text-sm text-theme-primary placeholder:text-theme-tertiary focus:outline-none focus:ring-1 focus:ring-module-fg/50 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleUpload}
              disabled={uploading || !file || !form.document_type || !form.name}
              variant="secondary"
              className="flex-1"
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </Button>
            <Button onClick={() => { resetForm(); onClose(); }} variant="outline" className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
