import { adalahKegagalanJaringan } from '@/utils/kegagalanJaringan';

/**
 * Formulir memilih jalur online berdasarkan `SyncService.isOnline()`, yang
 * bersandar pada status NetInfo dan bisa basi. Saat tebakannya meleset,
 * kegagalan jaringan harus mengalihkan pengajuan ke antrean offline — bukan
 * membuangnya.
 */

describe('adalahKegagalanJaringan', () => {
  it('mengenali kegagalan koneksi dari okhttp', () => {
    expect(
      adalahKegagalanJaringan(new Error('Failed to connect to /10.0.2.2:3000')),
    ).toBe(true);
  });

  it('mengenali pesan jaringan yang umum', () => {
    for (const pesan of [
      'Network request failed',
      'No Internet connection',
      'Network Error',
      'Unable to resolve host "api.example.com"',
      'timeout of 15000ms exceeded',
    ]) {
      expect(adalahKegagalanJaringan(new Error(pesan))).toBe(true);
    }
  });

  it('mengenali kode kesalahan jaringan', () => {
    for (const code of ['ECONNREFUSED', 'ERR_NETWORK', 'ETIMEDOUT']) {
      expect(adalahKegagalanJaringan({ code })).toBe(true);
    }
  });

  // Server yang menjawab 400 akan tetap menjawab 400; mengantrekannya ulang
  // hanya mengulang penolakan yang sama dan menyembunyikannya dari pengguna.
  it('penolakan server bukan kegagalan jaringan', () => {
    expect(
      adalahKegagalanJaringan({
        message: 'Request failed with status code 400',
        response: { status: 400 },
      }),
    ).toBe(false);
  });

  it('kesalahan lain tidak dianggap jaringan', () => {
    expect(adalahKegagalanJaringan(new Error('Foto wajib diisi'))).toBe(false);
    expect(adalahKegagalanJaringan(null)).toBe(false);
    expect(adalahKegagalanJaringan(undefined)).toBe(false);
  });
});
