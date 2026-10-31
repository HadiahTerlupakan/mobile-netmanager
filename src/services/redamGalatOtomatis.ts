import NetInfo from '@react-native-community/netinfo';

import { MASA_TENANG_MS } from '@/utils/burstNotifikasi';
import { showToast } from '@/utils/errorPresenter';
import { isStatusOnline } from '@/utils/statusJaringan';

/**
 * Peredam toast galat koneksi yang muncul tanpa tindakan pengguna: data yang
 * gagal dimuat dan permintaan GET yang gagal tanpa respons atau dengan 5xx.
 *
 * Saat aplikasi dibuka offline, setiap query yang gagal dulu memunculkan
 * toastnya sendiri. Selama offline kini satu pemberitahuan menggantikan
 * semuanya; setelah tersambung kembali, toast itu tetap diredam selama masa
 * tenang, karena permintaan yang dikirim ulang saat jaringan baru pulih masih
 * bisa gagal. Galat dari tindakan pengguna (mutasi, permintaan selain GET)
 * tidak melewati peredam ini.
 */

const JUDUL_TANPA_KONEKSI = 'Tidak Ada Koneksi Internet';
const PESAN_TANPA_KONEKSI = 'Periksa koneksi Anda. Data yang tampil mungkin belum terbaru.';

let isOffline = false;
let tenangSampai = 0;
let isPemberitahuanTampil = false;

function catatStatusJaringan(isOnline: boolean): void {
  if (isOnline && isOffline) tenangSampai = Date.now() + MASA_TENANG_MS;
  // Periode offline baru: pemberitahuan boleh muncul lagi sekali.
  if (!isOnline && !isOffline) isPemberitahuanTampil = false;
  isOffline = !isOnline;
}

/** Mulai memantau jaringan untuk peredam; mengembalikan fungsi berhenti. */
export function pantauJaringanUntukGalatOtomatis(): () => void {
  return NetInfo.addEventListener((status) => catatStatusJaringan(isStatusOnline(status)));
}

/** Tampilkan toast galat koneksi otomatis kecuali saat offline atau masa tenang setelah tersambung. */
export function tampilkanGalatOtomatis(tampilkan: () => void): void {
  if (isOffline) {
    if (isPemberitahuanTampil) return;
    isPemberitahuanTampil = true;
    showToast('warning', JUDUL_TANPA_KONEKSI, PESAN_TANPA_KONEKSI);
    return;
  }
  if (Date.now() < tenangSampai) return;
  tampilkan();
}
