/**
 * Pembaca respons API portal pelanggan.
 *
 * Endpointnya membungkus muatan di `data` (`apiSuccess`), tetapi ketiga
 * pembaca invoice — Beranda, Tagihan, dan Riwayat — membacanya dari akar
 * (`res.data.invoices`) sehingga SELALU `undefined`. Akibatnya daftar tagihan
 * selalu kosong dan Beranda menyatakan "Tagihan Lunas / Rp 0" kepada
 * pelanggan yang sebenarnya menunggak. Pembaca profil & koneksi sudah memakai
 * pola bertahan `data?.x || x`; penolong ini menyeragamkannya agar bentuk
 * respons hanya diurus di satu tempat.
 */
export function ambilMuatan<T>(responsBody: unknown, kunci: string): T | undefined {
  if (responsBody === null || typeof responsBody !== 'object') return undefined;
  const akar = responsBody as Record<string, unknown>;
  const terbungkus = akar.data;
  if (terbungkus !== null && typeof terbungkus === 'object') {
    const nilai = (terbungkus as Record<string, unknown>)[kunci];
    if (nilai !== undefined) return nilai as T;
  }
  return akar[kunci] as T | undefined;
}
