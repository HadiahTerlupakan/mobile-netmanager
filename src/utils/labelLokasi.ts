/**
 * Label lokasi yang selalu memberi tahu keadaan sebenarnya.
 *
 * Layar Lembur dulu memasang teks awal "Mencari lokasi..." lalu hanya
 * menggantinya ketika reverse-geocode mengembalikan alamat. Dua jalur lain
 * dibiarkan diam: izin yang ditolak langsung `return`, dan hasil geocode yang
 * kosong — bukan melempar, hanya array kosong — tidak masuk blok `catch`.
 * Keduanya meninggalkan label "Mencari lokasi..." selamanya, sehingga layar
 * tampak menggantung padahal koordinatnya sudah di tangan.
 */

export interface AlamatTerbalik {
  street?: string | null;
  district?: string | null;
  city?: string | null;
}

export interface KoordinatLokasi {
  latitude: number;
  longitude: number;
}

export const LABEL_IZIN_LOKASI_DITOLAK = "Izin lokasi belum diberikan";
export const LABEL_LOKASI_TIDAK_DITEMUKAN = "Lokasi tidak ditemukan";
export const LABEL_LOKASI_BELUM_DIDAPAT = "Sinyal GPS belum didapat";

/** Batas tunggu posisi; di dalam ruangan GPS bisa tidak pernah memberi fix. */
export const BATAS_TUNGGU_LOKASI_MS = 15_000;

/**
 * Jalankan `janji` dengan batas waktu; `null` bila lewat tenggat.
 *
 * `getCurrentPositionAsync` tidak punya tenggat sendiri — bila GPS tidak pernah
 * memberi fix, promise-nya menggantung selamanya dan layar berhenti di teks
 * awal "Mencari lokasi..." tanpa pernah memberi tahu apa yang terjadi.
 */
export async function denganBatasWaktu<T>(
  janji: Promise<T>,
  batasMs: number = BATAS_TUNGGU_LOKASI_MS,
): Promise<T | null> {
  let penanda: ReturnType<typeof setTimeout> | undefined;

  const tenggat = new Promise<null>((resolve) => {
    penanda = setTimeout(() => resolve(null), batasMs);
  });

  try {
    return await Promise.race([janji, tenggat]);
  } finally {
    if (penanda) clearTimeout(penanda);
  }
}

/** Koordinat sebagai label — selalu bisa ditampilkan selama posisi diketahui. */
export function labelKoordinat(koordinat: KoordinatLokasi): string {
  return `${koordinat.latitude.toFixed(6)}, ${koordinat.longitude.toFixed(6)}`;
}

/**
 * Alamat terbaca bila geocode memberi sesuatu yang berguna; selebihnya
 * koordinat. Alamat yang seluruh bagiannya kosong dianggap tidak berguna —
 * tanpa pemeriksaan itu labelnya menjadi " ," yang tidak memberi tahu apa pun.
 */
export function labelLokasi(
  alamat: AlamatTerbalik[] | null | undefined,
  koordinat: KoordinatLokasi,
): string {
  const pertama = alamat?.[0];
  if (!pertama) return labelKoordinat(koordinat);

  const jalanDanArea = [pertama.street, pertama.district]
    .filter((bagian): bagian is string => Boolean(bagian?.trim()))
    .join(" ");
  const kota = pertama.city?.trim() ?? "";

  if (jalanDanArea && kota) return `${jalanDanArea}, ${kota}`;
  if (jalanDanArea) return jalanDanArea;
  if (kota) return kota;

  return labelKoordinat(koordinat);
}
