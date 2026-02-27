'use client';

import { useState, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import { toast } from 'sonner';
import { Upload, Loader2, FileText, X } from '@/components/ui/icons';

const INPUT_CLS =
  'w-full px-3 py-2 bg-theme-surface-elevated border border-theme rounded-lg text-sm text-theme-primary focus:outline-none focus:ring-1 focus:ring-teamly/50';

interface DocumentUploadInlineProps {
  employeeId: string;
  docType: string;
  docLabel: string;
  onSuccess: () => void;
}

export function DocumentUploadInline({
  employeeId,
  docType,
  docLabel,
  onSuccess,
}: DocumentUploadInlineProps) {
  const { profile, companyId } = useAppContext();
  const [file, setFile] = useState<File | null>(null);
  const [expiresAt, setExpiresAt] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!file || !companyId || !profile?.id) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('companyId', companyId);
      fd.append('employeeId', employeeId);
      fd.append('docType', docType);
      fd.append('title', docLabel);
      if (expiresAt) fd.append('expiresAt', expiresAt);
      if (notes) fd.append('notes', notes);
      fd.append('uploadedBy', profile.id);

      const resp = await fetch('/api/people/documents', {
        method: 'POST',
        body: fd,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || 'Upload failed');
      }

      toast.success(`${docLabel} uploaded successfully`);
      setFile(null);
      setExpiresAt('');
      setNotes('');
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div
        onClick={() => fileRef.current?.click()}
        className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-theme p-4 transition-colors hover:border-teamly/50 hover:bg-theme-hover"
      >
        {file ? (
          <>
            <FileText className="h-5 w-5 text-teamly" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-theme-primary truncate">{file.name}</p>
              <p className="text-xs text-theme-secondary">
                {(file.size / 1024).toFixed(0)} KB
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
              }}
              className="p-1 rounded hover:bg-theme-muted"
            >
              <X className="h-4 w-4 text-theme-secondary" />
            </button>
          </>
        ) : (
          <>
            <Upload className="h-5 w-5 text-theme-secondary" />
            <div>
              <p className="text-sm font-medium text-theme-primary">Choose file</p>
              <p className="text-xs text-theme-secondary">PDF, JPEG, PNG up to 20MB</p>
            </div>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="text-xs font-medium text-theme-secondary mb-1 block">
            Expiry Date (optional)
          </label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className={INPUT_CLS}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-theme-secondary mb-1 block">
            Notes (optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Verified by manager"
            className={INPUT_CLS}
          />
        </div>
      </div>

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-teamly px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teamly/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Upload {docLabel}
          </>
        )}
      </button>
    </div>
  );
}
