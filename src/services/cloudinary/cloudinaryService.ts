/**
 * Cloudinary service for direct, secure, unsigned client-side uploads.
 * This avoids exposing any backend API secret credentials to the client.
 */

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  format: string;
  bytes: number;
}

/**
 * Uploads an image file to Cloudinary using XMLHttpRequests to enable real-time upload progress tracking.
 * 
 * @param file File object or base64 data string
 * @param onProgress Callback function receiving progress percent (0-100)
 * @param folder Optional folder path in Cloudinary
 * @returns Promise resolving to the secure CDN URL of the uploaded image
 */
export function uploadImageToCloudinary(
  file: File | string, 
  onProgress?: (progress: number) => void,
  folder?: string
): Promise<CloudinaryUploadResponse> {
  return new Promise((resolve, reject) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    // Validation: Enforce max 5MB file size
    if (file instanceof File && file.size > 5 * 1024 * 1024) {
      return reject(new Error('File size exceeds the 5MB limit. Please choose a smaller image.'));
    }

    // Validation: Enforce specific MIME formats
    if (file instanceof File) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return reject(new Error('Invalid file format. Please upload JPEG, PNG, or WebP.'));
      }
    }

    // Safe fallback for local/offline testing if Cloudinary credentials are missing
    if (!cloudName || !uploadPreset) {
      console.warn("Cloudinary configuration missing. Running simulated local upload fallback...");
      let progress = 0;
      const interval = setInterval(() => {
        progress += 25;
        if (onProgress) onProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          resolve({
            secure_url: file instanceof File ? URL.createObjectURL(file) : file,
            public_id: `mock_public_id_${Math.random().toString(36).substring(2, 7)}`,
            format: 'png',
            bytes: file instanceof File ? file.size : 1024
          });
        }
      }, 150);
      return;
    }

    const xhr = new XMLHttpRequest();
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    xhr.open('POST', url, true);

    // Track upload progress
    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve({
            secure_url: response.secure_url,
            public_id: response.public_id,
            format: response.format,
            bytes: response.bytes
          });
        } catch (e) {
          reject(new Error('Failed to parse Cloudinary response.'));
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          reject(new Error(errData.error?.message || 'Failed to upload image.'));
        } catch {
          reject(new Error(`Upload failed with status code ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error occurred during file upload. Please check your connection.'));
    };

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    if (folder) {
      formData.append('folder', folder);
    }

    xhr.send(formData);
  });
}
