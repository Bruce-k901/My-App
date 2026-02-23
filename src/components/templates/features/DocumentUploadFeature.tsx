'use client';

import { useState } from 'react';
import { Upload, Trash2, FileText, Link as LinkIcon, ExternalLink } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/image-compression';
import { toast } from 'sonner';

export interface TemplateDocument {
  url: string;
  fileName: string; // Friendly name (editable)
  fileType: string; // MIME type or 'link' for external URLs
  fileSize: number; // 0 for external links
}

interface DocumentUploadFeatureProps {
  uploads: TemplateDocument[];
  onChange: (items: TemplateDocument[]) => void;
  // Legacy props kept for backward compatibility
  onUpload?: (items: TemplateDocument[]) => void;
  onRemove?: (index: number) => void;
  label?: string;
  helpText?: string;
  maxFiles?: number;
  maxFileSize?: number;
  accept?: string;
}

export function DocumentUploadFeature({
  uploads,
  onChange,
  onUpload,
  onRemove,
  label = 'Files & Links',
  helpText = 'Attach documents, or link to files on OneDrive, Dropbox, Google Drive etc.',
  maxFiles = 20,
  maxFileSize = 10 * 1024 * 1024,
  accept = '*/*',
}: DocumentUploadFeatureProps) {
  const [uploading, setUploading] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');

  // Use onChange if provided, fall back to onUpload for backward compat
  const updateItems = (items: TemplateDocument[]) => {
    if (onChange) onChange(items);
    else if (onUpload) onUpload(items);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (uploads.length + files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setUploading(true);
    try {
      const newItems: TemplateDocument[] = [];

      for (const file of Array.from(files)) {
        if (file.size > maxFileSize) {
          toast.error(`${file.name} exceeds ${(maxFileSize / 1024 / 1024).toFixed(0)}MB limit`);
          continue;
        }

        const fileToUpload = await compressImage(file).catch(() => file);
        const fileExt = fileToUpload.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `task-documents/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('task-documents')
          .upload(filePath, fileToUpload, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          toast.error(`Failed to upload ${file.name}: ${uploadError.message}`);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('task-documents')
          .getPublicUrl(filePath);

        newItems.push({
          url: publicUrl,
          fileName: file.name,
          fileType: fileToUpload.type || 'application/octet-stream',
          fileSize: fileToUpload.size,
        });
      }

      if (newItems.length > 0) {
        updateItems([...uploads, ...newItems]);
        toast.success(`Uploaded ${newItems.length} file(s)`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleAddLink = () => {
    if (!linkUrl.trim()) {
      toast.error('Enter a URL');
      return;
    }

    // Basic URL validation
    let url = linkUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const friendlyName = linkName.trim() || getDomainLabel(url);

    updateItems([...uploads, {
      url,
      fileName: friendlyName,
      fileType: 'link',
      fileSize: 0,
    }]);

    setLinkUrl('');
    setLinkName('');
    setShowAddLink(false);
    toast.success('Link added');
  };

  const handleRemove = (index: number) => {
    if (onRemove) {
      onRemove(index);
    } else {
      updateItems(uploads.filter((_, i) => i !== index));
    }
  };

  const handleNameChange = (index: number, newName: string) => {
    const updated = uploads.map((item, i) =>
      i === index ? { ...item, fileName: newName } : item
    );
    updateItems(updated);
  };

  const isLink = (item: TemplateDocument) => item.fileType === 'link' || item.fileSize === 0;

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-theme-primary mb-1">
          {label}
        </label>
        {helpText && (
          <p className="text-xs text-theme-tertiary mb-2">{helpText}</p>
        )}
      </div>

      {/* Existing items */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((item, index) => (
            <div
              key={index}
              className="border border-theme rounded-lg p-2.5 bg-theme-surface/50"
            >
              <div className="flex items-start gap-2">
                {/* Icon */}
                <div className="mt-1 shrink-0">
                  {isLink(item) ? (
                    <LinkIcon className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                  ) : (
                    <FileText className="w-4 h-4 text-red-500 dark:text-red-400" />
                  )}
                </div>

                {/* Name + URL */}
                <div className="flex-1 min-w-0 space-y-1">
                  <input
                    type="text"
                    value={item.fileName}
                    onChange={(e) => handleNameChange(index, e.target.value)}
                    className="w-full px-2 py-1 text-xs font-medium bg-transparent border border-transparent hover:border-theme focus:border-[#D37E91] rounded text-theme-primary focus:outline-none transition-colors"
                    placeholder="Friendly name"
                  />
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 truncate max-w-full"
                  >
                    View attachment <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="shrink-0 p-1 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Link form */}
      {showAddLink && (
        <div className="border border-dashed border-[#D37E91]/40 rounded-lg p-3 space-y-2 bg-[#D37E91]/5">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-theme-surface border border-theme rounded-lg text-theme-primary placeholder-theme-tertiary focus:outline-none focus:border-[#D37E91]"
            placeholder="https://drive.google.com/... or https://dropbox.com/..."
            autoFocus
          />
          <input
            type="text"
            value={linkName}
            onChange={(e) => setLinkName(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-theme-surface border border-theme rounded-lg text-theme-primary placeholder-theme-tertiary focus:outline-none focus:border-[#D37E91]"
            placeholder="Friendly name (optional)"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setShowAddLink(false); setLinkUrl(''); setLinkName(''); }}
              className="px-2.5 py-1 text-xs font-medium text-theme-secondary hover:text-theme-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddLink}
              className="px-3 py-1 text-xs font-medium rounded-lg bg-[#D37E91] hover:bg-[#D37E91]/90 text-white transition-colors"
            >
              Add Link
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {uploads.length < maxFiles && !showAddLink && (
        <div className="flex items-center gap-2">
          <label className="cursor-pointer">
            <button
              type="button"
              onClick={() => document.getElementById('doc-upload-input')?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-theme text-theme-secondary hover:bg-theme-hover hover:text-theme-primary transition-colors disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              {uploading ? 'Uploading...' : 'Upload file'}
            </button>
          </label>
          <input
            id="doc-upload-input"
            type="file"
            multiple
            accept={accept}
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
          <button
            type="button"
            onClick={() => setShowAddLink(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-theme text-theme-secondary hover:bg-theme-hover hover:text-theme-primary transition-colors"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            Add link
          </button>
          {uploads.length > 0 && (
            <span className="text-[10px] text-theme-tertiary ml-auto">
              {uploads.length} / {maxFiles}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Extract a readable label from a URL domain */
function getDomainLabel(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    if (hostname.includes('google')) return 'Google Drive document';
    if (hostname.includes('dropbox')) return 'Dropbox file';
    if (hostname.includes('onedrive') || hostname.includes('sharepoint')) return 'OneDrive document';
    if (hostname.includes('youtube') || hostname.includes('youtu.be')) return 'YouTube video';
    return hostname.replace('www.', '');
  } catch {
    return 'External link';
  }
}
