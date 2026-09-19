import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { MobilePelanggan, PelangganListResponse } from '@/services/PelangganService';

const mockGet = jest.fn<(url: string, config?: unknown) => Promise<{ data: PelangganListResponse }>>();

jest.mock('@/services/api', () => ({ __esModule: true, default: { get: (u: string, c?: unknown) => mockGet(u, c) } }));

import { PelangganService } from '@/services/PelangganService';

/** Fixture lengkap 13 field sesuai DTO backend — hilang/salah nama field harus gagal di tsc. */
const pelangganFixture: MobilePelanggan = {
  id: 'plg-1',
  idPelanggan: 'PLG-0001',
  nama: 'Budi',
  username: 'budi01',
  status: 'ISOLIR',
  paket: 'Paket 20 Mbps',
  alamat: 'Jl. Merdeka No. 1',
  noTelp: '081234567890',
  jatuhTempo: '2026-09-05',
  siteId: 'site-1',
  siteName: 'POP Cileungsi',
  latitude: -6.375,
  longitude: 106.95,
};

describe('PelangganService.list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({
      data: {
        success: true,
        data: [pelangganFixture],
        meta: { page: 2, limit: 20, total: 45, totalPages: 3 },
      },
    });
  });

  it('memanggil endpoint mobile dengan parameter query yang diminta', async () => {
    await PelangganService.list({ status: 'ISOLIR', search: 'budi', page: 2, limit: 20 });

    expect(mockGet).toHaveBeenCalledWith('/api/mobile/pelanggan', {
      params: { status: 'ISOLIR', search: 'budi', page: 2, limit: 20 },
    });
  });

  it('mengembalikan data dan meta halaman', async () => {
    const page = await PelangganService.list({ page: 2, limit: 20 });

    expect(page.data).toHaveLength(1);
    expect(page.meta).toEqual({ page: 2, limit: 20, total: 45, totalPages: 3 });
  });

  it('tidak mengirim parameter kosong', async () => {
    await PelangganService.list({ search: '', page: 1, limit: 20 });

    expect(mockGet).toHaveBeenCalledWith('/api/mobile/pelanggan', {
      params: { page: 1, limit: 20 },
    });
  });
});
