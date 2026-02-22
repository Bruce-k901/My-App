/**
 * Client-side image compression using Canvas API.
 * Resizes and compresses images before upload to reduce storage costs.
 *
 * Default targets ~150KB per photo (1200px max, 0.8 JPEG quality).
 * Only returns compressed version when it is actually smaller than the original.
 */

export async function compressImage(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.8
): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Always output as JPEG for photos (much smaller than PNG)
        const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const outputExt = outputType === 'image/png' ? '.png' : '.jpg';
        const outputName = file.name.replace(/\.[^.]+$/, outputExt);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            const compressed = new File([blob], outputName, {
              type: outputType,
              lastModified: Date.now(),
            });

            // Only use compressed if actually smaller
            resolve(compressed.size < file.size ? compressed : file);
          },
          outputType,
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Compress multiple image files in parallel.
 * Non-image files are returned as-is.
 */
export async function compressImages(
  files: File[],
  maxWidth?: number,
  maxHeight?: number,
  quality?: number
): Promise<File[]> {
  return Promise.all(
    files.map((f) =>
      f.type.startsWith('image/')
        ? compressImage(f, maxWidth, maxHeight, quality).catch(() => f)
        : Promise.resolve(f)
    )
  );
}
