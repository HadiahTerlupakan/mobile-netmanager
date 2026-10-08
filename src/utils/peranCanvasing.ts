/**
 * Pemisah antara "boleh membuka canvasing" dan "canvasing adalah pekerjaannya".
 *
 * Beranda teknisi dulu menampilkan kartu sorotan Canvasing dan Bonus canvasing
 * begitu role memegang `m_canvasing`. Role TEKNISI bawaan memegang izin itu,
 * sehingga beranda seorang teknisi terbaca separuh sales: dua kartu canvasing
 * memenuhi layar sementara pekerjaannya sendiri — work order — tergeser ke
 * bawah.
 *
 * Izin menjawab "boleh masuk?", bukan "ini pekerjaannya?". Untuk sorotan
 * beranda yang dibutuhkan pertanyaan kedua, dan jawabannya ada pada penanda
 * orangnya: `isSales`, atau wewenang mencairkan bonus canvasing.
 *
 * Yang TIDAK ikut disembunyikan: menu cepat dan tab Canvasing. Teknisi yang
 * sesekali melakukan canvasing tetap punya pintunya — hanya saja berandanya
 * tidak lagi berpura-pura ia seorang sales.
 */

interface PeranCanvasingInput {
  /** Role memegang izin canvasing (`m_canvasing`). */
  punyaIzinCanvasing: boolean;
  /** Pengguna ditandai sebagai sales di data karyawan. */
  isSales?: boolean | null;
}

/**
 * Apakah canvasing layak jadi sorotan beranda orang ini.
 *
 * `canCashoutCanvasing` sengaja TIDAK dipakai sebagai penanda, meski terdengar
 * cocok. Nilainya `isSales || punya izin m_canvasing:cashout`, dan role TEKNISI
 * bawaan menerima seluruh aksi untuk setiap resource mobile — termasuk
 * `cashout`. Akibatnya penanda itu bernilai true untuk semua teknisi dan tidak
 * membedakan siapa pun. Yang benar-benar menandai orangnya adalah `isSales`.
 */
export function canvasingAdalahPekerjaannya(
  input: PeranCanvasingInput,
): boolean {
  if (!input.punyaIzinCanvasing) return false;
  return input.isSales === true;
}
