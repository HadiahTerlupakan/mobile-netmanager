import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockGet = jest.fn<(url: string, config?: unknown) => Promise<{ data: { data: unknown } }>>();
const mockPost = jest.fn<(url: string, body?: unknown) => Promise<{ data: { data: unknown } }>>();
jest.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: (u: string, c?: unknown) => mockGet(u, c), post: (u: string, b?: unknown) => mockPost(u, b) },
}));
jest.mock('@/services/TenantService', () => ({ TenantService: { getTenantUrl: () => 'https://tenant.test/' } }));
jest.mock('@/services/TokenService', () => ({ TokenService: { getToken: () => 'token-abc' } }));
const mockRefresh = jest.fn<() => Promise<string | null>>();
jest.mock('@/services/RefreshTokenService', () => ({ RefreshTokenService: { refreshAccessToken: () => mockRefresh() } }));

const mockDownload = jest.fn<(url: string, tujuan: string, opsi: unknown) => Promise<{ status: number; uri: string }>>();
const mockDelete = jest.fn<(uri: string, opsi: unknown) => Promise<void>>(async () => undefined);
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  downloadAsync: (u: string, t: string, o: unknown) => mockDownload(u, t, o),
  deleteAsync: (u: string, o: unknown) => mockDelete(u, o),
}));

import { PESAN_DOKUMEN_GAGAL_DIUNDUH, PengesahanService } from '@/services/PengesahanService';

const balasan = (isi: unknown) => ({ data: { data: isi } });

describe('PengesahanService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ringkasan & daftar memanggil endpoint mobile dengan status/halaman', async () => {
    mockGet.mockResolvedValueOnce(balasan({ menungguCount: 1, totalCount: 2 }));
    await expect(PengesahanService.ringkasan()).resolves.toEqual({ menungguCount: 1, totalCount: 2 });
    expect(mockGet).toHaveBeenLastCalledWith('/api/mobile/pengesahan/ringkasan', undefined);

    mockGet.mockResolvedValueOnce(balasan({ items: [], total: 0, page: 2, limit: 20 }));
    await PengesahanService.daftar({ status: 'SELESAI', page: 2, limit: 20 });
    expect(mockGet).toHaveBeenLastCalledWith('/api/mobile/pengesahan', { params: { status: 'SELESAI', page: 2, limit: 20 } });
  });

  it('detail mengambil satu surat', async () => {
    mockGet.mockResolvedValueOnce(balasan({ id: 'd-1' }));
    await expect(PengesahanService.detail('d-1')).resolves.toEqual({ id: 'd-1' });
    expect(mockGet).toHaveBeenLastCalledWith('/api/mobile/pengesahan/d-1', undefined);
  });

  it('tanda tangan & tolak mengirim body sesuai kontrak', async () => {
    mockPost.mockResolvedValueOnce(balasan({ completed: true }));
    await expect(PengesahanService.tandaTangan('d-1', 'data:image/png;base64,AA')).resolves.toEqual({ completed: true });
    expect(mockPost).toHaveBeenLastCalledWith('/api/mobile/pengesahan/d-1/sign', { signatureDataUrl: 'data:image/png;base64,AA' });

    mockPost.mockResolvedValueOnce(balasan({ declined: true }));
    await PengesahanService.tolak('d-1', 'Data keliru');
    expect(mockPost).toHaveBeenLastCalledWith('/api/mobile/pengesahan/d-1/decline', { reason: 'Data keliru' });
  });

  it('unduhDokumen memakai URL tenant + Bearer token dan menyimpan ke cache', async () => {
    mockDownload.mockResolvedValueOnce({ status: 200, uri: 'file:///cache/pengesahan-d-1.pdf' });

    await expect(PengesahanService.unduhDokumen('d-1')).resolves.toBe('file:///cache/pengesahan-d-1.pdf');
    expect(mockDownload).toHaveBeenCalledWith('https://tenant.test/api/mobile/pengesahan/d-1/file', 'file:///cache/pengesahan-d-1.pdf', {
      headers: { Authorization: 'Bearer token-abc', Accept: 'application/pdf' },
    });
  });

  it('unduhDokumen gagal (bukan 200): berkas sisa dihapus dan galat ramah dilempar', async () => {
    mockDownload.mockResolvedValueOnce({ status: 404, uri: 'file:///cache/pengesahan-d-1.pdf' });

    await expect(PengesahanService.unduhDokumen('d-1')).rejects.toThrow(PESAN_DOKUMEN_GAGAL_DIUNDUH);
    expect(mockDelete).toHaveBeenCalledWith('file:///cache/pengesahan-d-1.pdf', { idempotent: true });
  });

  // Unduhan tidak lewat interceptor axios: token kedaluwarsa harus disegarkan
  // sendiri, kalau tidak "Lihat dokumen" gagal setiap token habis.
  it('unduhDokumen menyegarkan token lalu mengulang sekali saat 401', async () => {
    mockDownload.mockResolvedValueOnce({ status: 401, uri: '' }).mockResolvedValueOnce({ status: 200, uri: '' });
    mockRefresh.mockResolvedValueOnce('token-baru');

    await expect(PengesahanService.unduhDokumen('d-1')).resolves.toBe('file:///cache/pengesahan-d-1.pdf');
    expect(mockDownload).toHaveBeenLastCalledWith(expect.any(String), expect.any(String), {
      headers: { Authorization: 'Bearer token-baru', Accept: 'application/pdf' },
    });
  });

  it('unduhDokumen gagal ramah bila token tidak bisa disegarkan', async () => {
    mockDownload.mockResolvedValueOnce({ status: 401, uri: '' });
    mockRefresh.mockResolvedValueOnce(null);

    await expect(PengesahanService.unduhDokumen('d-1')).rejects.toThrow(PESAN_DOKUMEN_GAGAL_DIUNDUH);
    expect(mockDownload).toHaveBeenCalledTimes(1);
  });
});
