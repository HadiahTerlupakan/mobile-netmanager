import api from './api';
import {
  ENDPOINT_KEGIATAN_PRESURVEI,
  ENDPOINT_PENILAIAN_PRESURVEI,
  ENDPOINT_PROSPEK_PRESURVEI,
  ENDPOINT_REKAP_RENCANA,
  ENDPOINT_RENCANA_PRESURVEI,
  ENDPOINT_RINGKASAN_PRESURVEI,
  ENDPOINT_SALES_TERSEDIA_RENCANA,
  type ProspekJenis,
  type ProspekStatus,
  type RencanaStatusTampil,
} from '@/constants/presurvei';
import { buildIdempotencyHeaders } from '@/utils/requestId';
import type {
  HalamanPresurvei,
  HasilJadikanCanvasing,
  KegiatanListItem,
  MuatanBuatProspek,
  MuatanBuatRencana,
  MuatanJadikanCanvasing,
  MuatanTugaskanRencana,
  MuatanUbahRencana,
  ProspekDetail,
  ProspekListItem,
  RekapRencana,
  Rencana,
  RincianRencana,
  RingkasanPresurvei,
  SalesRencana,
} from '@/types/presurvei';
import type { HasilPenilaian, PeriodePenilaian } from '@/types/penilaian';

/** Filter `GET /api/presurvei/kegiatan`; nama sama persis dengan route (baris 20-31). */
export interface FilterKegiatanPresurvei {
  dariTanggal?: string;
  sampaiTanggal?: string;
  prospekId?: string;
  page: number;
  limit: number;
}

/** Filter `GET /api/presurvei/prospek` (route baris 30-38). */
export interface FilterProspekPresurvei {
  status?: ProspekStatus;
  jenis?: ProspekJenis;
  search?: string;
  page: number;
  limit: number;
}

/** Filter `GET /api/presurvei/rencana` (`daftarRencanaSchema`); tanggal "YYYY-MM-DD". */
export interface FilterRencanaPresurvei {
  dari?: string;
  sampai?: string;
  status?: RencanaStatusTampil;
  /** Persempit ke satu sales; hanya berarti bagi pemberi tugas (lingkup TIM/SEMUA). */
  salesId?: string;
  page: number;
  limit: number;
}

interface AmplopDaftar<T> {
  success: boolean;
  data: T[];
  meta: HalamanPresurvei<T>['meta'];
}

interface AmplopTunggal<T> {
  success: boolean;
  data: T;
}

/**
 * `skipErrorToast` hanya membungkam toast axios untuk galat jaringan/5xx
 * (`src/services/api.ts:231-237`) — bukan toast mutasi. `MutationCache.onError`
 * (`src/lib/queryClient.ts:93-115`) tetap menampilkan toast generiknya sendiri
 * untuk setiap galat mutasi terlepas dari flag ini. Dipakai di sini supaya
 * pesan jaringan generik tidak menimpa galat spesifik (mis. 409 transisi
 * status tak sah) sebelum caller (Task 8+) sempat menanganinya sendiri.
 */
const TANPA_TOAST = { skipErrorToast: true };

/** URL rincian/ubah satu prospek. */
export const buildProspekUrl = (id: string): string =>
  `${ENDPOINT_PROSPEK_PRESURVEI}/${encodeURIComponent(id)}`;

/** URL promosi prospek menjadi canvasing. */
export const buildJadikanCanvasingUrl = (id: string): string =>
  `${buildProspekUrl(id)}/jadikan-canvasing`;

/** URL rincian/ubah satu rencana. */
export const buildRencanaUrl = (id: string): string =>
  `${ENDPOINT_RENCANA_PRESURVEI}/${encodeURIComponent(id)}`;

/** URL pembatalan satu rencana. */
export const buildBatalRencanaUrl = (id: string): string => `${buildRencanaUrl(id)}/batal`;

/** Buang param kosong supaya query string bersih dan validator tidak menerima "". */
const tanpaNilaiKosong = (params: object): Record<string, string | number> =>
  Object.fromEntries(
    Object.entries(params).filter(([, nilai]) => nilai !== undefined && nilai !== ''),
  ) as Record<string, string | number>;

async function ambilHalaman<T>(url: string, filter: object): Promise<HalamanPresurvei<T>> {
  const respons = await api.get<AmplopDaftar<T>>(url, { params: tanpaNilaiKosong(filter) });
  return { data: respons.data.data, meta: respons.data.meta };
}

export const PresurveiService = {
  /** Satu halaman kegiatan; server mengikat pemanggil mobile ke miliknya sendiri. */
  daftarKegiatan(filter: FilterKegiatanPresurvei): Promise<HalamanPresurvei<KegiatanListItem>> {
    return ambilHalaman<KegiatanListItem>(ENDPOINT_KEGIATAN_PRESURVEI, filter);
  },

  /** Satu halaman prospek milik pemanggil. */
  daftarProspek(filter: FilterProspekPresurvei): Promise<HalamanPresurvei<ProspekListItem>> {
    return ambilHalaman<ProspekListItem>(ENDPOINT_PROSPEK_PRESURVEI, filter);
  },

  /** Rincian satu prospek. */
  async rincianProspek(id: string): Promise<ProspekDetail> {
    const respons = await api.get<AmplopTunggal<ProspekDetail>>(buildProspekUrl(id));
    return respons.data.data;
  },

  /**
   * Catat prospek baru (calon pelanggan atau perantara) secara manual (online saja). Nomor HP yang
   * sudah dipakai prospek aktif ditolak 409 `DUPLIKAT` kecuali
   * `abaikanDuplikat`; galat itu ditangani pemanggil, jadi toast jaringan dibungkam.
   */
  async buatProspek(muatan: MuatanBuatProspek): Promise<ProspekDetail> {
    const respons = await api.post<AmplopTunggal<ProspekDetail>>(ENDPOINT_PROSPEK_PRESURVEI, muatan, TANPA_TOAST);
    return respons.data.data;
  },

  /** Ringkasan Beranda sales. */
  async ringkasan(): Promise<RingkasanPresurvei> {
    const respons = await api.get<AmplopTunggal<RingkasanPresurvei>>(ENDPOINT_RINGKASAN_PRESURVEI);
    return respons.data.data;
  },

  /** Ubah status prospek; server menolak transisi tak sah dengan 409. */
  async ubahStatusProspek(id: string, status: ProspekStatus): Promise<ProspekDetail> {
    const respons = await api.patch<AmplopTunggal<ProspekDetail>>(
      buildProspekUrl(id),
      { status },
      TANPA_TOAST,
    );
    return respons.data.data;
  },

  /** Promosikan prospek Deal menjadi canvasing. */
  async jadikanCanvasing(id: string, muatan: MuatanJadikanCanvasing): Promise<HasilJadikanCanvasing> {
    const respons = await api.post<AmplopTunggal<HasilJadikanCanvasing>>(
      buildJadikanCanvasingUrl(id),
      muatan,
      TANPA_TOAST,
    );
    return respons.data.data;
  },

  /**
   * Satu halaman rencana dalam lingkup pemanggil: sales hanya miliknya,
   * kepala sales dirinya + tim, admin seluruh tenant (`salesId` mempersempit).
   */
  daftarRencana(filter: FilterRencanaPresurvei): Promise<HalamanPresurvei<Rencana>> {
    return ambilHalaman<Rencana>(ENDPOINT_RENCANA_PRESURVEI, filter);
  },

  /** Rincian satu rencana beserta laporannya bila sudah dilaporkan. */
  async rincianRencana(id: string): Promise<RincianRencana> {
    const respons = await api.get<AmplopTunggal<RincianRencana>>(buildRencanaUrl(id));
    return respons.data.data;
  },

  /**
   * Buat rencana MANDIRI, atau penugasan bila `salesId` orang lain (pemberi
   * tugas). `requestId` dikirim sebagai `Idempotency-Key` supaya ketukan
   * ganda atau ulang setelah timeout tidak melahirkan dua rencana.
   */
  async buatRencana(muatan: MuatanBuatRencana | MuatanTugaskanRencana, requestId: string): Promise<Rencana> {
    const respons = await api.post<AmplopTunggal<Rencana>>(
      ENDPOINT_RENCANA_PRESURVEI,
      { ...muatan, requestId },
      { ...TANPA_TOAST, headers: buildIdempotencyHeaders(requestId) },
    );
    return respons.data.data;
  },

  /** Jadwal ulang/ubah rencana terbuka (sales: MANDIRI miliknya; pemberi tugas: semua dalam lingkup). */
  async ubahRencana(id: string, muatan: MuatanUbahRencana): Promise<Rencana> {
    const respons = await api.patch<AmplopTunggal<Rencana>>(buildRencanaUrl(id), muatan, TANPA_TOAST);
    return respons.data.data;
  },

  /** Batalkan rencana terbuka dengan alasan (hak sama dengan `ubahRencana`). */
  async batalkanRencana(id: string, alasan: string): Promise<Rencana> {
    const respons = await api.post<AmplopTunggal<Rencana>>(buildBatalRencanaUrl(id), { alasan }, TANPA_TOAST);
    return respons.data.data;
  },

  /** Sales yang boleh ditugasi pemberi tugas: dirinya + anggota tim aktif (admin: semua sales). */
  async salesTersediaRencana(): Promise<SalesRencana[]> {
    const respons = await api.get<AmplopTunggal<SalesRencana[]>>(ENDPOINT_SALES_TERSEDIA_RENCANA);
    return respons.data.data;
  },

  /** Rekap rencana vs realisasi per sales pada rentang "YYYY-MM-DD" (server: maks 92 hari). */
  async rekapRencana(rentang: { dari: string; sampai: string }): Promise<RekapRencana> {
    const respons = await api.get<AmplopTunggal<RekapRencana>>(ENDPOINT_REKAP_RENCANA, { params: rentang });
    return respons.data.data;
  },

  /**
   * Penilaian kinerja satu periode dalam lingkup pemanggil: sales biasa hanya
   * dirinya; kepala sales dirinya (kepala) + anggota timnya (sales).
   */
  async penilaian(periode: PeriodePenilaian): Promise<HasilPenilaian> {
    const respons = await api.get<AmplopTunggal<HasilPenilaian>>(ENDPOINT_PENILAIAN_PRESURVEI, { params: periode });
    return respons.data.data;
  },
};
