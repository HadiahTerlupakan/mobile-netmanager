import { formatDate } from '@/utils/date';
import { duaDigit } from './rencana';

/**
 * Teks & pilihan tanggal/jam di form rencana. Ditulis untuk pengguna yang
 * kurang terbiasa membaca aplikasi: satu makna per tombol, tanggal selalu
 * lengkap dengan nama hari, tanpa singkatan.
 */

/** Tombol pilihan tanggal. */
export type PilihanTanggal = 'HARI_INI' | 'BESOK' | 'LAIN';

/** Tombol pilihan jam. */
export type PilihanJam = 'TANPA_JAM' | 'PAKAI_JAM';

/** Format tanggal lengkap, mis. "Sabtu, 26 September 2026". */
const FORMAT_TANGGAL_LENGKAP = 'EEEE, d MMMM yyyy';

/** Tombol mana yang menyala untuk tanggal terpilih. */
export function tentukanPilihanTanggal(tanggal: string, hariIni: string, besok: string): PilihanTanggal {
  if (tanggal === hariIni) return 'HARI_INI';
  if (tanggal === besok) return 'BESOK';
  return 'LAIN';
}

/** Tanggal lengkap untuk kotak ringkasan, mis. "Sabtu, 26 September 2026". */
export function teksTanggalLengkap(tanggal: string): string {
  return formatDate(tanggal, FORMAT_TANGGAL_LENGKAP);
}

/** Tombol mana yang menyala untuk jam terpilih ('' = tanpa jam). */
export function tentukanPilihanJam(jam: string): PilihanJam {
  return jam === '' ? 'TANPA_JAM' : 'PAKAI_JAM';
}

/** "09:30" → "09.30" (penulisan jam yang lazim di Indonesia), untuk tombol dan ringkasan. */
export function tulisJamTampil(jam: string): string {
  return jam.replace(':', '.');
}

/** Label tombol jam: "Pilih jam", atau jam terpilih supaya tombolnya menunjukkan isinya. */
export function labelTombolJam(jam: string): string {
  return jam === '' ? 'Pilih jam' : `Pukul ${tulisJamTampil(jam)}`;
}

/** Ringkasan jam di bawah tombol: arti pilihan saat ini dan cara menggantinya. */
export function teksJamRingkas(jam: string): string {
  return jam === '' ? 'Tidak pakai jam — boleh datang kapan saja di hari itu' : `Datang pukul ${tulisJamTampil(jam)}. Ketuk tombol jam untuk mengganti.`;
}

/** Kelompok jam di pemilih jam: judul bagian + daftar jam "HH:mm". */
export interface KelompokJam {
  judul: string;
  daftarJam: string[];
}

/** Jarak antarpilihan jam, dalam menit. */
const JARAK_SLOT_MENIT = 30;
const MENIT_PER_JAM = 60;

/** Rentang jam kerja lapangan per bagian hari: [jam awal, jam akhir terakhir yang ditawarkan]. */
const BAGIAN_HARI: readonly { judul: string; dari: number; sampai: number }[] = [
  { judul: 'Pagi', dari: 7, sampai: 10 },
  { judul: 'Siang', dari: 11, sampai: 14 },
  { judul: 'Sore', dari: 15, sampai: 17 },
  { judul: 'Malam', dari: 18, sampai: 21 },
];

/**
 * Pilihan jam siap ketuk, dikelompokkan Pagi/Siang/Sore/Malam dengan jarak
 * 30 menit — pengganti jam analog Android yang sulit dipahami.
 */
export function daftarKelompokJam(): KelompokJam[] {
  return BAGIAN_HARI.map(({ judul, dari, sampai }) => {
    const daftarJam: string[] = [];
    for (let jam = dari; jam <= sampai; jam += 1) {
      for (let menit = 0; menit < MENIT_PER_JAM; menit += JARAK_SLOT_MENIT) {
        daftarJam.push(`${duaDigit(jam)}:${duaDigit(menit)}`);
      }
    }
    return { judul, daftarJam };
  });
}
