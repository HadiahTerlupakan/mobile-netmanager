import { describe, expect, it } from '@jest/globals';

import { buatHasilUji, buatKepalaUji, buatSalesUji } from '../../fixtures/presurvei/penilaian';
import {
  anggotaTimKepala,
  anggotaTimSaya,
  bacaTabPenilaian,
  opsiTabPenilaian,
  petaNamaKepala,
  ringkasKepala,
  tabAktifPenilaian,
  tentukanTampilanPenilaian,
} from '@/utils/presurvei/tampilanPenilaian';

describe('tentukanTampilanPenilaian', () => {
  it('KEPALA: ada baris kepala milik pengguna, beserta baris sales-nya', () => {
    const hasil = buatHasilUji([buatKepalaUji('k-1')], [buatSalesUji('s-2', 80), buatSalesUji('k-1', 70)]);
    const tampilan = tentukanTampilanPenilaian(hasil, 'k-1');
    expect(tampilan?.jenis).toBe('KEPALA');
    expect(tampilan?.jenis === 'KEPALA' && tampilan.sales?.salesId).toBe('k-1');
  });

  it('KEPALA tanpa baris sales pribadi: sales null', () => {
    const tampilan = tentukanTampilanPenilaian(buatHasilUji([buatKepalaUji('k-1')], [buatSalesUji('s-2', 80)]), 'k-1');
    expect(tampilan).toEqual(expect.objectContaining({ jenis: 'KEPALA', sales: null }));
  });

  it('SALES: tanpa baris kepala, baris sendiri ada', () => {
    const tampilan = tentukanTampilanPenilaian(buatHasilUji([], [buatSalesUji('s-1', 80)]), 's-1');
    expect(tampilan).toEqual({ jenis: 'SALES', sales: expect.objectContaining({ salesId: 's-1' }) });
  });

  it('SALES: sesi belum termuat tetapi respons tepat satu sales', () => {
    expect(tentukanTampilanPenilaian(buatHasilUji([], [buatSalesUji('s-1', 80)]), null)?.jenis).toBe('SALES');
  });

  it('SEMUA: baris kepala orang lain dan pengguna bukan kepala', () => {
    const hasil = buatHasilUji([buatKepalaUji('k-1'), buatKepalaUji('k-2')], [buatSalesUji('s-2', 80)]);
    expect(tentukanTampilanPenilaian(hasil, 'admin')).toEqual({ jenis: 'SEMUA', kepala: hasil.kepala, sales: hasil.sales });
  });

  it('SEMUA: admin yang kebetulan tercatat sales tetap SEMUA bila ada kepala lain', () => {
    const hasil = buatHasilUji([buatKepalaUji('k-1')], [buatSalesUji('admin', 80), buatSalesUji('s-2', 60)]);
    expect(tentukanTampilanPenilaian(hasil, 'admin')?.jenis).toBe('SEMUA');
  });

  it('SEMUA: tanpa kepala tetapi banyak sales dan pengguna bukan salah satunya', () => {
    const hasil = buatHasilUji([], [buatSalesUji('s-1', 80), buatSalesUji('s-2', 60)]);
    expect(tentukanTampilanPenilaian(hasil, 'admin')?.jenis).toBe('SEMUA');
  });

  it('respons kosong → null', () => {
    expect(tentukanTampilanPenilaian(buatHasilUji([], []), 'admin')).toBeNull();
  });
});

describe('tab', () => {
  it('sales biasa tanpa tab; kepala Saya + Tim (n anggota); SEMUA Kepala sales + Semua sales', () => {
    expect(opsiTabPenilaian({ jenis: 'SALES', sales: buatSalesUji('s-1', 80) })).toEqual([]);
    expect(opsiTabPenilaian(null)).toEqual([]);
    expect(opsiTabPenilaian({ jenis: 'KEPALA', kepala: buatKepalaUji('k-1', 70, { jumlahAnggota: 12 }), sales: null })).toEqual([
      { nilai: 'SAYA', label: 'Saya' },
      { nilai: 'TIM', label: 'Tim (12)' },
    ]);
    expect(
      opsiTabPenilaian({ jenis: 'SEMUA', kepala: [buatKepalaUji('k-1'), buatKepalaUji('k-2')], sales: [buatSalesUji('s-1', 1)] }),
    ).toEqual([
      { nilai: 'KEPALA', label: 'Kepala sales (2)' },
      { nilai: 'SALES', label: 'Semua sales (1)' },
    ]);
  });

  it('tab aktif: pilihan bila tersedia, selain itu tab pertama, tanpa opsi null', () => {
    const opsi = [
      { nilai: 'SAYA' as const, label: 'Saya' },
      { nilai: 'TIM' as const, label: 'Tim' },
    ];
    expect(tabAktifPenilaian(opsi, 'TIM')).toBe('TIM');
    expect(tabAktifPenilaian(opsi, 'KEPALA')).toBe('SAYA');
    expect(tabAktifPenilaian(opsi, null)).toBe('SAYA');
    expect(tabAktifPenilaian([], 'TIM')).toBeNull();
  });

  it('param rute tab dibaca hanya bila dikenal', () => {
    expect(bacaTabPenilaian('KEPALA')).toBe('KEPALA');
    expect(bacaTabPenilaian('kepala')).toBeNull();
    expect(bacaTabPenilaian(undefined)).toBeNull();
  });
});

describe('anggota tim', () => {
  const SALES = [
    buatSalesUji('k-1', 70, { kepalaSalesId: null }),
    buatSalesUji('s-1', 80, { kepalaSalesId: 'k-1' }),
    buatSalesUji('s-2', 60, { kepalaSalesId: 'k-2' }),
  ];

  it('anggota tim sendiri tanpa dirinya', () => {
    expect(anggotaTimSaya(SALES, 'k-1').map((sales) => sales.salesId)).toEqual(['s-1', 's-2']);
  });

  it('anggota satu kepala menurut kepalaSalesId, tanpa kepala itu', () => {
    expect(anggotaTimKepala(SALES, 'k-1').map((sales) => sales.salesId)).toEqual(['s-1']);
    expect(anggotaTimKepala([buatSalesUji('k-1', 70, { kepalaSalesId: 'k-1' })], 'k-1')).toEqual([]);
  });

  it('peta nama kepala', () => {
    expect(petaNamaKepala([buatKepalaUji('k-1', 70, { nama: 'Rudi' })]).get('k-1')).toBe('Rudi');
  });
});

describe('ringkasKepala', () => {
  it('rata-rata skor terukur, sebaran predikat berurutan, dan skor terendah', () => {
    const ringkasan = ringkasKepala([
      buatKepalaUji('k-1', 90),
      buatKepalaUji('k-2', 60),
      buatKepalaUji('k-3', null),
      buatKepalaUji('k-4', 75),
    ]);
    expect(ringkasan.jumlah).toBe(4);
    expect(ringkasan.rataRataSkor).toBe(75);
    expect(ringkasan.sebaran).toEqual([
      { predikat: 'SANGAT_BAIK', jumlah: 1 },
      { predikat: 'BAIK', jumlah: 1 },
      { predikat: 'CUKUP', jumlah: 1 },
      { predikat: null, jumlah: 1 },
    ]);
    expect(ringkasan.terendah?.kepalaId).toBe('k-2');
  });

  it('skor terendah 0 tetap dipilih; semua belum terukur → rata-rata & terendah null', () => {
    expect(ringkasKepala([buatKepalaUji('k-1', 40), buatKepalaUji('k-2', 0)]).terendah?.kepalaId).toBe('k-2');
    const kosong = ringkasKepala([buatKepalaUji('k-1', null)]);
    expect(kosong.rataRataSkor).toBeNull();
    expect(kosong.terendah).toBeNull();
    expect(ringkasKepala([])).toEqual({ jumlah: 0, rataRataSkor: null, sebaran: [], terendah: null });
  });
});
