import type { KegiatanHasil, KegiatanJenis, ProspekStatus } from '@/constants/presurvei';

/** Sumber prospek (netmanager `domain/entities/Prospek.ts:19-25`). */
export type ProspekSumber = 'LAPANGAN' | 'IKLAN' | 'WEBSITE' | 'REFERRAL' | 'WALK_IN';

/** Item daftar kegiatan (netmanager `dto/kegiatan.dto.ts:17-38`). */
export interface KegiatanListItem {
  id: string;
  jenis: KegiatanJenis;
  userId: string;
  namaSales: string | null;
  peranPelaku: 'SALES' | 'NON_SALES' | null;
  departemenPelaku: string | null;
  prospekId: string | null;
  waktuMulai: string;
  alamatDikunjungi: string | null;
  ditemuiNama: string | null;
  latitude: number | null;
  longitude: number | null;
  hasil: KegiatanHasil;
  jumlahFoto: number;
}

/** Item daftar prospek (netmanager `dto/prospek.dto.ts:15-32`). */
export interface ProspekListItem {
  id: string;
  nama: string;
  noTelp: string;
  alamat: string;
  sumber: ProspekSumber;
  status: ProspekStatus;
  pemilikId: string | null;
  namaPemilik: string | null;
  paketDiminati: string | null;
  canvasingId: string | null;
  createdAt: string;
}

/** Rincian prospek (netmanager `dto/prospek.dto.ts:34-46`). */
export interface ProspekDetail extends ProspekListItem {
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  shareloc: string | null;
  iklanId: string | null;
  registrationId: string | null;
  referralNama: string | null;
  catatan: string | null;
  konversiAt: string | null;
  isSiapDipromosikan: boolean;
  updatedAt: string;
}

/** Satu halaman daftar (`apiPaginated`, netmanager `lib/api-response.ts:216-236`). */
export interface HalamanPresurvei<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface BarisPencapaian {
  target: number;
  tercapai: number;
  persen: number;
}

export interface TargetBulanIni {
  periodeTahun: number;
  periodeBulan: number;
  kunjungan: BarisPencapaian;
  prospek: BarisPencapaian;
  konversi: BarisPencapaian;
}

export interface ProspekPerluFollowUp {
  id: string;
  nama: string;
  noTelp: string;
  status: ProspekStatus;
  sentuhanTerakhir: string;
}

/** Ringkasan Beranda (netmanager `dto/ringkasan-sales.dto.ts`, Task 4). */
export interface RingkasanPresurvei {
  tanggal: string;
  kegiatanHariIni: Record<KegiatanJenis, number>;
  target: TargetBulanIni | null;
  perluFollowUp: ProspekPerluFollowUp[];
}

/** Prospek yang lahir dari kegiatan (netmanager `kegiatan.validator.ts:57-63`). */
export interface ProspekBaruKegiatan {
  nama: string;
  noTelp: string;
  alamat: string;
  paketDiminati: string | null;
}

/**
 * Badan `POST /api/presurvei/kegiatan` tanpa `fotoUrls`.
 * `fotoUrls` diisi dari `meta.photos` saat mutasi berjalan (Task 9).
 */
export interface MuatanCatatKegiatan {
  jenis: KegiatanJenis;
  hasil: KegiatanHasil;
  waktuMulai: string;
  prospekId: string | null;
  ditemuiNama: string | null;
  catatan: string | null;
  latitude?: number;
  longitude?: number;
  alamatDikunjungi?: string | null;
  odpTerdekat?: string | null;
  estimasiKabelMeter?: number | null;
  catatanTeknis?: string | null;
  prospekBaru?: ProspekBaruKegiatan;
}

/** Isi `data` respons `POST /api/presurvei/kegiatan` (route baris 63-69). */
export interface HasilCatatKegiatan {
  kegiatan: KegiatanListItem;
  prospek: ProspekDetail | null;
}

/** Badan `POST .../jadikan-canvasing` (netmanager `konversi.validator.ts:16-24`). */
export interface MuatanJadikanCanvasing {
  noKtp: string;
  paket: string;
  kabel?: number;
  fotoKtp: string;
}

/** Isi `data` respons jadikan-canvasing (route baris 27-30). */
export interface HasilJadikanCanvasing {
  prospek: ProspekDetail;
  canvasingId: string;
}
