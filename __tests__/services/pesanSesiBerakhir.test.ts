/**
 * Sesi yang dicabut server (mis. pelanggan dibongkar/DISMANTLE) dulu hanya
 * menjatuhkan aplikasi ke layar login tanpa penjelasan. Alasan dari server
 * pada penolakan refresh 401/403 kini disimpan untuk layar login; pesan
 * teknis atau respons tanpa pesan diganti pesan bawaan.
 */

jest.mock('@/services/TokenService', () => ({
  TokenService: { setToken: jest.fn(), getToken: jest.fn(() => null), getExpiry: jest.fn(() => null) },
}));
jest.mock('@/utils/logger', () => ({
  logger: { auth: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
jest.mock('@/utils/storage', () => ({
  SecureStorage: { getItem: jest.fn(), setItemStrict: jest.fn(), removeItem: jest.fn() },
}));
jest.mock('@/services/TenantService', () => ({
  TenantService: { getTenantUrl: jest.fn(() => 'https://test.example.com') },
}));
jest.mock('@/constants/appVersion', () => ({
  CURRENT_VERSION_CODE_LABEL: '1',
  CURRENT_VERSION_NAME: '1.0.0',
  getOtaUpdateId: () => 'ota',
}));
jest.mock('react-native', () => ({ DeviceEventEmitter: { emit: jest.fn() } }));

jest.mock('axios', () => ({
  __esModule: true,
  default: { post: jest.fn() },
  isAxiosError: (e: unknown) => Boolean((e as { isAxiosError?: boolean })?.isAxiosError),
}));

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import axios from 'axios';

import { PESAN_SESI_BERAKHIR_BAWAAN, PesanSesiBerakhir } from '@/services/PesanSesiBerakhir';
import { RefreshTokenService } from '@/services/RefreshTokenService';
import { SecureStorage } from '@/utils/storage';

const mockAxiosPost = axios.post as unknown as jest.Mock<(...args: unknown[]) => Promise<unknown>>;

function tolakRefresh(status: number, data: unknown) {
  mockAxiosPost.mockRejectedValue(Object.assign(new Error(`status ${status}`), { isAxiosError: true, response: { status, data } }));
}

async function refreshLaluAkhiriSesi() {
  await expect(RefreshTokenService.refreshAccessToken()).resolves.toBeNull();
  PesanSesiBerakhir.tandaiBerakhir();
  return PesanSesiBerakhir.baca();
}

describe('pesan sesi berakhir', () => {
  beforeEach(() => {
    mockAxiosPost.mockReset();
    (SecureStorage.getItem as unknown as jest.Mock<(kunci: string) => Promise<string | null>>).mockResolvedValue('refresh-lama');
    PesanSesiBerakhir.hapus();
  });

  it.each([401, 403])('alasan server pada penolakan refresh %i ditampilkan apa adanya', async (status) => {
    const alasan = 'Layanan Anda sudah diberhentikan. Hubungi customer service.';
    tolakRefresh(status, { success: false, error: alasan, code: 'FORBIDDEN' });

    await expect(refreshLaluAkhiriSesi()).resolves.toBe(alasan);
  });

  it.each([
    ['pesan teknis token', { success: false, error: 'Refresh token tidak valid', code: 'UNAUTHORIZED' }],
    ['respons tanpa pesan', { success: false, code: 'UNAUTHORIZED' }],
    ['badan bukan JSON (halaman proxy)', '<html><body>403 Forbidden</body></html>'],
  ])('%s diganti pesan bawaan', async (_kasus, data) => {
    tolakRefresh(401, data);

    await expect(refreshLaluAkhiriSesi()).resolves.toBe(PESAN_SESI_BERAKHIR_BAWAAN);
  });

  it('sesi yang diakhiri tanpa penolakan refresh memakai pesan bawaan', () => {
    PesanSesiBerakhir.tandaiBerakhir();

    expect(PesanSesiBerakhir.baca()).toBe(PESAN_SESI_BERAKHIR_BAWAAN);
  });

  it('tanpa sesi yang diakhiri tidak ada pesan, dan pesan hilang setelah dihapus', () => {
    expect(PesanSesiBerakhir.baca()).toBeNull();

    PesanSesiBerakhir.tandaiBerakhir();
    PesanSesiBerakhir.hapus();

    expect(PesanSesiBerakhir.baca()).toBeNull();
  });
});
