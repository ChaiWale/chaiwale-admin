/**
 * Chaiwale Admin - High-Efficiency Client-Side WebP Compressor
 * Converts any image format (JPG, PNG, HEIC, etc.) to optimized WebP format
 * using HTML5 Canvas before uploading to Supabase Storage.
 */

export interface CompressedImageResult {
  blob: Blob;
  base64: string;
  fileName: string;
  originalSize: number;
  compressedSize: number;
  reductionPercentage: number;
  width: number;
  height: number;
}

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.0 to 1.0 (default 0.82)
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Reads any user image, scales to high-res boundary (1000px max),
 * and compresses directly to modern WebP.
 */
export async function compressAndConvertToWebP(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressedImageResult> {
  const { maxWidth = 1000, maxHeight = 1000, quality = 0.82 } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read selected image file.'));

    reader.onload = (readerEvent) => {
      const img = new Image();

      img.onerror = () => reject(new Error('Failed to decode image data. Please select a valid image.'));

      img.onload = () => {
        let { width, height } = img;

        // Maintain aspect ratio while bounding within maxWidth & maxHeight
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
          return reject(new Error('Canvas 2D context not available'));
        }

        // Draw with smooth high-quality bicubic interpolation
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP Data URL
        const webpDataUrl = canvas.toDataURL('image/webp', quality);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error('WebP blob creation failed'));
            }

            const originalName = file.name.replace(/\.[^/.]+$/, '');
            const cleanName = `${originalName.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}.webp`;
            const originalSize = file.size;
            const compressedSize = blob.size;
            const savings = Math.max(0, Math.round((1 - compressedSize / originalSize) * 100));

            resolve({
              blob,
              base64: webpDataUrl,
              fileName: cleanName,
              originalSize,
              compressedSize,
              reductionPercentage: savings,
              width,
              height
            });
          },
          'image/webp',
          quality
        );
      };

      img.src = readerEvent.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
