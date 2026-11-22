import { describe, expect, it } from '@jest/globals';

import { ambilCursorBerikutnya } from '@/hooks/queries/usePengajuanBarang';
import type { BarisPengajuanBarang } from '@/types/pengajuanBarang';
import { nadaStatusPengajuan, ringkasanBarisPengajuan } from '@/utils/pengajuanBarang';

function buatBaris(overrides: Partial<BarisPengajuanBarang> = {}): BarisPengajuanBarang {
  return {
    id: 'item-1',
    nama: 'Kabel Fiber',
    satuan: 'roll',
    diminta: 10,
    satuanDiminta: 'roll',
    disetujui: null,
    dimasukkan: null,
    isDitolak: false,
    catatanAtasan: null,
    ...overrides,
  };
}

describe('nadaStatusPengajuan', () => {
  it('memberi warna sesuai makna status', () => {
    expect(nadaStatusPengajuan('AWAITING_APPROVAL')).toBe('menunggu');
    expect(nadaStatusPengajuan('APPROVED')).toBe('menunggu');
    expect(nadaStatusPengajuan('RECEIVED')).toBe('berhasil');
    expect(nadaStatusPengajuan('REJECTED')).toBe('gagal');
    expect(nadaStatusPengajuan('CANCELLED')).toBe('gagal');
  });

  it('kode lama dari cache dan kode baru dari server dianggap netral', () => {
    expect(nadaStatusPengajuan('PURCHASING')).toBe('netral');
    expect(nadaStatusPengajuan('KODE_BARU')).toBe('netral');
  });
});

describe('ringkasanBarisPengajuan', () => {
  it('belum diputuskan atasan: cukup jumlah yang diminta', () => {
    expect(ringkasanBarisPengajuan(buatBaris())).toBe('Diminta 10 roll');
  });

  it('sudah disetujui, belum dimasukkan', () => {
    expect(ringkasanBarisPengajuan(buatBaris({ disetujui: 8 }))).toBe('Diminta 10 roll · Disetujui 8 roll');
  });

  it('sudah dimasukkan, termasuk 0 untuk barang yang tidak masuk', () => {
    expect(ringkasanBarisPengajuan(buatBaris({ disetujui: 8, dimasukkan: 8 }))).toBe(
      'Diminta 10 roll · Disetujui 8 roll · Sampai 8 roll',
    );
    expect(ringkasanBarisPengajuan(buatBaris({ disetujui: 8, dimasukkan: 0 }))).toBe(
      'Diminta 10 roll · Disetujui 8 roll · Sampai 0 roll',
    );
  });

  it('data lama dari cache tanpa `dimasukkan` dianggap belum dimasukkan', () => {
    const barisDariCacheLama: BarisPengajuanBarang = {
      id: 'item-1',
      nama: 'Kabel Fiber',
      satuan: 'roll',
      diminta: 10,
      satuanDiminta: 'roll',
      disetujui: 10,
      isDitolak: false,
      catatanAtasan: null,
    };

    expect(ringkasanBarisPengajuan(barisDariCacheLama)).toBe('Diminta 10 roll · Disetujui 10 roll');
    expect(ringkasanBarisPengajuan(buatBaris({ disetujui: 10, dimasukkan: undefined }))).toBe(
      'Diminta 10 roll · Disetujui 10 roll',
    );
  });

  it('barang pengganti: jumlah disetujui dan dimasukkan memakai satuan barang yang berlaku', () => {
    const barisPengganti = buatBaris({
      diminta: 1,
      satuanDiminta: 'roll',
      satuan: 'meter',
      disetujui: 300,
      dimasukkan: 300,
    });

    expect(ringkasanBarisPengajuan(barisPengganti)).toBe('Diminta 1 roll · Disetujui 300 meter · Sampai 300 meter');
  });

  it('barang ditolak cukup ditandai ditolak', () => {
    const barisDitolak = buatBaris({
      diminta: 5,
      satuanDiminta: 'pcs',
      isDitolak: true,
      catatanAtasan: 'Stok masih ada',
    });

    expect(ringkasanBarisPengajuan(barisDitolak)).toBe('Diminta 5 pcs · Ditolak');
  });

  it('tanpa satuan: angkanya saja', () => {
    expect(ringkasanBarisPengajuan(buatBaris({ satuan: '', satuanDiminta: '' }))).toBe('Diminta 10');
    expect(ringkasanBarisPengajuan(buatBaris({ satuan: '', satuanDiminta: '', disetujui: 8, dimasukkan: 8 }))).toBe(
      'Diminta 10 · Disetujui 8 · Sampai 8',
    );
  });
});

describe('ambilCursorBerikutnya', () => {
  it('berhenti di halaman terakhir', () => {
    expect(ambilCursorBerikutnya({ data: [], nextCursor: 'pr-20' })).toBe('pr-20');
    expect(ambilCursorBerikutnya({ data: [], nextCursor: null })).toBeUndefined();
  });
});
