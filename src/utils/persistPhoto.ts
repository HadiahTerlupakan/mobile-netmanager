/**
 * Utility to persist photos to a stable location for offline sync.
 *
 * Temp file URIs (from camera/gallery) may be cleaned by the OS before
 * the offline queue gets a chance to upload them. This module copies
 * photos into the app's document directory so they survive until sync.
 */

import * as FileSystem from 'expo-file-system/legacy';
import { logger } from '@/utils/logger';

const OFFLINE_PHOTOS_DIR = `${FileSystem.documentDirectory}offline-photos/`;

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(OFFLINE_PHOTOS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(OFFLINE_PHOTOS_DIR, { intermediates: true });
  }
}

/**
 * Copy a photo from a temp URI to a persistent location.
 * Returns the persistent URI, or falls back to the original on failure.
 */
export async function persistPhotoForOffline(tempUri: string): Promise<string> {
  // Already in persistent storage or a remote URL — no copy needed
  if (tempUri.startsWith(OFFLINE_PHOTOS_DIR) || tempUri.startsWith('http')) {
    return tempUri;
  }

  try {
    await ensureDir();
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
    const persistentUri = `${OFFLINE_PHOTOS_DIR}${filename}`;
    await FileSystem.copyAsync({ from: tempUri, to: persistentUri });
    return persistentUri;
  } catch (error) {
    logger.error('[persistPhoto] Failed to persist photo:', error);
    return tempUri; // Fallback to original URI
  }
}

/**
 * Remove a previously persisted offline photo after successful upload.
 */
export async function cleanupOfflinePhoto(uri: string): Promise<void> {
  if (uri.startsWith(OFFLINE_PHOTOS_DIR)) {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch (error) {
      logger.error('[persistPhoto] Failed to cleanup:', error);
    }
  }
}
