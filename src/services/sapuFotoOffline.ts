/**
 * Sapu foto offline yatim saat startup: salinan di `offline-photos/` yang
 * tidak lagi dirujuk item antrean mana pun.
 */

import { DatabaseService } from '@/services/DatabaseService';
import { collectPersistedPhotoUris } from '@/services/syncQueueHelpers';
import { logger } from '@/utils/logger';
import { sweepOrphanOfflinePhotos } from '@/utils/persistPhoto';

/**
 * Hapus foto offline yang tidak dirujuk item antrean berstatus apa pun
 * (termasuk FAILED). Bila antrean gagal dibaca, tidak ada yang dihapus —
 * salah hapus berarti foto kegiatan yang belum terkirim hilang.
 */
export async function sapuFotoOfflineYatim(): Promise<number> {
  let semuaItem;
  try {
    semuaItem = await DatabaseService.getAllQueueItems();
  } catch (error) {
    logger.warn('[sapuFotoOffline] Antrean gagal dibaca; sweep dilewati:', error);
    return 0;
  }
  const dirujuk = new Set(semuaItem.flatMap((item) => collectPersistedPhotoUris(item)));
  const jumlah = await sweepOrphanOfflinePhotos(dirujuk);
  logger.info(`[sapuFotoOffline] ${jumlah} foto offline yatim dihapus`);
  return jumlah;
}
