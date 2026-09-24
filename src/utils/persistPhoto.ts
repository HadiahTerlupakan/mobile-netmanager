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

/**
 * Cleanup banyak photo URI sekaligus. Aman dipanggil dengan campuran
 * URI persistent dan remote — yang bukan persistent akan diabaikan.
 */
export async function cleanupOfflinePhotos(uris: readonly string[]): Promise<void> {
  await Promise.all(uris.map((uri) => cleanupOfflinePhoto(uri)));
}

/**
 * Usia minimum berkas sebelum boleh disapu. Berkas disalin dulu baru antreannya
 * ditulis (`fotoMutasi.ts` → `DatabaseService.addToQueue`); tanpa jeda ini,
 * salinan yang sedang menunggu ditulis ke antrean bisa ikut terhapus.
 */
const USIA_MINIMUM_FOTO_YATIM_MS = 60 * 60 * 1000;

const ambilNamaBerkas = (uri: string): string => uri.split('/').pop() ?? uri;

/** Stempel waktu dari nama `${Date.now()}_acak.jpg` (lihat persistPhotoForOffline). */
function bacaStempelWaktu(namaBerkas: string): number | null {
  const cocok = /^(\d+)_/.exec(namaBerkas);
  return cocok ? Number(cocok[1]) : null;
}

function isBolehDisapu(namaBerkas: string, namaDirujuk: ReadonlySet<string>, sekarangMs: number): boolean {
  if (namaDirujuk.has(namaBerkas)) return false;
  const stempel = bacaStempelWaktu(namaBerkas);
  return stempel !== null && sekarangMs - stempel >= USIA_MINIMUM_FOTO_YATIM_MS;
}

/**
 * Sweep direktori offline-photos: hapus file yang tidak lagi direferensikan
 * oleh queue. Dipanggil saat startup untuk reclaim disk dari sisa-sisa
 * crash atau cleanup yang tidak sempat berjalan.
 *
 * Pencocokan memakai nama berkas, bukan path penuh: path dokumen aplikasi iOS
 * bisa berganti setelah update. Berkas yang lebih muda dari
 * `USIA_MINIMUM_FOTO_YATIM_MS`, atau yang namanya tak berstempel waktu, tidak
 * pernah dihapus.
 */
export async function sweepOrphanOfflinePhotos(
  referencedUris: ReadonlySet<string>,
  sekarangMs: number = Date.now(),
): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(OFFLINE_PHOTOS_DIR);
    if (!info.exists) return 0;

    const namaDirujuk = new Set([...referencedUris].map(ambilNamaBerkas));
    const entries = await FileSystem.readDirectoryAsync(OFFLINE_PHOTOS_DIR);
    let deleted = 0;
    for (const entry of entries) {
      if (!isBolehDisapu(entry, namaDirujuk, sekarangMs)) continue;
      const full = `${OFFLINE_PHOTOS_DIR}${entry}`;
      try {
        await FileSystem.deleteAsync(full, { idempotent: true });
        deleted++;
      } catch (error) {
        logger.warn('[persistPhoto] sweep failed for', full, error);
      }
    }
    return deleted;
  } catch (error) {
    logger.error('[persistPhoto] sweep error:', error);
    return 0;
  }
}

/**
 * Apakah berkas lokal masih ada. Bila pemeriksaan gagal, dianggap ada —
 * pemanggil memakai `false` untuk membuang data, jadi ragu berarti simpan.
 */
export async function isBerkasLokalAda(uri: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists;
  } catch (error) {
    logger.warn('[persistPhoto] Gagal memeriksa berkas:', uri, error);
    return true;
  }
}
