import React, { useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { Upload, FileText, Download, X, File, FileImage, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AttachmentComponentProps {
  node: {
    attrs: {
      fileName: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
    };
  };
  updateAttributes: (attrs: Partial<AttachmentComponentProps['node']['attrs']>) => void;
}

export default function AttachmentComponent({ node, updateAttributes }: AttachmentComponentProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/msword', // .doc
      'application/vnd.ms-excel', // .xls
      'text/plain', // .txt
      'application/vnd.openxmlformats-officedocument.presentationml.presentation' // .pptx
    ];

    if (!allowedTypes.includes(file.type)) {
      setUploadError('Please select a PDF, Word, Excel, PowerPoint, or text file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const fileName = `sop_attachment_${timestamp}.${fileExtension}`;
      const filePath = `attachments/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('sop_uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('sop_uploads')
        .getPublicUrl(filePath);

      // Update the node attributes
      updateAttributes({
        fileName: file.name,
        fileUrl: urlData.publicUrl,
        fileType: file.type,
        fileSize: file.size
      });

    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    updateAttributes({ fileName: "", fileUrl: "", fileType: "", fileSize: 0 });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileText className="text-red-400" size={20} />;
    if (fileType.includes('word') || fileType.includes('document')) return <FileText className="text-blue-400" size={20} />;
    if (fileType.includes('sheet') || fileType.includes('excel')) return <FileSpreadsheet className="text-green-400" size={20} />;
    if (fileType.includes('image')) return <FileImage className="text-purple-400" size={20} />;
    return <File className="text-neutral-400" size={20} />;
  };

  return (
    <NodeViewWrapper 
      className="sop-block my-4"
      data-type="attachmentBlock"
    >
      <div className="relative rounded-lg border border-magenta-500/20 bg-white/5 backdrop-blur-sm p-4">
        {node.attrs.fileUrl ? (
          <div className="space-y-3">
            {/* File Preview */}
            <div className="flex items-center justify-between p-3 bg-neutral-800/50 rounded-lg group">
              <div className="flex items-center gap-3">
                {getFileIcon(node.attrs.fileType)}
                <div>
                  <p className="text-sm text-white font-medium">{node.attrs.fileName}</p>
                  <p className="text-xs text-neutral-400">{formatFileSize(node.attrs.fileSize)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <a
                  href={node.attrs.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 bg-magenta-600/20 hover:bg-magenta-600/40 text-magenta-400 rounded transition-colors"
                  title="Download file"
                >
                  <Download size={16} />
                </a>
                
                <button
                  onClick={handleRemove}
                  className="p-1 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove attachment"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Upload Area */}
            <div className="border-2 border-dashed border-magenta-500/30 rounded-lg p-6 text-center hover:border-magenta-500/50 transition-colors">
              <FileText size={32} className="mx-auto text-magenta-400 mb-2" />
              <p className="text-sm text-neutral-300 mb-3">
                Upload a document attachment
              </p>
              
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-magenta-600 hover:bg-magenta-700 text-white rounded-lg cursor-pointer transition-colors">
                <Upload size={16} />
                {isUploading ? 'Uploading...' : 'Choose File'}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                  onChange={handleUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
              
              <p className="text-xs text-neutral-500 mt-2">
                PDF, Word, Excel, PowerPoint, TXT up to 10MB
              </p>
            </div>

            {/* Error Message */}
            {uploadError && (
              <div className="text-red-400 text-sm text-center bg-red-500/10 rounded p-2">
                {uploadError}
              </div>
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
