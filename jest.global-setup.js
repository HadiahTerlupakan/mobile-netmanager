/**
 * Patok zona waktu sebelum jest membuat environment tes.
 *
 * Logika absensi — shift lintas hari, sesi menginap, jendela check-in —
 * seluruhnya dinyatakan dalam waktu lokal Indonesia. Tanpa ini tes hanya lolos
 * di mesin yang kebetulan disetel Asia/Jakarta, dan gagal di runner CI yang
 * berjalan pada UTC. `setupFiles` terlalu lambat: environment tes sudah
 * terbentuk sebelum berkas itu dijalankan.
 */
module.exports = async () => {
  process.env.TZ = 'Asia/Jakarta';
};
