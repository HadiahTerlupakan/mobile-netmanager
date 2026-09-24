const JAM_TERAKHIR = 23;
const MENIT_TERAKHIR = 59;
const DETIK_TERAKHIR = 59;
const MILIDETIK_TERAKHIR = 999;

/** Rentang tanggal dalam ISO UTC, bentuk yang diterima `daftarKegiatanSchema`. */
export interface RentangTanggalIso {
  dariTanggal: string;
  sampaiTanggal: string;
}

/** Awal dan akhir hari LOKAL perangkat yang memuat `tanggal`, sebagai ISO UTC. */
export function rentangHariLokal(tanggal: Date): RentangTanggalIso {
  const tahun = tanggal.getFullYear();
  const bulan = tanggal.getMonth();
  const hari = tanggal.getDate();
  return {
    dariTanggal: new Date(tahun, bulan, hari).toISOString(),
    sampaiTanggal: new Date(
      tahun, bulan, hari, JAM_TERAKHIR, MENIT_TERAKHIR, DETIK_TERAKHIR, MILIDETIK_TERAKHIR,
    ).toISOString(),
  };
}

/** Awal hari lokal yang digeser `jumlahHari` hari kalender (negatif = mundur). */
export function geserHari(tanggal: Date, jumlahHari: number): Date {
  return new Date(tanggal.getFullYear(), tanggal.getMonth(), tanggal.getDate() + jumlahHari);
}

/** Apakah `waktuIso` jatuh di dalam rentang, inklusif di kedua ujung. */
export function isDalamRentang(waktuIso: string, rentang: RentangTanggalIso): boolean {
  const waktu = Date.parse(waktuIso);
  return waktu >= Date.parse(rentang.dariTanggal) && waktu <= Date.parse(rentang.sampaiTanggal);
}
