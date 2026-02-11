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
    <div className="border-t border-gray-200 dark:border-white/10 pt-6 space-y-3">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Photo Evidence</h2>
      <p className="text-sm text-gray-600 dark:text-white/60 mb-4">
        Upload photos as evidence for task completion
      </p>
      
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {photos.map((photo, index) => (
            <div key={index} className="relative bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
              <img 
                src={photo.url} 
                alt={photo.fileName} 
                className="w-full h-32 object-cover rounded mb-2" 
              />
              <p className="text-gray-900 dark:text-white text-xs truncate mb-2">{photo.fileName}</p>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="w-full px-3 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded text-sm transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 rounded-lg border border-gray-200 dark:border-white/[0.1] bg-gray-50 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-600 dark:text-white/60">
            No photos uploaded yet. Click the button below to upload photo evidence.
          </p>
        </div>
      )}
      
      <label className="block">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id="photo-upload"
        />
        <span className="inline-block px-4 py-2 bg-white dark:bg-white/[0.06] border border-gray-300 dark:border-white/[0.1] text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.12] hover:border-[#D37E91] dark:hover:border-white/[0.25] cursor-pointer transition-all duration-150 shadow-sm dark:shadow-[0_0_10px_rgba(211, 126, 145,0.15)] hover:shadow-md dark:hover:shadow-[0_0_14px_rgba(211, 126, 145,0.25)] font-medium">
          Upload Photo
        </span>
      </label>
    </div>
  );
}

