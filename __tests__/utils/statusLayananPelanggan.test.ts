import { describe, expect, it } from '@jest/globals';

import { statusLayananPelanggan } from '@/utils/statusLayananPelanggan';

/**
 * Turunan yang sama dengan `getServiceStatusLabel` di portal web
 * (netmanager `app/(customer)/dashboard/service-status.ts`): status pelanggan
 * lebih dulu, karena pelanggan isolir tetap online di pool isolir.
 */
const dasar = { statusPelanggan: 'AKTIF', isKoneksiSiap: true, isOnline: true, isAdaTunggakan: false };

describe('statusLayananPelanggan', () => {
  it.each([
    ['aktif dan online', {}, 'Aktif & Stabil', 'berhasil'],
    ['aktif tetapi sesi PPPoE putus', { isOnline: false }, 'Gangguan / Offline', 'gagal'],
    ['koneksi belum bisa dibaca server', { isKoneksiSiap: false, isOnline: false }, 'Status perangkat belum tersedia', 'gagal'],
    ['isolir karena tunggakan', { statusPelanggan: 'ISOLIR', isAdaTunggakan: true }, 'Diisolir – bayar tagihan', 'gagal'],
    ['isolir tanpa tunggakan (manual admin)', { statusPelanggan: 'ISOLIR' }, 'Diisolir – hubungi admin/CS', 'gagal'],
    ['nonaktif', { statusPelanggan: 'NONAKTIF' }, 'Layanan nonaktif', 'gagal'],
    ['maintenance mengikuti koneksi', { statusPelanggan: 'MAINTENANCE' }, 'Aktif & Stabil', 'berhasil'],
  ])('%s', (_kasus, ubah, label, nada) => {
    expect(statusLayananPelanggan({ ...dasar, ...ubah })).toEqual({ label, nada });
  });
});
