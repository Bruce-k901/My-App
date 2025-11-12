'use client';

interface PhotoEvidenceFeatureProps {
  photos: Array<{ url: string; fileName: string }>;
  onUpload: (file: File) => Promise<void>;
  onRemove: (index: number) => void;
}

export function PhotoEvidenceFeature({
  photos,
  onUpload,
  onRemove
}: PhotoEvidenceFeatureProps) {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onUpload(file);
      // Reset input
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-3">
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {photos.map((photo, index) => (
            <div key={index} className="relative bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
              <img 
                src={photo.url} 
                alt={photo.fileName} 
                className="w-full h-32 object-cover rounded mb-2" 
              />
              <p className="text-white text-xs truncate mb-2">{photo.fileName}</p>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="w-full px-3 py-1 text-red-400 hover:bg-red-500/10 rounded text-sm"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : null}
      
      <label className="block">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id="photo-upload"
        />
        <span className="inline-block px-4 py-2 bg-white/[0.06] border border-white/[0.1] text-white rounded-lg hover:bg-white/[0.12] hover:border-white/[0.25] cursor-pointer transition-all duration-150 shadow-[0_0_10px_rgba(236,72,153,0.15)] hover:shadow-[0_0_14px_rgba(236,72,153,0.25)]">
          Upload Photo
        </span>
      </label>
    </div>
  );
}

