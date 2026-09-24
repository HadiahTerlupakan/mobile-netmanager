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
