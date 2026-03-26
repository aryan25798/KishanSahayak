// src/utils/imageUtils.js

/**
 * Deeply compresses an image to WebP format for massive scale free-tier storage.
 * - Caps max dimensions to 800px.
 * - Uses WebP format.
 * - Quality set to 0.6 (60%).
 * Results in typically <50KB images, allowing 100k+ images per month on Firebase Spark plan.
 */
export const compressImage = async (file) => {
  if (!file || !file.type.startsWith('image/')) return file;
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error("Canvas is empty"));
          // Convert back to File object simulating original filename but as webp
          const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
          const newFile = new File([blob], newFileName, {
            type: 'image/webp',
            lastModified: Date.now(),
          });
          resolve(newFile);
        }, 'image/webp', 0.6); // 60% quality is perfect balance for size/quality
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};
