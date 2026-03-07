'use client';

import { useState } from 'react';
import { Upload, X, FileText, Loader2 } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ServiceReportUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onExtracted: (data: any, fileUrl: string) => void;
}

export default function ServiceReportUpload({ isOpen, onClose, onExtracted }: ServiceReportUploadProps) {
  const { companyId, siteId } = useAppContext();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error('Please select a JPEG, PNG, WebP image or PDF file');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
  }

  async function handleUpload() {
    if (!file || !companyId || !siteId) return;

    try {
      setUploading(true);

      // Upload to Supabase Storage
      const fileName = `${companyId}/${siteId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      const { error: uploadError } = await supabase.storage
        .from('pest-control-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'application/octet-stream',
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('pest-control-documents')
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;

      // Send to AI extraction API
      setProcessing(true);
      const response = await fetch('/api/pest-control/process-service-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          fileType: file.type,
          companyId,
          siteId,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to process service report');
      }

      const { extractedData } = await response.json();

      toast.success('Service report processed — review the extracted data');
      onExtracted(extractedData, imageUrl);
      handleClose();
    } catch (error: any) {
      console.error('Error processing service report:', error);
      toast.error(error.message || 'Failed to process service report');
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  }

  function handleClose() {
    if (!uploading && !processing) {
      setFile(null);
      onClose();
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-theme-primary">Upload Service Report</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-theme-secondary">
          Upload a pest control service report (PDF or photo) and AI will extract the visit details for you to review.
        </p>

        <div className="space-y-4 mt-2">
          {!file ? (
            <div className="border-2 border-dashed border-theme rounded-lg p-8 text-center hover:border-checkly-dark/50 dark:hover:border-checkly/50 transition-colors">
              <input
                type="file"
                id="pest-report-upload"
                className="hidden"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileSelect}
                disabled={uploading || processing}
              />
              <label
                htmlFor="pest-report-upload"
                className="cursor-pointer flex flex-col items-center gap-3"
              >
                <Upload className="text-theme-tertiary w-8 h-8" />
                <div>
                  <span className="text-checkly-dark dark:text-checkly font-medium">Click to upload</span>
                  <span className="text-theme-tertiary"> or drag and drop</span>
                </div>
                <p className="text-xs text-theme-tertiary">
                  JPEG, PNG, WebP or PDF (max 10MB)
                </p>
              </label>
            </div>
          ) : (
            <div className="border border-theme rounded-lg p-4 flex items-center justify-between bg-theme-surface">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="text-checkly-dark dark:text-checkly w-6 h-6 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-theme-primary font-medium truncate">{file.name}</p>
                  <p className="text-xs text-theme-tertiary">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFile(null)}
                disabled={uploading || processing}
                className="text-theme-tertiary hover:text-red-400 transition-colors disabled:opacity-50 flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {(uploading || processing) && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-center gap-3">
              <Loader2 className="text-amber-500 animate-spin w-5 h-5 flex-shrink-0" />
              <div>
                <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                  {uploading ? 'Uploading file...' : 'Extracting data with AI...'}
                </p>
                <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-0.5">
                  {uploading
                    ? 'Please wait while we upload your file'
                    : 'Reading the service report and extracting visit details. This may take a moment.'}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleUpload}
              disabled={!file || uploading || processing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-checkly-dark dark:bg-checkly text-white dark:text-checkly-dark hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading || processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploading ? 'Uploading...' : 'Processing...'}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload & Extract
                </>
              )}
            </button>
            <button
              onClick={handleClose}
              disabled={uploading || processing}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border border-theme text-theme-secondary hover:bg-theme-hover transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
