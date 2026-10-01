import { LocaleConfig } from 'react-native-calendars';

/** Kode lokal kalender berbahasa Indonesia. */
export const LOKAL_KALENDER_ID = 'id';

/**
 * Nama bulan & hari berbahasa Indonesia untuk `react-native-calendars`.
 * Bawaan pustaka berbahasa Inggris (Sun, Mon, …) — membingungkan pengguna
 * yang tidak terbiasa bahasa Inggris.
 */
export function pasangKalenderIndonesia(): void {
  LocaleConfig.locales[LOKAL_KALENDER_ID] = {
    monthNames: [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ],
    monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
    dayNames: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
    dayNamesShort: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
    today: 'Hari ini',
  };
  LocaleConfig.defaultLocale = LOKAL_KALENDER_ID;
}
