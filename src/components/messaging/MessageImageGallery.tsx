"use client";

import { useState } from 'react';
import { X, Download } from 'lucide-react';

interface ImageMessage {
  id: string;
  file_url: string;
  file_name: string;
  created_at: string;
  sender_name?: string;
  sender?: {
    full_name?: string;
    email?: string;
  };
}

interface MessageImageGalleryProps {
  images: ImageMessage[];
}

export default function MessageImageGallery({ images }: MessageImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const selectedImageData = selectedImage ? images.find(img => img.file_url === selectedImage) : null;

  const handleDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: just open in new tab
      window.open(url, '_blank');
    }
  };

  return (
    <>
      {/* Image Grid - Thumbnail sizing */}
      <div className="h-full overflow-y-auto">
        <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-2 p-4">
          {images.map((image) => {
            const senderName = image.sender_name || image.sender?.full_name || image.sender?.email?.split('@')[0] || 'Unknown';
            
            return (
              <div
                key={image.id}
                className="aspect-square relative group cursor-pointer overflow-hidden rounded-lg bg-gray-800"
                onClick={() => window.open(image.file_url, '_blank')}
              >
                <img
                  src={image.file_url}
                  alt={image.file_name || 'Image'}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  loading="lazy"
                />
                
                {/* Optional: Show sender name on hover */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 opacity-0 group-hover:opacity-100 transition-opacity truncate">
                  {senderName}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage && selectedImageData && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl z-10 p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
          
          <img
            src={selectedImage}
            alt={selectedImageData.file_name || 'Full size'}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          
          <a
            href={selectedImage}
            download={selectedImageData.file_name || 'image'}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-4 right-4 px-4 py-2 bg-transparent text-[#EC4899] border border-[#EC4899] rounded-lg hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all duration-200 ease-in-out flex items-center gap-2"
            onClick={(e) => {
              e.stopPropagation();
              handleDownload(selectedImage, selectedImageData.file_name || 'image');
            }}
          >
            <Download className="w-4 h-4" />
            Download
          </a>
        </div>
      )}
    </>
  );
}

