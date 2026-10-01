import {
  LABEL_JENIS_PROSPEK,
  PANJANG_PERAN_PROSPEK_MAKS,
  type ProspekJenis,
} from '@/constants/presurvei';

/**
 * Aturan jenis prospek (calon pelanggan / perantara) dan peran perantara.
 * Meniru netmanager `prospek-rules.ts` (`isPeranProspekSah`,
 * `tentukanPeranProspek`) dan `prospek.validator.ts` (peran maks 120).
 * Hanya untuk UX; server tetap penentu.
 */

export const JENIS_PROSPEK_BAWAAN: ProspekJenis = 'CALON_PELANGGAN';
const JENIS_PERANTARA: ProspekJenis = 'PERANTARA';
const PEMISAH_LENCANA = ' · ';

/** Satu pilihan "Orang ini siapa?" dengan keterangan kecil di bawah labelnya. */
export interface OpsiJenisProspek {
  nilai: ProspekJenis;
  label: string;
  keterangan: string;
}

/** Pilihan "Orang ini siapa?" dalam urutan tampil. */
export const OPSI_JENIS_PROSPEK: readonly OpsiJenisProspek[] = [
  { nilai: 'CALON_PELANGGAN', label: LABEL_JENIS_PROSPEK.CALON_PELANGGAN, keterangan: 'Mau pasang internet' },
  { nilai: 'PERANTARA', label: LABEL_JENIS_PROSPEK.PERANTARA, keterangan: 'Bisa membawa pelanggan: ketua RT, tokoh, dll.' },
];

/** Apakah jenis ini perantara (bukan calon pemasang). */
export function isPerantara(jenis: ProspekJenis): boolean {
  return jenis === JENIS_PERANTARA;
}

/** Pilihan "Perannya apa?". LAINNYA berarti peran ditulis sendiri. */
export type PilihanPeran = 'KETUA_RT_RW' | 'KEPALA_DESA' | 'TOKOH_MASYARAKAT' | 'PEMILIK_USAHA' | 'LAINNYA';

const PILIHAN_PERAN_LAINNYA: PilihanPeran = 'LAINNYA';

/** Pilihan peran dalam urutan tampil; labelnya ikut tersimpan sebagai awal teks peran. */
export const OPSI_PERAN_PERANTARA: readonly { nilai: PilihanPeran; label: string }[] = [
  { nilai: 'KETUA_RT_RW', label: 'Ketua RT/RW' },
  { nilai: 'KEPALA_DESA', label: 'Kepala desa/lurah' },
  { nilai: 'TOKOH_MASYARAKAT', label: 'Tokoh masyarakat' },
  { nilai: 'PEMILIK_USAHA', label: 'Pemilik warung/usaha' },
  { nilai: PILIHAN_PERAN_LAINNYA, label: 'Lainnya' },
];

/** Apakah peran harus ditulis sendiri (keterangan menjadi wajib). */
export function isPeranDitulisSendiri(pilihan: PilihanPeran | null): boolean {
  return pilihan === PILIHAN_PERAN_LAINNYA;
}

/** Label peran baku, atau '' untuk "Lainnya" (perannya adalah keterangan itu sendiri). */
function labelPeranBaku(pilihan: PilihanPeran): string {
  if (isPeranDitulisSendiri(pilihan)) return '';
  return OPSI_PERAN_PERANTARA.find((opsi) => opsi.nilai === pilihan)?.label ?? '';
}

/** Tambahan panjang untuk " (" + ")" di sekitar keterangan. */
const PANJANG_KURUNG_KETERANGAN = 3;

/**
 * Batas ketik keterangan supaya teks peran gabungan tidak melewati batas
 * server: label baku + " (" + keterangan + ")" ≤ 120 huruf.
 */
export function batasKeteranganPeran(pilihan: PilihanPeran | null): number {
  if (pilihan === null || isPeranDitulisSendiri(pilihan)) return PANJANG_PERAN_PROSPEK_MAKS;
  return PANJANG_PERAN_PROSPEK_MAKS - labelPeranBaku(pilihan).length - PANJANG_KURUNG_KETERANGAN;
}

/**
 * Teks `peran` yang dikirim ke server:
 * - peran baku tanpa keterangan → "Ketua RT/RW"
 * - peran baku + keterangan     → "Ketua RT/RW (RT 03 Kel. Melati)"
 * - Lainnya                     → keterangannya saja, mis. "Ketua karang taruna"
 * Belum memilih → ''.
 */
export function gabungPeran(pilihan: PilihanPeran | null, keterangan: string): string {
  if (pilihan === null) return '';
  const tambahan = keterangan.trim().replace(/\s+/g, ' ');
  const label = labelPeranBaku(pilihan);
  if (label === '') return tambahan;
  return tambahan === '' ? label : `${label} (${tambahan})`;
}

export const PESAN_PERAN = {
  belumDipilih: 'Pilih perannya dulu',
  lainnyaKosong: 'Tulis perannya. Contoh: Ketua karang taruna',
  terlaluPanjang: 'Keterangan terlalu panjang. Persingkat sedikit',
} as const;

export interface KesalahanPeran {
  peranPilihan?: string;
  peranKeterangan?: string;
}

/**
 * Kesalahan isian peran perantara, meniru `isPeranProspekSah` + batas
 * panjang server. Calon pelanggan tidak punya peran, jadi selalu sah.
 */
export function validasiPeran(jenis: ProspekJenis, pilihan: PilihanPeran | null, keterangan: string): KesalahanPeran {
  if (!isPerantara(jenis)) return {};
  if (pilihan === null) return { peranPilihan: PESAN_PERAN.belumDipilih };
  const peran = gabungPeran(pilihan, keterangan);
  if (peran === '') return { peranKeterangan: PESAN_PERAN.lainnyaKosong };
  if (peran.length > PANJANG_PERAN_PROSPEK_MAKS) return { peranKeterangan: PESAN_PERAN.terlaluPanjang };
  return {};
}

/**
 * Teks lencana untuk perantara, mis. "Perantara · Ketua RT 03", atau null
 * untuk calon pelanggan (tanpa lencana — itu jenis bawaan).
 */
export function teksLencanaJenisProspek(prospek: { jenis: ProspekJenis; peran: string | null }): string | null {
  if (!isPerantara(prospek.jenis)) return null;
  const peran = prospek.peran?.trim() ?? '';
  return peran === '' ? LABEL_JENIS_PROSPEK.PERANTARA : `${LABEL_JENIS_PROSPEK.PERANTARA}${PEMISAH_LENCANA}${peran}`;
}
