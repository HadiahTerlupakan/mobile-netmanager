/** Rute grup layar investor; hanya bisa dibuka akun investor (lihat useAuthRedirect). */
export const AWALAN_RUTE_INVESTOR = '/(investor)/';

/** Rute (beserta sub-rutenya) yang boleh dibuka dari tautan push notification. */
const RUTE_NOTIFIKASI_DIKENAL: readonly string[] = [
  '/dashboard',
  '/work-order',
  '/barang',
  '/absensi',
  '/profile',
  '/notifications',
  '/lembur',
  '/izin',
  '/chat',
  '/holidays',
  '/marketing/canvasing',
  // Penugasan rencana kunjungan: link `/presurvei/rencana/<id>`.
  '/presurvei',
  // Surat yang perlu saya tanda tangani: link `/pengesahan/<id>`.
  '/pengesahan',
];

/** Awalan tautan lain yang selalu sah. */
const AWALAN_NOTIFIKASI_DIKENAL: readonly string[] = ['/work-order-detail/', '/chat/', AWALAN_RUTE_INVESTOR];

/** Apakah tautan `data.url` notifikasi menuju layar yang dikenal aplikasi. */
export function isRuteNotifikasiDikenal(url: string): boolean {
  const isRuteDikenal = RUTE_NOTIFIKASI_DIKENAL.some(
    (rute) => url === rute || url.startsWith(`${rute}/`) || url.startsWith(`/(app)${rute}`),
  );
  return isRuteDikenal || AWALAN_NOTIFIKASI_DIKENAL.some((awalan) => url.startsWith(awalan));
}

/**
 * Tautan notifikasi ditulis server sebagai rute web (diperiksa agar tidak 404
 * di web); yang punya padanan layar aplikasi dipetakan ke layar itu.
 */
const PADANAN_RUTE_WEB: Readonly<Record<string, string>> = {
  '/karyawan/absensi': '/absensi',
};

/** Rute aplikasi untuk tautan `data.url` notifikasi. */
export function petakanRuteNotifikasi(url: string): string {
  return PADANAN_RUTE_WEB[url] ?? url;
}
