import { describe, expect, it } from '@jest/globals';

import { ambilCursorBerikutnya } from '@/hooks/queries/usePengajuanBarang';
import { keadaanTahap, nadaStatusPengajuan } from '@/utils/pengajuanBarang';

const JUDUL = ['Pengajuan', 'Persetujuan', 'Pembelian', 'Verifikasi barang sampai'];

describe('keadaanTahap', () => {
  it('selesai lengkap: semua tahap selesai', () => {
    const tahap = { sekarang: 4, berhentiDi: null, total: 4, judul: JUDUL };
    expect([1, 2, 3, 4].map((nomor) => keadaanTahap(tahap, nomor, 'COMPLETE'))).toEqual([
      'selesai',
      'selesai',
      'selesai',
      'selesai',
    ]);
  });

  it('dibatalkan di tahap pembelian: berhenti di 3', () => {
    const tahap = { sekarang: null, berhentiDi: 3, total: 4, judul: JUDUL };
    expect([1, 2, 3, 4].map((nomor) => keadaanTahap(tahap, nomor, 'CANCELLED'))).toEqual([
      'selesai',
      'selesai',
      'berhenti',
      'belum',
    ]);
  });
});

describe('nadaStatusPengajuan', () => {
  it('memberi warna sesuai makna; kode baru dari server dianggap netral', () => {
    expect(nadaStatusPengajuan('COMPLETE')).toBe('berhasil');
    expect(nadaStatusPengajuan('REJECTED')).toBe('gagal');
    expect(nadaStatusPengajuan('PURCHASING')).toBe('menunggu');
    expect(nadaStatusPengajuan('KODE_BARU')).toBe('netral');
  });
});

describe('ambilCursorBerikutnya', () => {
  it('berhenti di halaman terakhir', () => {
    expect(ambilCursorBerikutnya({ data: [], nextCursor: 'pr-20' })).toBe('pr-20');
    expect(ambilCursorBerikutnya({ data: [], nextCursor: null })).toBeUndefined();
  });
});
