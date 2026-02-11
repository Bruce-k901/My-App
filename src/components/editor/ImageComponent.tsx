import React, { useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { Upload, X, Image as ImageIcon } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';

interface ImageComponentProps {
  node: {
    attrs: {
      src: string | null;
      caption: string;
      alt: string;
    };
  };
  updateAttributes: (attrs: Partial<ImageComponentProps['node']['attrs']>) => void;
}

export default function ImageComponent({ node, updateAttributes }: ImageComponentProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const fileName = `sop_image_${timestamp}.${fileExtension}`;
      const filePath = `images/${fileName}`;

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
        src: urlData.publicUrl,
        alt: file.name.split('.')[0] // Use filename without extension as alt text
      });

    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    updateAttributes({ src: null, caption: "", alt: "" });
  };

  const handleCaptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateAttributes({ caption: e.target.value });
  };

  const handleAltChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateAttributes({ alt: e.target.value });
  };

  return (
    <NodeViewWrapper 
      className="sop-block my-4"
      data-type="imageBlock"
    >
      <div className="relative rounded-lg border border-magenta-500/20 bg-white/5 backdrop-blur-sm p-4">
        {node.attrs.src ? (
          <div className="space-y-3">
            {/* Image Preview */}
            <div className="relative group">
              <img
                src={node.attrs.src}
                alt={node.attrs.alt || 'SOP Image'}
                className="w-full max-h-64 object-cover rounded-md"
                onError={() => setUploadError('Failed to load image')}
              />
              
              {/* Remove Button */}
              <button
                onClick={handleRemove}
                className="absolute top-2 right-2 p-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove image"
              >
                <X size={14} />
              </button>
            </div>

            {/* Caption Input */}
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Add caption..."
                value={node.attrs.caption}
                onChange={handleCaptionChange}
                className="w-full bg-transparent border border-neutral-600 rounded px-2 py-1 text-sm text-white placeholder-neutral-400 focus:border-magenta-400 focus:outline-none"
              />
              
              {/* Alt Text Input */}
              <input
                type="text"
                placeholder="Alt text for accessibility..."
                value={node.attrs.alt}
                onChange={handleAltChange}
                className="w-full bg-transparent border border-neutral-600 rounded px-2 py-1 text-xs text-neutral-300 placeholder-neutral-500 focus:border-magenta-400 focus:outline-none"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Upload Area */}
            <div className="border-2 border-dashed border-magenta-500/30 rounded-lg p-6 text-center hover:border-magenta-500/50 transition-colors">
              <ImageIcon size={32} className="mx-auto text-magenta-400 mb-2" />
              <p className="text-sm text-neutral-300 mb-3">
                Upload an image for visual reference
              </p>
              
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-magenta-600 hover:bg-magenta-700 text-white rounded-lg cursor-pointer transition-colors">
                <Upload size={16} />
                {isUploading ? 'Uploading...' : 'Choose Image'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
              
              <p className="text-xs text-neutral-500 mt-2">
                PNG, JPG, GIF up to 5MB
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
