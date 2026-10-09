/**
 * Apakah sebuah kegagalan berasal dari jaringan, bukan dari penolakan server.
 *
 * `SyncService.isOnline()` bersandar pada status NetInfo yang bisa basi: saat
 * sinyal baru saja hilang, ia masih menjawab "online". Formulir lalu menempuh
 * jalur online, unggahan fotonya gagal, dan pengajuannya dibuang dengan pesan
 * error — padahal antrean offline yang dirancang untuk keadaan inilah yang
 * seharusnya menampungnya. Di lapangan itu berarti teknisi kehilangan
 * pengajuan yang sudah ia isi lengkap.
 *
 * Kegagalan jaringan dibedakan dari penolakan server karena hanya yang pertama
 * yang layak diantrekan ulang; 400 atau 409 akan tetap ditolak berapa kali pun
 * dikirim ulang.
 */

const POLA_PESAN_JARINGAN = [
  /failed to connect/i,
  /network request failed/i,
  /no internet connection/i,
  /network error/i,
  /unable to resolve host/i,
  /timeout/i,
  /socket/i,
];

const KODE_JARINGAN = new Set([
  "ECONNABORTED",
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "ERR_NETWORK",
  "ETIMEDOUT",
]);

export function adalahKegagalanJaringan(error: unknown): boolean {
  if (!error) return false;

  const kandidat = error as {
    message?: unknown;
    code?: unknown;
    response?: unknown;
  };

  // Server yang menjawab — betapapun jeleknya jawabannya — bukan masalah
  // jaringan; mengantrekannya ulang hanya mengulang penolakan yang sama.
  if (kandidat.response) return false;

  if (typeof kandidat.code === "string" && KODE_JARINGAN.has(kandidat.code)) {
    return true;
  }

  const pesan =
    typeof kandidat.message === "string" ? kandidat.message : String(error);

  return POLA_PESAN_JARINGAN.some((pola) => pola.test(pesan));
}
