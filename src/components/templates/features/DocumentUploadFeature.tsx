'use client';

import { useState } from 'react';
import { Upload, X, FileText, File, Trash2 } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/image-compression';
import { toast } from 'sonner';

interface DocumentUpload {
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

interface DocumentUploadFeatureProps {
  uploads: DocumentUpload[];
  onUpload: (uploads: DocumentUpload[]) => void;
  onRemove: (index: number) => void;
  label?: string;
  helpText?: string;
  accept?: string; // MIME types or file extensions (e.g., "application/pdf,image/*")
  maxFiles?: number;
  maxFileSize?: number; // in bytes
}

export function DocumentUploadFeature({
  uploads,
  onUpload,
  onRemove,
  label = 'Upload Documents',
  helpText = 'Upload supporting documents, certificates, or files',
  accept = '*/*',
  maxFiles = 10,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
}: DocumentUploadFeatureProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check file count
    if (uploads.length + files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setUploading(true);

    try {
      const newUploads: DocumentUpload[] = [];

      for (const file of Array.from(files)) {
        // Check file size
        if (file.size > maxFileSize) {
          toast.error(`${file.name} exceeds maximum file size of ${(maxFileSize / 1024 / 1024).toFixed(0)}MB`);
          continue;
        }

        // Compress images before upload (non-image files pass through unchanged)
        const fileToUpload = await compressImage(file).catch(() => file);

        // Generate unique file path
        const fileExt = fileToUpload.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `task-documents/${fileName}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('task-documents')
          .upload(filePath, fileToUpload, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Failed to upload ${file.name}: ${uploadError.message}`);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('task-documents')
          .getPublicUrl(filePath);

        newUploads.push({
          url: publicUrl,
          fileName: file.name,
          fileType: fileToUpload.type || 'application/octet-stream',
          fileSize: fileToUpload.size,
        });
      }

      // Add new uploads to existing ones
      onUpload([...uploads, ...newUploads]);
      
      if (newUploads.length > 0) {
        toast.success(`Successfully uploaded ${newUploads.length} file(s)`);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <FileText className="w-4 h-4" />;
    if (fileType === 'application/pdf') return <File className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-1">
          {label}
        </label>
        {helpText && (
          <p className="text-xs text-theme-secondary mb-2">{helpText}</p>
        )}
      </div>

      {/* File Upload Button */}
      <div className="flex items-center gap-2">
        <label htmlFor="document-upload" className="cursor-pointer">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading || uploads.length >= maxFiles}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Upload Documents'}
          </Button>
        </label>
        <input
          id="document-upload"
          type="file"
          multiple
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading || uploads.length >= maxFiles}
        />
        {uploads.length > 0 && (
          <span className="text-xs text-theme-secondary">
            {uploads.length} / {maxFiles} files
          </span>
        )}
      </div>

      {/* Uploaded Files List */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((upload, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-theme-surface/50 rounded border border-theme"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="text-theme-secondary">
                  {getFileIcon(upload.fileType)}
                </div>
                <div className="flex-1 min-w-0">
                  <a
                    href={upload.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 truncate block"
                    title={upload.fileName}
                  >
                    {upload.fileName}
                  </a>
                  <p className="text-xs text-theme-tertiary">
                    {formatFileSize(upload.fileSize)}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemove(index)}
                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

