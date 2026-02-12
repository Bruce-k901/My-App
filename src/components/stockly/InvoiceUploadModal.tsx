'use client';

import { useState, useEffect } from 'react';
import { Upload, X, FileText, Loader2 } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { toast } from 'sonner';

interface Supplier {
  id: string;
  name: string;
  code?: string;
}

interface InvoiceUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (deliveryId: string) => void;
}

export function InvoiceUploadModal({ isOpen, onClose, onSuccess }: InvoiceUploadModalProps) {
  const { companyId, siteId } = useAppContext();
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Fetch suppliers when modal opens
  useEffect(() => {
    if (isOpen && companyId) {
      fetchSuppliers();
    }
  }, [isOpen, companyId]);

  async function fetchSuppliers() {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, code')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error: any) {
      console.error('Error fetching suppliers:', error);
      toast.error('Failed to load suppliers');
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error('Please select a JPEG, PNG, WebP image or PDF file');
      return;
    }

    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
  }

  function handleRemoveFile() {
    setFile(null);
  }

  async function handleUpload() {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    if (!selectedSupplier) {
      toast.error('Please select a supplier');
      return;
    }

    if (!companyId || !siteId) {
      toast.error('Company or site information missing');
      return;
    }

    try {
      setUploading(true);

      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${companyId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `invoices/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'application/octet-stream',
        });

      if (uploadError) {
        // Try creating bucket if it doesn't exist (fallback)
        if (uploadError.message?.includes('Bucket not found')) {
          toast.error('Storage bucket not configured. Please contact support.');
          return;
        }
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from('invoices').getPublicUrl(filePath);
      const imageUrl = urlData.publicUrl;

      // Process invoice with AI
      setProcessing(true);
      const response = await fetch('/api/stockly/process-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          fileType: file.type,
          supplierId: selectedSupplier,
          companyId,
          siteId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process invoice');
      }

      const { deliveryId } = await response.json();
      toast.success('Invoice processed successfully');
      onSuccess(deliveryId);
      
      // Reset form
      setFile(null);
      setSelectedSupplier('');
    } catch (error: any) {
      console.error('Error uploading invoice:', error);
      toast.error(error.message || 'Failed to upload and process invoice');
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  }

  function handleClose() {
    if (!uploading && !processing) {
      setFile(null);
      setSelectedSupplier('');
      onClose();
    }
  }

  const supplierOptions = suppliers.map((s) => ({
    label: s.name,
    value: s.id,
  })) as Array<{ label: string; value: string }>;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-theme-primary">Upload Invoice</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Supplier Selection */}
          <div>
            <label className="block text-sm text-theme-secondary mb-2">
              Supplier <span className="text-red-400">*</span>
            </label>
            <SearchableSelect
              value={selectedSupplier}
              onValueChange={setSelectedSupplier}
              options={supplierOptions}
              placeholder="Select supplier"
              disabled={uploading || processing}
            />
            <p className="text-xs text-theme-tertiary mt-1">
              Selecting the supplier helps AI match line items to existing products
            </p>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm text-theme-secondary mb-2">
              Invoice File <span className="text-red-400">*</span>
            </label>

            {!file ? (
              <div className="border-2 border-dashed border-theme rounded-lg p-8 text-center hover:border-[#D37E91]/50 transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileSelect}
                  disabled={uploading || processing}
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  <Upload className="text-theme-tertiary" size={32} />
                  <div>
                    <span className="text-[#D37E91] font-medium">Click to upload</span>
                    <span className="text-theme-tertiary"> or drag and drop</span>
                  </div>
                  <p className="text-xs text-theme-tertiary">
                    JPEG, PNG, WebP or PDF (max 10MB)
                  </p>
                </label>
              </div>
            ) : (
              <div className="border border-theme rounded-lg p-4 flex items-center justify-between bg-white/[0.03]">
                <div className="flex items-center gap-3">
                  <FileText className="text-[#D37E91]" size={24} />
                  <div>
                    <p className="text-sm text-theme-primary font-medium">{file.name}</p>
                    <p className="text-xs text-theme-tertiary">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRemoveFile}
                  disabled={uploading || processing}
                  className="text-theme-tertiary hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>
            )}
          </div>

          {/* Processing Status */}
          {(uploading || processing) && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-center gap-3">
              <Loader2 className="text-amber-400 animate-spin" size={20} />
              <div>
                <p className="text-sm text-amber-400 font-medium">
                  {uploading ? 'Uploading invoice...' : 'Processing invoice with AI...'}
                </p>
                <p className="text-xs text-amber-300/80 mt-1">
                  {uploading
                    ? 'Please wait while we upload your file'
                    : 'Extracting data and matching line items. This may take a moment.'}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-neutral-800">
            <Button
              onClick={handleUpload}
              disabled={!file || !selectedSupplier || uploading || processing}
              variant="secondary"
              className="flex-1"
            >
              {uploading || processing ? (
                <>
                  <Loader2 className="mr-2 animate-spin" size={18} />
                  {uploading ? 'Uploading...' : 'Processing...'}
                </>
              ) : (
                'Upload & Process'
              )}
            </Button>
            <Button
              onClick={handleClose}
              variant="outline"
              className="flex-1"
              disabled={uploading || processing}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}










