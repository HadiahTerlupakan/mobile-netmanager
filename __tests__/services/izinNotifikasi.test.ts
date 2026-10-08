import { beforeEach, describe, expect, it, jest } from '@jest/globals';

/**
 * Sebelum modul ini ada, `POST_NOTIFICATIONS` tidak pernah diminta sama sekali:
 * `syncFCMTokenToBackend` sengaja tidak memunculkan dialog dan menitipkannya ke
 * "onboarding screen" yang tidak pernah dibuat. Push ke teknisi karena itu tidak
 * pernah sampai — tanpa error, tanpa gejala di layar.
 */

const mockHasUserPermission = jest.fn<() => Promise<boolean>>();
const mockRequestUserPermission = jest.fn<() => Promise<boolean>>();
const mockSyncToken = jest.fn<(action: 'add' | 'remove') => Promise<string | null>>();

const mockSimpanan = new Map<string, string>();

jest.mock('@/services/FirebaseMessagingService', () => ({
  fcmService: {
    hasUserPermission: mockHasUserPermission,
    requestUserPermission: mockRequestUserPermission,
    syncFCMTokenToBackend: mockSyncToken,
  },
}));

jest.mock('@/utils/storage', () => ({
  Storage: {
    getItem: jest.fn(async (kunci: string) => mockSimpanan.get(kunci) ?? null),
    setItem: jest.fn(async (kunci: string, nilai: string) => {
      mockSimpanan.set(kunci, nilai);
    }),
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// `require` setelah mock, bukan `import`: babel mengangkat import ke atas file,
// sehingga factory jest.mock akan berjalan sebelum `mockHasUserPermission` dkk
// terisi dan modulnya menerima `undefined`.
let aktifkanNotifikasi: typeof import('@/services/izinNotifikasi').aktifkanNotifikasi;
let catatIzinNotifikasiSudahDitanya: typeof import('@/services/izinNotifikasi').catatIzinNotifikasiSudahDitanya;
let perluTanyaIzinNotifikasi: typeof import('@/services/izinNotifikasi').perluTanyaIzinNotifikasi;

beforeEach(() => {
  mockSimpanan.clear();
  jest.clearAllMocks();
  mockSyncToken.mockResolvedValue('token-fcm');
  ({ aktifkanNotifikasi, catatIzinNotifikasiSudahDitanya, perluTanyaIzinNotifikasi } =
    require('@/services/izinNotifikasi'));
});

describe('gerbang pre-prompt izin notifikasi', () => {
  it('bertanya saat izin belum diberikan dan belum pernah ditanya', async () => {
    mockHasUserPermission.mockResolvedValue(false);

    await expect(perluTanyaIzinNotifikasi()).resolves.toBe(true);
  });

  it('tidak bertanya saat izin sudah diberikan', async () => {
    mockHasUserPermission.mockResolvedValue(true);

    await expect(perluTanyaIzinNotifikasi()).resolves.toBe(false);
  });

  // Dialog OS tidak muncul lagi setelah ditolak, jadi bertanya ulang setiap
  // aplikasi dibuka hanya memindahkan gangguan tanpa mengubah hasilnya.
  it('tidak bertanya lagi setelah pengguna menjawab', async () => {
    mockHasUserPermission.mockResolvedValue(false);
    await catatIzinNotifikasiSudahDitanya();

    await expect(perluTanyaIzinNotifikasi()).resolves.toBe(false);
  });
});

describe('aktivasi notifikasi', () => {
  it('mendaftarkan token FCM setelah izin diberikan', async () => {
    mockRequestUserPermission.mockResolvedValue(true);

    await expect(aktifkanNotifikasi()).resolves.toBe(true);
    expect(mockSyncToken).toHaveBeenCalledWith('add');
  });

  // Tanpa izin, pendaftaran token berhenti di gerbangnya sendiri; memanggilnya
  // tetap hanya menghasilkan satu baris peringatan yang menyesatkan.
  it('tidak mendaftarkan token saat izin ditolak', async () => {
    mockRequestUserPermission.mockResolvedValue(false);

    await expect(aktifkanNotifikasi()).resolves.toBe(false);
    expect(mockSyncToken).not.toHaveBeenCalled();
  });
});
