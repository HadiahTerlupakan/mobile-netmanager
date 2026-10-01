/**
 * Konstanta presurvei, disalin dari netmanager `modules/presurvei/`.
 *
 * Urutan enum ikut backend dan dijaga `__tests__/utils/presurvei/aturanPresurvei.test.ts`
 * terhadap `__tests__/fixtures/presurvei/kontrak-mobile.json`.
 */

export const KEGIATAN_JENIS = ['KUNJUNGAN', 'SURVEI_LOKASI', 'TELEPON', 'CHAT', 'IKLAN'] as const;
export type KegiatanJenis = (typeof KEGIATAN_JENIS)[number];

export const KEGIATAN_HASIL = [
  'TERTARIK',
  'PERLU_FOLLOWUP',
  'TIDAK_MINAT',
  'TIDAK_ADA_ORANG',
  'DEAL',
] as const;
export type KegiatanHasil = (typeof KEGIATAN_HASIL)[number];

export const PROSPEK_STATUSES = [
  'BARU',
  'DIHUBUNGI',
  'TERTARIK',
  'NEGOSIASI',
  'DEAL',
  'TIDAK_MINAT',
  'TIDAK_LAYAK',
] as const;
export type ProspekStatus = (typeof PROSPEK_STATUSES)[number];

/**
 * Siapa prospek ini (netmanager `domain/entities/Prospek.ts` `PROSPEK_JENIS`):
 * calon pemasang, atau perantara yang bisa membawa pelanggan (ketua RT/RW,
 * kepala desa, tokoh masyarakat, pemilik warung, dll.).
 */
export const PROSPEK_JENIS = ['CALON_PELANGGAN', 'PERANTARA'] as const;
export type ProspekJenis = (typeof PROSPEK_JENIS)[number];

/** Label jenis prospek untuk sales. */
export const LABEL_JENIS_PROSPEK: Record<ProspekJenis, string> = {
  CALON_PELANGGAN: 'Calon pelanggan',
  PERANTARA: 'Perantara',
};

/** Batas panjang peran perantara (netmanager `prospek.validator.ts` `PANJANG_PERAN_MAKS`). */
export const PANJANG_PERAN_PROSPEK_MAKS = 120;

/** Label jenis kegiatan; `Record` memaksa jenis baru dijawab saat kompilasi. */
export const LABEL_JENIS_KEGIATAN: Record<KegiatanJenis, string> = {
  KUNJUNGAN: 'Kunjungan',
  SURVEI_LOKASI: 'Survei lokasi',
  TELEPON: 'Telepon',
  CHAT: 'Chat',
  IKLAN: 'Iklan',
};

/** Label hasil kegiatan (sama dengan netmanager `modules/presurvei/utils/statusConfig.ts:54-66`). */
export const LABEL_HASIL_KEGIATAN: Record<KegiatanHasil, string> = {
  TERTARIK: 'Tertarik',
  PERLU_FOLLOWUP: 'Perlu follow-up',
  TIDAK_MINAT: 'Tidak minat',
  TIDAK_ADA_ORANG: 'Tidak ada orang',
  DEAL: 'Deal',
};

/** Label status prospek (sama dengan netmanager `modules/presurvei/utils/statusConfig.ts:25-33`). */
export const LABEL_STATUS_PROSPEK: Record<ProspekStatus, string> = {
  BARU: 'Baru',
  DIHUBUNGI: 'Dihubungi',
  TERTARIK: 'Tertarik',
  NEGOSIASI: 'Negosiasi',
  DEAL: 'Deal',
  TIDAK_MINAT: 'Tidak minat',
  TIDAK_LAYAK: 'Tidak layak',
};

/** Batas foto per kegiatan (`kegiatan.validator.ts:22`). */
export const JUMLAH_FOTO_KEGIATAN_MAKS = 6;

/** Batas estimasi kabel survei dalam meter (`kegiatan.validator.ts:23`). */
export const KABEL_METER_MAKS = 5000;

export const ENDPOINT_KEGIATAN_PRESURVEI = '/api/presurvei/kegiatan';
export const ENDPOINT_PROSPEK_PRESURVEI = '/api/presurvei/prospek';
export const ENDPOINT_RINGKASAN_PRESURVEI = '/api/mobile/presurvei/ringkasan';

/** Awalan seluruh endpoint presurvei; dipakai mengenali antrean yang tersinkron. */
export const AWALAN_ENDPOINT_PRESURVEI = '/api/presurvei';

/** Jenis unggahan foto kegiatan (netmanager `route-handlers-impl.ts`, Task 1). */
export const TIPE_UNGGAH_FOTO_KEGIATAN = 'presurvei';

/** Foto KTP ikut ke data canvasing, jadi disimpan di folder marketing. */
export const TIPE_UNGGAH_FOTO_KTP = 'marketing';

/** Jeda debounce pencarian prospek. */
export const JEDA_CARI_PROSPEK_MS = 400;

/**
 * Rencana kunjungan (netmanager `domain/entities/Rencana.ts`). Belum masuk
 * `kontrak-mobile.json` karena fixture itu salinan byte-demi-byte dari backend.
 */
export const RENCANA_JENIS = ['KUNJUNGAN', 'SURVEI_LOKASI', 'TELEPON', 'CHAT'] as const satisfies readonly KegiatanJenis[];
export type RencanaJenis = (typeof RENCANA_JENIS)[number];

/** Jenis rencana yang mendatangi tempat — hanya ini yang butuh alamat. */
export const RENCANA_JENIS_BERALAMAT: readonly RencanaJenis[] = ['KUNJUNGAN', 'SURVEI_LOKASI'];

/** Contoh tujuan siap ketuk di form rencana; tetap bisa diubah setelah dipilih. */
export const CONTOH_TUJUAN_RENCANA = [
  'Tawarkan paket internet',
  'Jelaskan harga dan promo',
  'Cek lokasi pemasangan',
  'Tindak lanjut calon pelanggan',
  'Ambil data untuk pendaftaran',
] as const;

export const RENCANA_SUMBER = ['MANDIRI', 'PENUGASAN'] as const;
export type RencanaSumber = (typeof RENCANA_SUMBER)[number];

/** Status tampil; TERLEWAT = DIRENCANAKAN yang tanggalnya sudah lewat (tidak disimpan server). */
export const RENCANA_STATUS_TAMPIL = ['DIRENCANAKAN', 'TERLEWAT', 'SELESAI', 'BATAL'] as const;
export type RencanaStatusTampil = (typeof RENCANA_STATUS_TAMPIL)[number];

/** Status yang tersimpan di server. */
export type RencanaStatus = Exclude<RencanaStatusTampil, 'TERLEWAT'>;

export const LABEL_STATUS_RENCANA: Record<RencanaStatusTampil, string> = {
  DIRENCANAKAN: 'Direncanakan',
  TERLEWAT: 'Terlewat',
  SELESAI: 'Selesai',
  BATAL: 'Batal',
};

export const LABEL_SUMBER_RENCANA: Record<RencanaSumber, string> = {
  MANDIRI: 'Mandiri',
  PENUGASAN: 'Penugasan',
};

/** Batas isian rencana (`Rencana.ts`: TUJUAN_RENCANA_MAKS, ALAMAT_RENCANA_MAKS, ALASAN_BATAL_*). */
export const TUJUAN_RENCANA_MAKS = 500;
export const ALAMAT_RENCANA_MAKS = 300;
export const ALASAN_BATAL_RENCANA_MIN = 3;
export const ALASAN_BATAL_RENCANA_MAKS = 300;

export const ENDPOINT_RENCANA_PRESURVEI = '/api/presurvei/rencana';
/** Sales yang boleh ditugasi pemanggil (hanya pemberi tugas). */
export const ENDPOINT_SALES_TERSEDIA_RENCANA = `${ENDPOINT_RENCANA_PRESURVEI}/sales-tersedia`;
/** Rekap rencana vs realisasi per sales dalam lingkup pemanggil. */
export const ENDPOINT_REKAP_RENCANA = `${ENDPOINT_RENCANA_PRESURVEI}/rekap`;

/**
 * Lingkup rencana dari profil (`GET /api/mobile/profile` `lingkupRencana`,
 * netmanager `jenisLingkupDariIzin`): SENDIRI = sales biasa, TIM = kepala
 * sales (dirinya + anggota tim), SEMUA = admin (seluruh sales tenant).
 */
export type LingkupRencana = 'SENDIRI' | 'TIM' | 'SEMUA';
