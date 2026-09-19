import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockGet = jest.fn<(url: string, config?: unknown) => Promise<unknown>>();

jest.mock('@/services/api', () => ({ __esModule: true, default: { get: (u: string, c?: unknown) => mockGet(u, c) } }));

import { PelangganService } from '@/services/PelangganService';

describe('PelangganService.list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({
      data: {
        success: true,
        data: [{ id: 'plg-1', nama: 'Budi' }],
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
