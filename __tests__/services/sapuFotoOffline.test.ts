import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { SyncQueueItem } from '@/services/DatabaseService';

const mockGetAllQueueItems = jest.fn<() => Promise<SyncQueueItem[]>>();
jest.mock('@/services/DatabaseService', () => ({
  DatabaseService: { getAllQueueItems: () => mockGetAllQueueItems() },
}));

const mockReadDir = jest.fn<(uri: string) => Promise<string[]>>();
const mockDelete = jest.fn<(uri: string, opsi?: unknown) => Promise<void>>();
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///dokumen/',
  getInfoAsync: async () => ({ exists: true }),
  readDirectoryAsync: (uri: string) => mockReadDir(uri),
  deleteAsync: (uri: string, opsi?: unknown) => mockDelete(uri, opsi),
}));

import { sapuFotoOfflineYatim } from '@/services/sapuFotoOffline';

const DIR = 'file:///dokumen/offline-photos/';
// Stempel jauh di masa lalu supaya lolos batas usia minimum sweep.
const LAMA = 1_700_000_000_000;

const buatItem = (status: SyncQueueItem['status'], meta: Record<string, unknown>): SyncQueueItem => ({
  id: 1,
  url: '/api/presurvei/kegiatan',
  method: 'POST',
  body: JSON.stringify({ jenis: 'KUNJUNGAN' }),
  status,
  createdAt: '2026-09-24T00:00:00.000Z',
  meta: JSON.stringify(meta),
});

beforeEach(() => {
  jest.clearAllMocks();
  mockDelete.mockResolvedValue(undefined);
  mockReadDir.mockResolvedValue([
    `${LAMA}_gagal.jpg`,
    `${LAMA}_tunda.jpg`,
    `${LAMA}_peta.jpg`,
    `${LAMA}_yatim.jpg`,
  ]);
});

describe('sapuFotoOfflineYatim', () => {
  it('melindungi foto item semua status (termasuk FAILED) dan hanya menghapus yang yatim', async () => {
    mockGetAllQueueItems.mockResolvedValue([
      buatItem('FAILED', { photos: [`${DIR}${LAMA}_gagal.jpg`] }),
      buatItem('PENDING', { photos: [`${DIR}${LAMA}_tunda.jpg`] }),
      buatItem('RETRY', { photoMap: { foto: `${DIR}${LAMA}_peta.jpg` } }),
    ]);

    const jumlah = await sapuFotoOfflineYatim();

    expect(jumlah).toBe(1);
    expect(mockDelete.mock.calls).toEqual([[`${DIR}${LAMA}_yatim.jpg`, { idempotent: true }]]);
  });

  it('tidak menghapus apa pun bila antrean gagal dibaca', async () => {
    mockGetAllQueueItems.mockRejectedValue(new Error('Database antrean tidak tersedia'));

    const jumlah = await sapuFotoOfflineYatim();

    expect(jumlah).toBe(0);
    expect(mockReadDir).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
