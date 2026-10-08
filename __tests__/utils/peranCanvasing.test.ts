import { canvasingAdalahPekerjaannya } from '@/utils/peranCanvasing';

/**
 * Beranda teknisi sempat terbaca separuh sales: dua kartu canvasing memenuhi
 * layar sementara work order — pekerjaannya sendiri — tergeser ke bawah.
 * Penyebabnya kartu itu hanya memeriksa izin, padahal role TEKNISI bawaan
 * memang memegang `m_canvasing`.
 *
 * Yang dijaga di sini: izin saja TIDAK cukup untuk menjadikan canvasing sorotan
 * beranda, dan sebaliknya penanda sales tanpa izin juga tidak memunculkannya.
 */

describe('canvasingAdalahPekerjaannya', () => {
  it('teknisi biasa: punya izin tapi bukan sales → tidak disorot', () => {
    expect(
      canvasingAdalahPekerjaannya({ punyaIzinCanvasing: true, isSales: false }),
    ).toBe(false);
  });

  it('sales: izin plus penanda sales → disorot', () => {
    expect(
      canvasingAdalahPekerjaannya({ punyaIzinCanvasing: true, isSales: true }),
    ).toBe(true);
  });

  // Izin tetap syarat pertama: tanpa pintunya, sorotan tidak masuk akal.
  it('tanpa izin canvasing tidak pernah disorot, walau ditandai sales', () => {
    expect(
      canvasingAdalahPekerjaannya({ punyaIzinCanvasing: false, isSales: true }),
    ).toBe(false);
  });

  it('penanda yang belum dimuat (undefined/null) diperlakukan sebagai bukan sales', () => {
    expect(canvasingAdalahPekerjaannya({ punyaIzinCanvasing: true })).toBe(false);
    expect(
      canvasingAdalahPekerjaannya({ punyaIzinCanvasing: true, isSales: null }),
    ).toBe(false);
  });
});
