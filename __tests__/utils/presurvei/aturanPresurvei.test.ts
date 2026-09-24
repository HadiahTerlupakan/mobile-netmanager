import { describe, expect, it } from '@jest/globals';

import kontrak from '../../fixtures/presurvei/kontrak-mobile.json';
import {
  JUMLAH_FOTO_KEGIATAN_MAKS,
  KABEL_METER_MAKS,
  KEGIATAN_HASIL,
  KEGIATAN_JENIS,
  PROSPEK_STATUSES,
  type KegiatanHasil,
  type KegiatanJenis,
  type ProspekStatus,
} from '@/constants/presurvei';
import {
  daftarJenisDitawarkan,
  daftarPilihanUbahStatus,
  getStatusLanjutan,
  isBolehJadikanCanvasing,
  isBolehProspekBaru,
  isButuhDataTeknis,
  isButuhLokasi,
  isHasilMelahirkanProspek,
  resolveAksiProspek,
} from '@/utils/presurvei/aturanPresurvei';

/**
 * Fixture disalin byte-demi-byte dari netmanager
 * `tests/fixtures/presurvei/kontrak-mobile.json`, yang dijaga
 * `tests/modules/presurvei/kontrak-mobile.test.ts` terhadap domain backend.
 * Test di sini menjaga sisi mobile terhadap salinan itu. Server tetap penentu.
 */

describe('paritas dengan kontrak backend', () => {
  it('enum sama dan berurutan sama', () => {
    expect([...KEGIATAN_JENIS]).toEqual(kontrak.kegiatanJenis);
    expect([...KEGIATAN_HASIL]).toEqual(kontrak.kegiatanHasil);
    expect([...PROSPEK_STATUSES]).toEqual(kontrak.prospekStatus);
  });

  it('tabel transisi sama untuk setiap status', () => {
    expect(Object.keys(kontrak.transisiStatus)).toEqual([...PROSPEK_STATUSES]);
    for (const status of PROSPEK_STATUSES) {
      expect(getStatusLanjutan(status)).toEqual(kontrak.transisiStatus[status]);
    }
  });

  it('tujuan yang membuka form konversi sama', () => {
    const tujuan = new Set<ProspekStatus>();
    for (const dari of PROSPEK_STATUSES) {
      for (const ke of PROSPEK_STATUSES) {
        if (resolveAksiProspek(dari, ke)?.jenis === 'buka-konversi') tujuan.add(ke);
      }
    }
    expect([...tujuan]).toEqual(kontrak.tujuanBukaKonversi);
  });

  it('aturan jenis dan hasil sama', () => {
    expect(KEGIATAN_JENIS.filter(isButuhLokasi)).toEqual(kontrak.jenisButuhLokasi);
    expect(KEGIATAN_JENIS.filter(isButuhDataTeknis)).toEqual(kontrak.jenisBerdataTeknis);
    expect(KEGIATAN_HASIL.filter(isHasilMelahirkanProspek)).toEqual(
      kontrak.hasilMelahirkanProspek,
    );
  });

  it('batas foto dan kabel sama', () => {
    expect(JUMLAH_FOTO_KEGIATAN_MAKS).toBe(kontrak.jumlahFotoMaks);
    expect(KABEL_METER_MAKS).toBe(kontrak.kabelMeterMaks);
  });
});

describe('aturan presurvei', () => {
  it('tidak menawarkan jenis Iklan', () => {
    expect(daftarJenisDitawarkan()).toEqual(['KUNJUNGAN', 'SURVEI_LOKASI', 'TELEPON', 'CHAT']);
  });

  it('mengembalikan salinan, bukan tabel modul', () => {
    const lanjutan = getStatusLanjutan('BARU');
    lanjutan.push('DEAL');

    expect(getStatusLanjutan('BARU')).toEqual(['DIHUBUNGI', 'TIDAK_MINAT']);
  });

  it('pilihan dari NEGOSIASI: Deal membuka konversi, lainnya ubah langsung', () => {
    expect(daftarPilihanUbahStatus('NEGOSIASI')).toEqual([
      { tujuan: 'DEAL', aksi: { jenis: 'buka-konversi' } },
      { tujuan: 'TIDAK_MINAT', aksi: { jenis: 'ubah-status', tujuan: 'TIDAK_MINAT' } },
      { tujuan: 'TIDAK_LAYAK', aksi: { jenis: 'ubah-status', tujuan: 'TIDAK_LAYAK' } },
    ]);
  });

  it('status final tidak menawarkan pilihan', () => {
    expect(daftarPilihanUbahStatus('DEAL')).toEqual([]);
    expect(daftarPilihanUbahStatus('TIDAK_LAYAK')).toEqual([]);
  });

  it('menolak perpindahan tak sah dan perpindahan ke dirinya sendiri', () => {
    expect(resolveAksiProspek('BARU', 'DEAL')).toBeNull();
    expect(resolveAksiProspek('BARU', 'BARU')).toBeNull();
  });

  // Tuple bertipe eksplisit (bukan `as const`): literal readonly tuple dari
  // `as const` memicu TS2345 pada overload `it.each` (parameter kontravarian
  // menolak tuple `readonly [...]` yang lebih sempit dari yang diharapkan).
  const kasusProspekBaru: Array<
    [KegiatanJenis | null, KegiatanHasil | null, string | null, boolean]
  > = [
    ['KUNJUNGAN', 'TERTARIK', null, true],
    ['SURVEI_LOKASI', 'DEAL', null, true],
    ['KUNJUNGAN', 'PERLU_FOLLOWUP', null, false],
    ['TELEPON', 'TERTARIK', null, false],
    ['KUNJUNGAN', 'TERTARIK', 'prospek-1', false],
    [null, 'TERTARIK', null, false],
    ['KUNJUNGAN', null, null, false],
  ];

  it.each(kasusProspekBaru)(
    'prospek baru untuk %s/%s dengan prospekId %s → %s',
    (jenis, hasil, prospekId, harapan) => {
      expect(isBolehProspekBaru({ jenis, hasil, prospekId })).toBe(harapan);
    },
  );

  it('jadikan canvasing hanya untuk Deal yang belum punya canvasing', () => {
    expect(isBolehJadikanCanvasing({ status: 'DEAL', canvasingId: null })).toBe(true);
    expect(isBolehJadikanCanvasing({ status: 'DEAL', canvasingId: 'cv-1' })).toBe(false);
    expect(isBolehJadikanCanvasing({ status: 'NEGOSIASI', canvasingId: null })).toBe(false);
  });
});
