// ========================================================
// SWIFT EXPRESS LOGISTICS - SUPABASE STORAGE SERVICE
// Upload images to Supabase Storage and return public URLs
// ========================================================

import { dbEngine } from './supabaseClient.js';

const BUCKET_NAME = 'package-images';

/**
 * Upload a File object to Supabase Storage.
 * Returns the public URL string on success, or throws an Error.
 *
 * @param {File} file       - The file from an <input type="file">
 * @param {string} folder   - Sub-folder: 'shipments' | 'status-updates'
 * @returns {Promise<string>} public URL
 */
export async function uploadPackageImage(file, folder = 'shipments') {
  if (!file) throw new Error('No file provided.');
  if (!dbEngine.client) throw new Error('Supabase is not connected. Check your configuration.');

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload a JPEG, PNG, WEBP or GIF image.');
  }

  // Validate file size (max 5 MB)
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 5 MB.`);
  }

  // Build a unique file path: folder/timestamp-randomhex.ext
  const ext = file.name.split('.').pop() || 'jpg';
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 0xFFFF).toString(16).padStart(4, '0');
  const filePath = `${folder}/${ts}-${rand}.${ext}`;

  // Upload to Supabase Storage
  const { data, error } = await dbEngine.client.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type
    });

  if (error) {
    console.error('Supabase Storage upload error:', error.message);
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get the public URL
  const { data: urlData } = dbEngine.client.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  if (!urlData || !urlData.publicUrl) {
    throw new Error('Could not retrieve public URL after upload.');
  }

  return urlData.publicUrl;
}

/**
 * Delete an image from Supabase Storage given its public URL.
 * @param {string} publicUrl
 */
export async function deletePackageImage(publicUrl) {
  if (!publicUrl || !dbEngine.client) return;
  try {
    // Extract the file path from the public URL
    const marker = `/object/public/${BUCKET_NAME}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return;
    const filePath = decodeURIComponent(publicUrl.slice(idx + marker.length));
    await dbEngine.client.storage.from(BUCKET_NAME).remove([filePath]);
  } catch (err) {
    console.warn('Storage delete notice:', err.message);
  }
}
