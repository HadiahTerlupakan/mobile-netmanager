import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockGetInfo = jest.fn<(uri: string) => Promise<{ exists: boolean }>>();
const mockReadDir = jest.fn<(uri: string) => Promise<string[]>>();
const mockDelete = jest.fn<(uri: string, opsi?: unknown) => Promise<void>>();
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///dokumen/',
  getInfoAsync: (uri: string) => mockGetInfo(uri),
  readDirectoryAsync: (uri: string) => mockReadDir(uri),
  deleteAsync: (uri: string, opsi?: unknown) => mockDelete(uri, opsi),
}));

import { isBerkasLokalAda, sweepOrphanOfflinePhotos } from '@/utils/persistPhoto';

const DIR = 'file:///dokumen/offline-photos/';
const SEKARANG = Date.UTC(2026, 8, 24, 10, 0, 0);
const DUA_JAM_LALU = SEKARANG - 2 * 60 * 60 * 1000;
const LIMA_MENIT_LALU = SEKARANG - 5 * 60 * 1000;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetInfo.mockResolvedValue({ exists: true });
  mockDelete.mockResolvedValue(undefined);
});

describe('sweepOrphanOfflinePhotos', () => {
  it('hanya menghapus berkas lama yang tidak dirujuk', async () => {
    mockReadDir.mockResolvedValue([`${DUA_JAM_LALU}_dirujuk.jpg`, `${DUA_JAM_LALU}_yatim.jpg`]);

    const jumlah = await sweepOrphanOfflinePhotos(new Set([`${DIR}${DUA_JAM_LALU}_dirujuk.jpg`]), SEKARANG);

    expect(jumlah).toBe(1);
    expect(mockDelete.mock.calls).toEqual([[`${DIR}${DUA_JAM_LALU}_yatim.jpg`, { idempotent: true }]]);
  });

  it('mencocokkan nama berkas, bukan path penuh (path dokumen bisa berganti setelah update iOS)', async () => {
    mockReadDir.mockResolvedValue([`${DUA_JAM_LALU}_dirujuk.jpg`]);

    const jumlah = await sweepOrphanOfflinePhotos(
      new Set([`file:///kontainer-lama/offline-photos/${DUA_JAM_LALU}_dirujuk.jpg`]),
      SEKARANG,
    );

    expect(jumlah).toBe(0);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('tidak menghapus berkas baru (mungkin sedang disalin sebelum masuk antrean) atau yang namanya tak berstempel waktu', async () => {
    mockReadDir.mockResolvedValue([`${LIMA_MENIT_LALU}_baru.jpg`, 'tanpa-stempel.jpg']);

    const jumlah = await sweepOrphanOfflinePhotos(new Set(), SEKARANG);

    expect(jumlah).toBe(0);
    expect(mockDelete).not.toHaveBeenCalled();
  });
});

describe('isBerkasLokalAda', () => {
  it('mengikuti hasil getInfoAsync', async () => {
    mockGetInfo.mockResolvedValueOnce({ exists: false });

    expect(await isBerkasLokalAda('file:///cache/hilang.jpg')).toBe(false);
    expect(mockGetInfo).toHaveBeenCalledWith('file:///cache/hilang.jpg');
  });

  it('menganggap ada bila pemeriksaan gagal, supaya data tidak dibuang', async () => {
    mockGetInfo.mockRejectedValueOnce(new Error('izin ditolak'));

    expect(await isBerkasLokalAda('file:///cache/a.jpg')).toBe(true);
  });
});
