import type { AttendanceUiStatus } from '@/utils/attendanceStatus';

/**
 * Pencocokan ulang antara notifikasi pelacakan dan keadaan absen sebenarnya.
 *
 * Notifikasi foreground service Android bertahan selama layanan lokasi hidup,
 * termasuk ketika aplikasi ditutup. Satu-satunya JS yang berjalan saat itu
 * adalah task background, sehingga perintah berhenti dari server baru sampai
 * pada tick lokasi berikutnya — dan tick itu bergantung pada gerakan serta
 * `deferredUpdatesInterval`. Kalau HP diam di rumah sesudah check-out, tick-nya
 * bisa tidak pernah datang dan notifikasinya menetap berjam-jam.
 *
 * Karena itu keadaan dicocokkan ulang setiap aplikasi dibuka: begitu ada JS
 * yang berjalan, pelacakan yang tidak lagi beralasan langsung dimatikan.
 */

/** Status absen yang membolehkan pelacakan berjalan. */
const STATUS_BOLEH_MELACAK: readonly AttendanceUiStatus[] = ['checked-in'];

interface KeadaanRekonsiliasi {
    /** Layanan lokasi sedang hidup (notifikasi tampil). */
    sedangMelacak: boolean;
    /** Status absen dari server; `null` bila belum diketahui. */
    statusAbsen: AttendanceUiStatus | null;
}

/**
 * Apakah pelacakan harus dihentikan sekarang.
 *
 * Sengaja hanya berhenti saat status absen DIKETAHUI dan bukan check-in.
 * Status `null` berarti belum terbaca — offline, galat jaringan, atau query
 * belum selesai — dan menghentikan pelacakan karenanya akan memutus perekaman
 * sah seorang karyawan yang justru sedang bekerja di daerah bersinyal buruk.
 */
export function harusHentikanTracking(keadaan: KeadaanRekonsiliasi): boolean {
    if (!keadaan.sedangMelacak) return false;
    if (keadaan.statusAbsen === null) return false;
    return !STATUS_BOLEH_MELACAK.includes(keadaan.statusAbsen);
}
