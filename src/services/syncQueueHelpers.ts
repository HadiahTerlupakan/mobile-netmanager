import type { SyncQueueItem } from './DatabaseService';

/**
 * Helper murni untuk antrean sync (prioritas, konkurensi, cleanup photo,
 * klasifikasi kegagalan). Dipisah dari SyncService agar teruji tanpa
 * side-effect jaringan/queue.
 */

// HTTP status yang dianggap kegagalan permanen (tidak layak retry).
const PERMANENT_SYNC_FAILURE_STATUSES = new Set([400, 404, 409, 422]);

// Prioritas proses: Work orders > Attendance > Inventory > Others.
const PRIORITY_MAP: Record<string, number> = {
  'work-order': 1,
  'check-in': 2,
  'check-out': 2,
  'absensi': 2,
  'barang-masuk': 3,
  'barang-keluar': 3,
  'inventory': 3,
  'default': 4,
};

// Ambang ukuran antrean untuk memilih tingkat konkurensi.
const SMALL_QUEUE_MAX = 3;
const MEDIUM_QUEUE_MAX = 10;
const SMALL_QUEUE_CONCURRENCY = 2;
const MEDIUM_QUEUE_CONCURRENCY = 3;
const LARGE_QUEUE_CONCURRENCY = 4;

/** Apakah status HTTP menandakan kegagalan permanen (jangan di-retry). */
export const isPermanentSyncFailure = (status: number): boolean =>
  PERMANENT_SYNC_FAILURE_STATUSES.has(status);

type MetaFotoAntrean = { photos?: unknown; photoMap?: unknown };

/**
 * Baca `item.meta` sebagai objek. Di produksi berupa string JSON terpisah dari
 * body (`DatabaseService.ts:340,343`); objek (bentuk lama) diterima apa adanya.
 * JSON rusak atau bukan objek → `null`, tanpa melempar.
 */
function bacaMetaAntrean(meta: unknown): MetaFotoAntrean | null {
  let nilai = meta;
  if (typeof meta === 'string') {
    try {
      nilai = JSON.parse(meta);
    } catch {
      return null;
    }
  }
  return nilai && typeof nilai === 'object' && !Array.isArray(nilai) ? (nilai as MetaFotoAntrean) : null;
}

const ambilString = (nilai: unknown): string[] =>
  (Array.isArray(nilai) ? nilai : []).filter((v): v is string => typeof v === 'string');

/**
 * Kumpulkan semua URI photo yang sudah dipersist offline pada queue item,
 * sehingga bisa di-cleanup setelah sync (sukses / permanent failure / TTL)
 * dan dilindungi dari sweep yatim.
 */
export function collectPersistedPhotoUris(item: SyncQueueItem): string[] {
  const meta = bacaMetaAntrean(item.meta);
  if (!meta) return [];

  const petaFoto = meta.photoMap && typeof meta.photoMap === 'object' ? Object.values(meta.photoMap) : [];
  return [...ambilString(meta.photos), ...ambilString(petaFoto)];
}

/**
 * Urutkan antrean berdasarkan prioritas endpoint, lalu FIFO (createdAt) untuk
 * prioritas yang sama. Tidak memutasi input.
 */
export const prioritizeQueue = (queue: SyncQueueItem[]): SyncQueueItem[] => {
  const getPriority = (url: string) => {
    for (const [key, priority] of Object.entries(PRIORITY_MAP)) {
      if (url.includes(key)) return priority;
    }
    return PRIORITY_MAP.default;
  };

  return [...queue].sort((a, b) => {
    const priorityA = getPriority(a.url);
    const priorityB = getPriority(b.url);

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Same priority: sort by created date (FIFO)
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
};

/** Tentukan konkurensi optimal berdasarkan ukuran antrean. */
export const getOptimalConcurrency = (queueSize: number): number => {
  if (queueSize <= SMALL_QUEUE_MAX) return SMALL_QUEUE_CONCURRENCY;
  if (queueSize <= MEDIUM_QUEUE_MAX) return MEDIUM_QUEUE_CONCURRENCY;
  return LARGE_QUEUE_CONCURRENCY;
};
