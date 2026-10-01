import { LABEL_HASIL_KEGIATAN, type KegiatanHasil, type KegiatanJenis } from '@/constants/presurvei';

/**
 * Hasil kegiatan yang relevan per jenis kegiatan, disalin dari netmanager
 * `modules/presurvei/domain/hasil-kegiatan.ts`. Nilai hasil dipakai bersama
 * semua jenis, tetapi pilihan dan labelnya disesuaikan jenisnya.
 *
 * Hanya untuk tampilan form: kombinasi lama (mis. survei lokasi "Tertarik")
 * tetap sah di server, jadi antrean offline lama tidak ditolak di klien.
 */

/** Pilihan hasil per jenis kegiatan, dalam urutan tampil. */
export const HASIL_PER_JENIS: Record<KegiatanJenis, readonly KegiatanHasil[]> = {
  KUNJUNGAN: ['TERTARIK', 'DEAL', 'PERLU_FOLLOWUP', 'TIDAK_MINAT', 'TIDAK_ADA_ORANG'],
  SURVEI_LOKASI: ['BISA_DIPASANG', 'TIDAK_BISA_DIPASANG', 'PERLU_FOLLOWUP', 'TIDAK_ADA_ORANG'],
  TELEPON: ['TERTARIK', 'DEAL', 'PERLU_FOLLOWUP', 'TIDAK_MINAT', 'TIDAK_ADA_ORANG'],
  CHAT: ['TERTARIK', 'DEAL', 'PERLU_FOLLOWUP', 'TIDAK_MINAT', 'TIDAK_ADA_ORANG'],
  IKLAN: ['TERTARIK', 'DEAL', 'PERLU_FOLLOWUP', 'TIDAK_MINAT', 'TIDAK_ADA_ORANG'],
};

/** Label yang lebih tepat untuk jenis tertentu; selebihnya label umum. */
const LABEL_HASIL_KHUSUS: Partial<Record<KegiatanJenis, Partial<Record<KegiatanHasil, string>>>> = {
  KUNJUNGAN: {
    DEAL: 'Setuju pasang',
    PERLU_FOLLOWUP: 'Masih pikir-pikir',
    TIDAK_ADA_ORANG: 'Tidak ketemu orangnya',
  },
  SURVEI_LOKASI: {
    PERLU_FOLLOWUP: 'Perlu dicek ulang',
    TIDAK_ADA_ORANG: 'Tidak ketemu orangnya',
  },
  TELEPON: {
    DEAL: 'Setuju pasang',
    PERLU_FOLLOWUP: 'Minta ditelepon lagi',
    TIDAK_ADA_ORANG: 'Tidak diangkat / nomor tidak aktif',
  },
  CHAT: {
    DEAL: 'Setuju pasang',
    PERLU_FOLLOWUP: 'Masih tanya-tanya',
    TIDAK_ADA_ORANG: 'Belum dibalas',
  },
};

/** Pertanyaan singkat di bawah judul "Hasil" agar sales tahu apa yang dipilih. */
const PERTANYAAN_HASIL: Partial<Record<KegiatanJenis, string>> = {
  KUNJUNGAN: 'Bagaimana tanggapan orangnya?',
  SURVEI_LOKASI: 'Bisa dipasang di lokasi ini?',
  TELEPON: 'Bagaimana hasil teleponnya?',
  CHAT: 'Bagaimana balasan chatnya?',
};

/** Label hasil menurut jenis kegiatannya, mis. TIDAK_ADA_ORANG pada telepon = "Tidak diangkat…". */
export function labelHasilKegiatan(hasil: KegiatanHasil, jenis: KegiatanJenis): string {
  return LABEL_HASIL_KHUSUS[jenis]?.[hasil] ?? LABEL_HASIL_KEGIATAN[hasil];
}

/** Pilihan hasil untuk form, berurutan dan berlabel sesuai jenis. */
export function daftarOpsiHasil(jenis: KegiatanJenis): { nilai: KegiatanHasil; label: string }[] {
  return HASIL_PER_JENIS[jenis].map((hasil) => ({ nilai: hasil, label: labelHasilKegiatan(hasil, jenis) }));
}

/** Pertanyaan pemandu bagian Hasil, atau null bila jenis tidak punya. */
export function pertanyaanHasil(jenis: KegiatanJenis): string | null {
  return PERTANYAAN_HASIL[jenis] ?? null;
}

/** Hasil tetap dipakai bila ada di pilihan jenis; selain itu dikosongkan agar sales memilih ulang. */
export function hasilTetapUntukJenis(hasil: KegiatanHasil | null, jenis: KegiatanJenis | null): KegiatanHasil | null {
  if (hasil === null || jenis === null) return hasil;
  return HASIL_PER_JENIS[jenis].includes(hasil) ? hasil : null;
}
