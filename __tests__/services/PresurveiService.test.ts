import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockGet = jest.fn<(url: string, config?: unknown) => Promise<{ data: unknown }>>();
const mockPatch = jest.fn<(url: string, body?: unknown, config?: unknown) => Promise<{ data: unknown }>>();
const mockPost = jest.fn<(url: string, body?: unknown, config?: unknown) => Promise<{ data: unknown }>>();

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: (u: string, c?: unknown) => mockGet(u, c),
    patch: (u: string, b?: unknown, c?: unknown) => mockPatch(u, b, c),
    post: (u: string, b?: unknown, c?: unknown) => mockPost(u, b, c),
  },
}));

import {
  buildJadikanCanvasingUrl,
  buildProspekUrl,
  PresurveiService,
} from '@/services/PresurveiService';

/**
 * Nama query param dicocokkan huruf demi huruf dengan route netmanager
 * (`app/api/presurvei/kegiatan/route.ts:20-31`, `prospek/route.ts:30-38`).
 * Salah satu huruf berarti 400 di setiap pembukaan layar.
 */

const META = { page: 2, limit: 20, total: 45, totalPages: 3 };

describe('PresurveiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({ data: { success: true, data: [], meta: META } });
  });

  it('daftar kegiatan memakai nama param route dan membuang yang kosong', async () => {
    await PresurveiService.daftarKegiatan({
      dariTanggal: '2026-09-23T17:00:00.000Z',
      sampaiTanggal: '2026-09-24T16:59:59.999Z',
      prospekId: undefined,
      page: 1,
      limit: 100,
    });

    expect(mockGet).toHaveBeenCalledWith('/api/presurvei/kegiatan', {
      params: {
        dariTanggal: '2026-09-23T17:00:00.000Z',
        sampaiTanggal: '2026-09-24T16:59:59.999Z',
        page: 1,
        limit: 100,
      },
    });
  });

  it('daftar prospek memakai status dan search', async () => {
    const halaman = await PresurveiService.daftarProspek({
      status: 'TERTARIK',
      search: '',
      page: 2,
      limit: 20,
    });

    expect(mockGet).toHaveBeenCalledWith('/api/presurvei/prospek', {
      params: { status: 'TERTARIK', page: 2, limit: 20 },
    });
    expect(halaman.meta).toEqual(META);
  });

  it('rincian prospek membaca data dari amplop', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: { id: 'p/1' } } });

    const rincian = await PresurveiService.rincianProspek('p/1');

    expect(mockGet).toHaveBeenCalledWith('/api/presurvei/prospek/p%2F1', undefined);
    expect(rincian).toEqual({ id: 'p/1' });
  });

  it('ringkasan memanggil endpoint mobile', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: { tanggal: '2026-09-24' } } });

    const ringkasan = await PresurveiService.ringkasan();

    expect(mockGet).toHaveBeenCalledWith('/api/mobile/presurvei/ringkasan', undefined);
    expect(ringkasan).toEqual({ tanggal: '2026-09-24' });
  });

  it('ubah status mengirim PATCH hanya berisi status', async () => {
    mockPatch.mockResolvedValue({ data: { success: true, data: { id: 'p-1', status: 'NEGOSIASI' } } });

    await PresurveiService.ubahStatusProspek('p-1', 'NEGOSIASI');

    expect(mockPatch).toHaveBeenCalledWith(
      '/api/presurvei/prospek/p-1',
      { status: 'NEGOSIASI' },
      { skipErrorToast: true },
    );
  });

  it('jadikan canvasing mengirim badan apa adanya ke URL promosi', async () => {
    // Dibekukan (amandemen Task 7, preflight G6): `muatan` dipakai sebagai
    // input sekaligus sebagai harapan `toHaveBeenCalledWith`. Tanpa freeze,
    // bila implementasi memutasi objek sebelum memanggil `api.post` (mis.
    // `delete muatan.kabel`), assertion tetap PASS karena membandingkan
    // referensi yang sama dengan dirinya sendiri setelah termutasi.
    const muatan = Object.freeze({
      noKtp: '3201234567890001',
      paket: 'Home 20 Mbps',
      kabel: 35,
      fotoKtp: 'https://cdn.test/ktp.webp',
    });
    mockPost.mockResolvedValue({ data: { success: true, data: { canvasingId: 'cv-1' } } });

    const hasil = await PresurveiService.jadikanCanvasing('p-1', muatan);

    expect(mockPost).toHaveBeenCalledWith(
      '/api/presurvei/prospek/p-1/jadikan-canvasing',
      muatan,
      { skipErrorToast: true },
    );
    expect(hasil).toEqual({ canvasingId: 'cv-1' });
  });

  it('URL prospek dan promosi dibangun dari id yang di-encode', () => {
    expect(buildProspekUrl('a b')).toBe('/api/presurvei/prospek/a%20b');
    expect(buildJadikanCanvasingUrl('a b')).toBe('/api/presurvei/prospek/a%20b/jadikan-canvasing');
  });
});
