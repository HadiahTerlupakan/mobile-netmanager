import { jumlahBertanda } from '@/utils/tandaJumlah';

/**
 * Tanda dulu ditempel sebagai teks, sehingga nol ikut bertanda dan layar
 * Barang menampilkan "-0". Itu terbaca seperti nilai negatif, padahal artinya
 * "belum ada barang keluar hari ini".
 */
describe('jumlahBertanda', () => {
  it('nol tidak pernah bertanda', () => {
    expect(jumlahBertanda(0, '-')).toBe('0');
    expect(jumlahBertanda(0, '+')).toBe('0');
  });

  it('kosong atau belum dimuat dihitung nol', () => {
    expect(jumlahBertanda(undefined, '-')).toBe('0');
    expect(jumlahBertanda(null, '+')).toBe('0');
  });

  it('nilai bergerak memakai tandanya', () => {
    expect(jumlahBertanda(3, '+')).toBe('+3');
    expect(jumlahBertanda(7, '-')).toBe('-7');
  });

  // Data cacat tidak boleh menghasilkan "--5" atau "+NaN" di layar.
  it('nilai negatif dan tak terbaca tetap rapi', () => {
    expect(jumlahBertanda(-5, '-')).toBe('-5');
    expect(jumlahBertanda(Number.NaN, '+')).toBe('0');
  });
});
