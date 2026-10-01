import type {
  KegiatanHasil,
  KegiatanJenis,
  ProspekJenis,
  ProspekStatus,
  RencanaJenis,
  RencanaStatus,
  RencanaStatusTampil,
  RencanaSumber,
} from '@/constants/presurvei';

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
  jenis: ProspekJenis;
  /** Peran perantara, mis. "Ketua RT/RW (RT 03)"; selalu null untuk calon pelanggan. */
  peran: string | null;
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

/**
 * Badan `POST /api/presurvei/prospek` dari aplikasi (subset `buatProspekSchema`,
 * netmanager `prospek.validator.ts`). `IKLAN` tidak ditawarkan di aplikasi
 * karena butuh `iklanId` yang hanya dikelola kantor.
 */
export interface MuatanBuatProspek {
  nama: string;
  noTelp: string;
  alamat: string;
  /** Server memakai CALON_PELANGGAN bila tidak dikirim. */
  jenis?: ProspekJenis;
  /** Wajib (tidak kosong) bila `jenis` = PERANTARA; server membuangnya untuk calon pelanggan. */
  peran?: string | null;
  sumber: Exclude<ProspekSumber, 'IKLAN'>;
  /** Wajib bila `sumber` = REFERRAL. */
  referralNama?: string;
  latitude?: number;
  longitude?: number;
  paketDiminati?: string | null;
  catatan?: string | null;
  /** Simpan walau nomor HP sudah dipakai prospek aktif lain. */
  abaikanDuplikat?: boolean;
}

/** Prospek aktif yang bentrok nomor HP (409 `DUPLIKAT`, `details.duplikat[]`). */
export interface DuplikatProspek {
  id: string;
  nama: string;
  status: ProspekStatus;
  pemilikId: string | null;
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
  /** Rencana yang dilaporkan kegiatan ini; server menutupnya (SELESAI) dalam transaksi yang sama. */
  rencanaId?: string;
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

/** Rincian kegiatan (netmanager `dto/kegiatan.dto.ts` `KegiatanDetailDto`). */
export interface KegiatanDetail extends KegiatanListItem {
  iklanId: string | null;
  waktuSelesai: string | null;
  catatan: string | null;
  fotoUrls: string[];
  dataTeknis: {
    odpTerdekat: string | null;
    estimasiKabelMeter: number | null;
    catatanTeknis: string | null;
  } | null;
  createdAt: string;
}

/** Rencana kunjungan (netmanager `dto/rencana.dto.ts` `RencanaDto`). */
export interface Rencana {
  id: string;
  salesId: string;
  namaSales: string | null;
  dibuatOlehId: string;
  namaPembuat: string | null;
  sumber: RencanaSumber;
  jenis: RencanaJenis;
  /** Tanggal kalender "YYYY-MM-DD". */
  tanggal: string;
  /** Jam "HH:mm" waktu lokal tenant; null = kapan saja di hari itu. */
  jam: string | null;
  tujuan: string;
  prospekId: string | null;
  namaProspek: string | null;
  alamat: string | null;
  latitude: number | null;
  longitude: number | null;
  status: RencanaStatus;
  statusTampil: RencanaStatusTampil;
  isTerlambat: boolean;
  kegiatanId: string | null;
  dilaporkanAt: string | null;
  alasanBatal: string | null;
  dibatalkanAt: string | null;
  createdAt: string;
}

/** Rincian rencana beserta laporannya (`RincianRencanaDto`). */
export interface RincianRencana extends Rencana {
  laporan: KegiatanDetail | null;
}

/** Badan `POST /api/presurvei/rencana` untuk diri sendiri (`buatRencanaSchema`, tanpa `salesId`). */
export interface MuatanBuatRencana {
  tanggal: string;
  jam: string | null;
  jenis: RencanaJenis;
  tujuan: string;
  prospekId: string | null;
  alamat: string | null;
}

/**
 * Badan `PATCH /api/presurvei/rencana/[id]` (`ubahRencanaSchema`, `.strict()`):
 * hanya medan yang berubah.
 */
export type MuatanUbahRencana = Partial<MuatanBuatRencana>;

/**
 * Badan `POST /api/presurvei/rencana` dari pemberi tugas: `salesId` orang
 * lain melahirkan PENUGASAN (sales dikabari), dirinya sendiri MANDIRI.
 */
export interface MuatanTugaskanRencana extends MuatanBuatRencana {
  salesId: string;
}

/** Sales yang boleh ditugasi (`SalesPresurveiDto`). */
export interface SalesRencana {
  id: string;
  nama: string;
}

/** Satu baris rekap rencana vs realisasi per sales (`BarisRekapRencana`). */
export interface BarisRekapRencana {
  salesId: string;
  namaSales: string | null;
  total: number;
  selesai: number;
  tepatWaktu: number;
  terlambat: number;
  terlewat: number;
  batal: number;
  mendatang: number;
  /** Selesai ÷ (selesai + terlewat), 0–100; null bila belum ada yang jatuh tempo. */
  persenRealisasi: number | null;
}

/** Respons `GET /api/presurvei/rencana/rekap`; `hariIni` menurut zona waktu tenant. */
export interface RekapRencana {
  hariIni: string;
  baris: BarisRekapRencana[];
}
