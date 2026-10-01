import type { ProspekJenis } from '@/constants/presurvei';
import type { MuatanBuatProspek } from '@/types/presurvei';
import {
  PANJANG_CATATAN_PROSPEK_MAKS,
  PANJANG_NAMA_REFERRAL_MAKS,
  PESAN_ISIAN_PROSPEK,
  buangMedanSah,
  isTerlaluPanjang,
  teksAtauNull,
  validasiIsianProspek,
  type IsianProspekBaru,
} from './isianProspek';
import {
  JENIS_PROSPEK_BAWAAN,
  gabungPeran,
  isPerantara,
  validasiPeran,
  type PilihanPeran,
} from './jenisProspek';

/**
 * Aturan form "Tambah Prospek" (`POST /api/presurvei/prospek`).
 * Data inti memakai aturan bersama `isianProspek.ts` (sama dengan prospek
 * baru dari Catat Kegiatan); di sini hanya tambahan khusus form ini:
 * jenis & peran ("Orang ini siapa?"), sumber ("Kenal dari mana?"), nama
 * pengenal, catatan, dan titik lokasi.
 */

/** Sumber yang ditawarkan di aplikasi; IKLAN butuh `iklanId` yang dikelola kantor. */
export type SumberProspekFormulir = MuatanBuatProspek['sumber'];

/** Pilihan "Kenal dari mana?" dalam urutan tampil; bawaan = yang pertama. */
export const OPSI_SUMBER_PROSPEK: readonly { nilai: SumberProspekFormulir; label: string }[] = [
  { nilai: 'LAPANGAN', label: 'Ketemu di lapangan' },
  { nilai: 'WALK_IN', label: 'Datang sendiri' },
  { nilai: 'REFERRAL', label: 'Dikenalkan orang lain' },
  { nilai: 'WEBSITE', label: 'Dari website' },
];

const SUMBER_BAWAAN: SumberProspekFormulir = 'LAPANGAN';
const SUMBER_BUTUH_PENGENAL: SumberProspekFormulir = 'REFERRAL';

/** Titik lokasi prospek dari tombol "Pakai lokasi saya sekarang". */
export interface TitikProspek {
  latitude: number;
  longitude: number;
}

export interface NilaiFormProspek extends IsianProspekBaru {
  jenis: ProspekJenis;
  /** Hanya untuk perantara; null = belum memilih. */
  peranPilihan: PilihanPeran | null;
  /** Pelengkap peran (mis. "RT 03"), atau perannya sendiri bila "Lainnya". */
  peranKeterangan: string;
  sumber: SumberProspekFormulir;
  referralNama: string;
  catatan: string;
  titik: TitikProspek | null;
}

export const NILAI_FORM_PROSPEK_KOSONG: NilaiFormProspek = Object.freeze({
  nama: '',
  noTelp: '',
  alamat: '',
  paketDiminati: '',
  jenis: JENIS_PROSPEK_BAWAAN,
  peranPilihan: null,
  peranKeterangan: '',
  sumber: SUMBER_BAWAAN,
  referralNama: '',
  catatan: '',
  titik: null,
});

export type MedanFormProspek = keyof IsianProspekBaru | 'referralNama' | 'catatan' | 'peranPilihan' | 'peranKeterangan';

export type KesalahanFormProspek = Partial<Record<MedanFormProspek, string>>;

export const PESAN_FORM_PROSPEK = {
  referralKosong: 'Tulis nama orang yang mengenalkan',
} as const;

/** Apakah sumber ini mewajibkan nama orang yang mengenalkan. */
export function isButuhNamaPengenal(sumber: SumberProspekFormulir): boolean {
  return sumber === SUMBER_BUTUH_PENGENAL;
}

function periksaReferral(nilai: NilaiFormProspek): string | undefined {
  if (!isButuhNamaPengenal(nilai.sumber)) return undefined;
  if (nilai.referralNama.trim() === '') return PESAN_FORM_PROSPEK.referralKosong;
  if (isTerlaluPanjang(nilai.referralNama, PANJANG_NAMA_REFERRAL_MAKS)) return PESAN_ISIAN_PROSPEK.terlaluPanjang;
  return undefined;
}

/** Apakah isian "Paket yang diminati" ditampilkan; perantara tidak memasang. */
export function isPaketDitanyakan(jenis: ProspekJenis): boolean {
  return !isPerantara(jenis);
}

/**
 * Kesalahan per medan, meniru `buatProspekSchema`; objek kosong berarti boleh
 * disimpan. Paket yang tersembunyi (perantara) tidak ikut diperiksa.
 */
export function validasiFormProspek(nilai: NilaiFormProspek): KesalahanFormProspek {
  const paketDiminati = isPaketDitanyakan(nilai.jenis) ? nilai.paketDiminati : '';
  return {
    ...validasiIsianProspek({ ...nilai, paketDiminati }),
    ...validasiPeran(nilai.jenis, nilai.peranPilihan, nilai.peranKeterangan),
    ...buangMedanSah<MedanFormProspek>({
      referralNama: periksaReferral(nilai),
      catatan: isTerlaluPanjang(nilai.catatan, PANJANG_CATATAN_PROSPEK_MAKS) ? PESAN_ISIAN_PROSPEK.terlaluPanjang : undefined,
    }),
  };
}

/**
 * Badan `POST /api/presurvei/prospek`. Dipanggil setelah `validasiFormProspek`
 * bersih. Jenis selalu dikirim; peran hanya untuk perantara, paket hanya
 * untuk calon pelanggan. Nama pengenal hanya untuk REFERRAL, titik hanya bila ada.
 */
export function keMuatanBuatProspek(nilai: NilaiFormProspek, isAbaikanDuplikat = false): MuatanBuatProspek {
  return {
    nama: nilai.nama.trim(),
    noTelp: nilai.noTelp.trim(),
    alamat: nilai.alamat.trim(),
    jenis: nilai.jenis,
    ...(isPerantara(nilai.jenis) ? { peran: gabungPeran(nilai.peranPilihan, nilai.peranKeterangan) } : {}),
    sumber: nilai.sumber,
    paketDiminati: isPaketDitanyakan(nilai.jenis) ? teksAtauNull(nilai.paketDiminati) : null,
    catatan: teksAtauNull(nilai.catatan),
    ...(isButuhNamaPengenal(nilai.sumber) ? { referralNama: nilai.referralNama.trim() } : {}),
    ...(nilai.titik ? { latitude: nilai.titik.latitude, longitude: nilai.titik.longitude } : {}),
    ...(isAbaikanDuplikat ? { abaikanDuplikat: true } : {}),
  };
}

/**
 * Alamat setelah lokasi didapat: hasil lokasi hanya mengisi alamat yang
 * masih kosong — tulisan sales tidak pernah ditimpa.
 */
export function alamatSetelahLokasi(alamatSekarang: string, alamatLokasi: string): string {
  if (alamatSekarang.trim() !== '') return alamatSekarang;
  return alamatLokasi.trim();
}
