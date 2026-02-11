'use client';

import { Camera, X } from '@/components/ui/icons';

interface PhotoEvidenceRendererProps {
  photos: File[];
  onAdd: (file: File) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
}

export function PhotoEvidenceRenderer({
  photos,
  onAdd,
  onRemove,
  disabled = false
}: PhotoEvidenceRendererProps) {

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate image type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      onAdd(file);
      e.target.value = ''; // Reset input
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-white mb-2">
        Photo Evidence (Optional)
      </label>

      {/* Photo Upload Button */}
      <label className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg transition-colors ${
        disabled
          ? 'border-white/[0.05] cursor-not-allowed opacity-50'
          : 'border-white/[0.1] hover:border-white/[0.2] cursor-pointer'
      }`}>
        <Camera className="w-5 h-5 text-neutral-400" />
        <span className="text-sm text-neutral-400">
          {photos.length > 0 ? `${photos.length} photo(s) selected` : 'Tap to add photo'}
        </span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          disabled={disabled}
          className="hidden"
        />
      </label>

      {/* Photo Previews */}
      {photos.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {photos.map((photo, index) => (
            <div key={index} className="relative group">
              <img
                src={URL.createObjectURL(photo)}
                alt={`Preview ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg border border-white/[0.06]"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
