import { describe, expect, it } from '@jest/globals';

import { PESAN_ISIAN_PROSPEK, teksAtauNull, validasiIsianProspek } from '@/utils/presurvei/isianProspek';

const SAH = { nama: 'Budi', noTelp: '081234567890', alamat: 'Jl. Kenanga 1', paketDiminati: '' };

describe('validasiIsianProspek', () => {
  it('isian sah tidak punya kesalahan', () => {
    expect(validasiIsianProspek(SAH)).toEqual({});
  });

  it('isian wajib yang kosong (termasuk hanya spasi) meminta diisi', () => {
    expect(validasiIsianProspek({ ...SAH, nama: '  ', noTelp: '', alamat: ' ' })).toEqual({
      nama: PESAN_ISIAN_PROSPEK.namaKosong,
      noTelp: PESAN_ISIAN_PROSPEK.telpKosong,
      alamat: PESAN_ISIAN_PROSPEK.alamatKosong,
    });
  });

  it('isian terlalu pendek diberi pesan pendek (batas server: nama 2, HP 8, alamat 5)', () => {
    expect(validasiIsianProspek({ ...SAH, nama: 'A', noTelp: '0812345', alamat: 'Jl 1' })).toEqual({
      nama: PESAN_ISIAN_PROSPEK.namaPendek,
      noTelp: PESAN_ISIAN_PROSPEK.telpPendek,
      alamat: PESAN_ISIAN_PROSPEK.alamatPendek,
    });
    expect(validasiIsianProspek({ ...SAH, nama: 'Al', noTelp: '08123456', alamat: 'Jl. 1' })).toEqual({});
  });

  it('isian melewati batas server ditolak', () => {
    expect(
      validasiIsianProspek({
        nama: 'a'.repeat(121),
        noTelp: '0'.repeat(21),
        alamat: 'a'.repeat(501),
        paketDiminati: 'a'.repeat(121),
      }),
    ).toEqual({
      nama: PESAN_ISIAN_PROSPEK.terlaluPanjang,
      noTelp: PESAN_ISIAN_PROSPEK.telpPanjang,
      alamat: PESAN_ISIAN_PROSPEK.terlaluPanjang,
      paketDiminati: PESAN_ISIAN_PROSPEK.terlaluPanjang,
    });
  });

  it('nomor HP berspasi atau bertanda hubung diterima selama 8–20 karakter (server tanpa regex)', () => {
    expect(validasiIsianProspek({ ...SAH, noTelp: '0812 3456 7890' })).toEqual({});
    expect(validasiIsianProspek({ ...SAH, noTelp: '0812-3456-789' })).toEqual({});
  });
});

describe('teksAtauNull', () => {
  it('memangkas spasi dan mengubah kosong menjadi null', () => {
    expect(teksAtauNull('  20 Mbps ')).toBe('20 Mbps');
    expect(teksAtauNull('   ')).toBeNull();
  });
});
