import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { SyncQueueItem } from '@/services/DatabaseService';

const mockRemoveFromQueue = jest.fn<(id: number) => Promise<void>>();
const mockMarkAsFailed = jest.fn<(id: number, alasan: string) => Promise<void>>();
jest.mock('@/services/DatabaseService', () => ({
  DatabaseService: {
    removeFromQueue: (id: number) => mockRemoveFromQueue(id),
    markAsFailed: (id: number, alasan: string) => mockMarkAsFailed(id, alasan),
  },
}));

const mockCleanup = jest.fn<(uris: readonly string[]) => Promise<void>>();
jest.mock('@/utils/persistPhoto', () => ({
  cleanupOfflinePhotos: (uris: readonly string[]) => mockCleanup(uris),
}));

jest.mock('@/utils/errorPresenter', () => ({ presentErrorMessage: jest.fn() }));
jest.mock('@/services/TelemetryService', () => ({ TelemetryService: { trackSyncResult: jest.fn() } }));
jest.mock('@/utils/logger', () => ({
  logger: { sync: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { SyncService } from '@/services/SyncService';

const FOTO = ['file:///dokumen/offline-photos/1_a.jpg'];
const PETA = { foto: 'file:///dokumen/offline-photos/1_peta.jpg' };

// Bentuk produksi: body dan meta string JSON terpisah (DatabaseService.ts:340,343).
const buatItem = (over: Partial<SyncQueueItem>): SyncQueueItem => ({
  id: 7,
  url: '/api/presurvei/kegiatan',
  method: 'POST',
  body: JSON.stringify({ jenis: 'KUNJUNGAN' }),
  status: 'RETRY',
  createdAt: new Date().toISOString(),
  meta: JSON.stringify({ photos: FOTO, photoMap: PETA, targetField: 'fotoUrls' }),
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockRemoveFromQueue.mockResolvedValue(undefined);
  mockMarkAsFailed.mockResolvedValue(undefined);
  mockCleanup.mockResolvedValue(undefined);
});

describe('SyncService.processQueueItem — foto offline', () => {
  it('item kedaluwarsa dihapus beserta salinan fotonya (item.meta kini terbaca)', async () => {
    const delapanHariLalu = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();

    await SyncService.processQueueItem(buatItem({ createdAt: delapanHariLalu }), 'token');

    expect(mockCleanup).toHaveBeenCalledWith([...FOTO, PETA.foto]);
    expect(mockRemoveFromQueue).toHaveBeenCalledWith(7);
  });

  it('item yang ditandai FAILED karena anggaran ulang habis tetap menyimpan fotonya', async () => {
    await SyncService.processQueueItem(buatItem({ retryCount: 10 }), 'token');

    expect(mockMarkAsFailed).toHaveBeenCalledWith(7, 'Retry budget exceeded');
    expect(mockCleanup).not.toHaveBeenCalled();
    expect(mockRemoveFromQueue).not.toHaveBeenCalled();
  });
});
