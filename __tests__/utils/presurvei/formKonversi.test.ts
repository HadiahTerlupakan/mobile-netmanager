import { describe, expect, it } from '@jest/globals';

import {
  keMuatanKonversi,
  NILAI_FORM_KONVERSI_KOSONG,
  PESAN_FORM_KONVERSI,
  validasiFormKonversi,
} from '@/utils/presurvei/formKonversi';

const SAH = { noKtp: '3201234567890001', paket: 'Home 20 Mbps', kabel: '' };

describe('validasiFormKonversi', () => {
  it('form kosong menuntut KTP, paket, dan foto KTP', () => {
    expect(validasiFormKonversi(NILAI_FORM_KONVERSI_KOSONG, null)).toEqual({
      noKtp: PESAN_FORM_KONVERSI.noKtp,
      paket: PESAN_FORM_KONVERSI.paket,
      fotoKtp: PESAN_FORM_KONVERSI.fotoKtp,
    });
  });

  it.each([
    ['320123456789000', PESAN_FORM_KONVERSI.noKtp],
    ['3201234567890001', undefined],
    ['32012345678900012345', undefined],
    ['320123456789000123456', PESAN_FORM_KONVERSI.noKtp],
  ])('nomor KTP "%s" → %s', (noKtp, harapan) => {
    expect(validasiFormKonversi({ ...SAH, noKtp }, 'file:///ktp.jpg').noKtp).toBe(harapan);
  });

  it.each([
    ['', undefined],
    ['1', undefined],
    ['5000', undefined],
    ['0', PESAN_FORM_KONVERSI.kabel],
    ['5001', PESAN_FORM_KONVERSI.kabel],
    ['2.5', PESAN_FORM_KONVERSI.kabel],
  ])('kabel "%s" → %s', (kabel, harapan) => {
    expect(validasiFormKonversi({ ...SAH, kabel }, 'file:///ktp.jpg').kabel).toBe(harapan);
  });
});

describe('keMuatanKonversi', () => {
  it('kabel kosong tidak dikirim supaya server memakai estimasi survei', () => {
    const muatan = keMuatanKonversi({ ...SAH, noKtp: ' 3201234567890001 ' }, 'https://cdn.test/ktp.webp');

    expect(muatan).toEqual({
      noKtp: '3201234567890001',
      paket: 'Home 20 Mbps',
      fotoKtp: 'https://cdn.test/ktp.webp',
    });
    expect('kabel' in muatan).toBe(false);
  });

  it('kabel terisi dikirim sebagai angka', () => {
    expect(keMuatanKonversi({ ...SAH, kabel: '35' }, 'https://cdn.test/ktp.webp').kabel).toBe(35);
  });
});
