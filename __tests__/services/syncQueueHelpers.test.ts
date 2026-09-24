import { describe, expect, it } from '@jest/globals';
import type { SyncQueueItem } from '@/services/DatabaseService';
import {
  collectPersistedPhotoUris,
  getOptimalConcurrency,
  isPermanentSyncFailure,
  prioritizeQueue,
} from '@/services/syncQueueHelpers';

const makeItem = (over: Partial<SyncQueueItem>): SyncQueueItem => ({
  id: 1,
  url: '/api/mobile/other',
  method: 'POST',
  body: '',
  status: 'PENDING',
  createdAt: '2026-01-01T00:00:00.000Z',
  meta: '',
  ...over,
});

describe('isPermanentSyncFailure', () => {
  it('menandai 400/404/409/422 sebagai permanen', () => {
    for (const s of [400, 404, 409, 422]) expect(isPermanentSyncFailure(s)).toBe(true);
  });

  it('menganggap 5xx / 408 / 429 / 2xx sebagai TIDAK permanen (boleh retry)', () => {
    for (const s of [200, 408, 429, 500, 502, 503]) expect(isPermanentSyncFailure(s)).toBe(false);
  });
});

describe('getOptimalConcurrency', () => {
  it('antrean kecil (<=3) → 2', () => {
    expect(getOptimalConcurrency(0)).toBe(2);
    expect(getOptimalConcurrency(3)).toBe(2);
  });

  it('antrean sedang (4-10) → 3', () => {
    expect(getOptimalConcurrency(4)).toBe(3);
    expect(getOptimalConcurrency(10)).toBe(3);
  });

  it('antrean besar (>10) → 4', () => {
    expect(getOptimalConcurrency(11)).toBe(4);
    expect(getOptimalConcurrency(1000)).toBe(4);
  });
});

describe('prioritizeQueue', () => {
  it('mengurutkan work-order > absensi > inventory > lainnya', () => {
    const queue = [
      makeItem({ id: 1, url: '/api/mobile/other-thing' }),
      makeItem({ id: 2, url: '/api/mobile/inventory/barang-masuk' }),
      makeItem({ id: 3, url: '/api/mobile/absensi/check-in' }),
      makeItem({ id: 4, url: '/api/mobile/work-order/complete' }),
    ];

    expect(prioritizeQueue(queue).map((i) => i.id)).toEqual([4, 3, 2, 1]);
  });

  it('prioritas sama diurutkan FIFO berdasarkan createdAt', () => {
    const queue = [
      makeItem({ id: 1, url: '/api/mobile/work-order/a', createdAt: '2026-01-02T00:00:00.000Z' }),
      makeItem({ id: 2, url: '/api/mobile/work-order/b', createdAt: '2026-01-01T00:00:00.000Z' }),
    ];

    expect(prioritizeQueue(queue).map((i) => i.id)).toEqual([2, 1]);
  });

  it('tidak memutasi array input', () => {
    const queue = [
      makeItem({ id: 1, url: '/api/mobile/other' }),
      makeItem({ id: 2, url: '/api/mobile/work-order/x' }),
    ];
    const snapshot = queue.map((i) => i.id);
    prioritizeQueue(queue);
    expect(queue.map((i) => i.id)).toEqual(snapshot);
  });
});

describe('collectPersistedPhotoUris', () => {
  it('kembalikan [] jika tidak ada meta', () => {
    expect(collectPersistedPhotoUris(makeItem({ body: '' }))).toEqual([]);
  });

  it('kumpulkan URI dari meta.photos dan meta.photoMap pada item.meta (string JSON, bentuk produksi)', () => {
    // Bentuk yang ditulis DatabaseService.addToQueue: body dan meta string JSON
    // terpisah (DatabaseService.ts:340,343). body sengaja memuat meta palsu
    // supaya pembacaan body.meta tidak lolos.
    const item = makeItem({
      body: JSON.stringify({ jenis: 'KUNJUNGAN', meta: { photos: ['file://salah.jpg'] } }),
      meta: JSON.stringify({
        photos: ['file://a.jpg', 'file://b.jpg', 123],
        photoMap: { ktp: 'file://ktp.jpg', selfie: 'file://selfie.jpg', bad: 42 },
      }),
    });

    expect(collectPersistedPhotoUris(item)).toEqual([
      'file://a.jpg',
      'file://b.jpg',
      'file://ktp.jpg',
      'file://selfie.jpg',
    ]);
  });

  it('meta JSON rusak atau bukan objek dilewati tanpa melempar', () => {
    expect(collectPersistedPhotoUris(makeItem({ meta: '{rusak' }))).toEqual([]);
    expect(collectPersistedPhotoUris(makeItem({ meta: 'null' }))).toEqual([]);
    expect(collectPersistedPhotoUris(makeItem({ meta: '"teks"' }))).toEqual([]);
  });

  it('tetap membaca bentuk lama: meta sudah berupa objek', () => {
    const item = makeItem({ meta: { photos: ['file://lama.jpg'] } as unknown as string });

    expect(collectPersistedPhotoUris(item)).toEqual(['file://lama.jpg']);
  });
});
