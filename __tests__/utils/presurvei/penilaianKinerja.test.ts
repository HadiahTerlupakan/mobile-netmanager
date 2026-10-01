import { describe, expect, it } from '@jest/globals';

import { buatSalesUji as buatSales, INDIKATOR_KEPALA_UJI as INDIKATOR_KEPALA } from '../../fixtures/presurvei/penilaian';
import {
  daftarIndikatorKepala,
  daftarIndikatorSales,
  formatSkor,
  gayaPredikat,
  indikatorTerlemah,
  labelPredikat,
  lebarBilah,
  opsiFilterPredikat,
  predikatDariNilai,
  ringkasBobot,
  saringPerPredikat,
  urutkanPerSkor,
  type BarisIndikator,
} from '@/utils/presurvei/penilaianKinerja';

describe('predikat', () => {
  it('ambang 85/70/55 sama dengan server, null tetap null', () => {
    expect([85, 84.9, 70, 69, 55, 54, 0].map(predikatDariNilai)).toEqual([
      'SANGAT_BAIK',
      'BAIK',
      'BAIK',
      'CUKUP',
      'CUKUP',
      'PERLU_PEMBINAAN',
      'PERLU_PEMBINAAN',
    ]);
    expect(predikatDariNilai(null)).toBeNull();
  });

  it('label dan warna: hijau/biru/amber/merah, null belum terukur abu-abu', () => {
    expect(labelPredikat('PERLU_PEMBINAAN')).toBe('Perlu pembinaan');
    expect(labelPredikat(null)).toBe('Belum terukur');
    expect(gayaPredikat('SANGAT_BAIK').bilah).toBe('bg-emerald-500');
    expect(gayaPredikat('BAIK').bilah).toBe('bg-blue-500');
    expect(gayaPredikat('CUKUP').bilah).toBe('bg-amber-500');
    expect(gayaPredikat('PERLU_PEMBINAAN').bilah).toBe('bg-rose-500');
    expect(gayaPredikat(null).teks).toBe('text-gray-500');
  });
});

describe('formatSkor & lebarBilah', () => {
  it('skor dibulatkan, null jadi tanda pisah', () => {
    expect(formatSkor(77.6)).toBe('78');
    expect(formatSkor(null)).toBe('–');
  });

  it('lebar bilah dijepit 0–100', () => {
    expect(lebarBilah(140)).toBe(100);
    expect(lebarBilah(-5)).toBe(0);
    expect(lebarBilah(null)).toBe(0);
    expect(lebarBilah(42)).toBe(42);
  });
});

describe('daftar indikator', () => {
  it('sales: tiga indikator berurutan dengan label Indonesia dan bobot', () => {
    expect(daftarIndikatorSales(buatSales('a', 70).indikator)).toEqual([
      { kunci: 'aktivitas', label: 'Aktivitas (kunjungan & prospek)', nilai: 80, bobot: 40 },
      { kunci: 'konversi', label: 'Konversi', nilai: 60, bobot: 30 },
      { kunci: 'realisasi', label: 'Realisasi rencana', nilai: null, bobot: 30 },
    ]);
  });

  it('kepala: lima indikator berurutan', () => {
    expect(daftarIndikatorKepala(INDIKATOR_KEPALA).map((baris) => baris.label)).toEqual([
      'Aktivitas tim',
      'Konversi tim',
      'Realisasi penugasan',
      'Cakupan pembinaan',
      'Kinerja pribadi',
    ]);
  });

  it('ringkasan bobot untuk catatan layar', () => {
    expect(ringkasBobot(daftarIndikatorSales(buatSales('a', 70).indikator))).toBe(
      'Aktivitas (kunjungan & prospek) 40% · Konversi 30% · Realisasi rencana 30%',
    );
  });
});

describe('indikatorTerlemah', () => {
  it('memilih nilai terendah dan mengabaikan yang belum terukur', () => {
    expect(indikatorTerlemah(daftarIndikatorKepala(INDIKATOR_KEPALA))?.kunci).toBe('konversiTim');
  });

  it('semua belum terukur atau daftar kosong → null', () => {
    const kosong: BarisIndikator[] = [{ kunci: 'a', label: 'A', nilai: null, bobot: 50 }];
    expect(indikatorTerlemah(kosong)).toBeNull();
    expect(indikatorTerlemah([])).toBeNull();
  });

  it('nilai 0 tetap dihitung sebagai terlemah', () => {
    const daftar: BarisIndikator[] = [
      { kunci: 'a', label: 'A', nilai: 10, bobot: 50 },
      { kunci: 'b', label: 'B', nilai: 0, bobot: 50 },
    ];
    expect(indikatorTerlemah(daftar)?.kunci).toBe('b');
  });
});

describe('urut & saring anggota', () => {
  const DAFTAR = [buatSales('c', null), buatSales('a', 60), buatSales('b', 90), buatSales('d', 72), buatSales('e', 58)];

  it('urut skor tertinggi, belum terukur di akhir, tanpa mengubah masukan', () => {
    expect(urutkanPerSkor(DAFTAR).map((sales) => sales.salesId)).toEqual(['b', 'd', 'a', 'e', 'c']);
    expect(DAFTAR[0].salesId).toBe('c');
  });

  it('saring per predikat dan belum terukur', () => {
    expect(saringPerPredikat(DAFTAR, 'SEMUA')).toHaveLength(5);
    expect(saringPerPredikat(DAFTAR, 'CUKUP').map((sales) => sales.salesId)).toEqual(['a', 'e']);
    expect(saringPerPredikat(DAFTAR, 'BELUM_TERUKUR').map((sales) => sales.salesId)).toEqual(['c']);
    expect(saringPerPredikat(DAFTAR, 'PERLU_PEMBINAAN')).toEqual([]);
  });

  it('opsi filter: Semua lalu hanya predikat yang berisi, dengan jumlah', () => {
    expect(opsiFilterPredikat(DAFTAR)).toEqual([
      { nilai: 'SEMUA', label: 'Semua (5)' },
      { nilai: 'SANGAT_BAIK', label: 'Sangat baik (1)' },
      { nilai: 'BAIK', label: 'Baik (1)' },
      { nilai: 'CUKUP', label: 'Cukup (2)' },
      { nilai: 'BELUM_TERUKUR', label: 'Belum terukur (1)' },
    ]);
  });
});
