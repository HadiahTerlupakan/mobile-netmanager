import api from './api';
import {
  ENDPOINT_KEGIATAN_PRESURVEI,
  ENDPOINT_PROSPEK_PRESURVEI,
  ENDPOINT_RINGKASAN_PRESURVEI,
  type ProspekStatus,
} from '@/constants/presurvei';
import type {
  HalamanPresurvei,
  HasilJadikanCanvasing,
  KegiatanListItem,
  MuatanJadikanCanvasing,
  ProspekDetail,
  ProspekListItem,
  RingkasanPresurvei,
} from '@/types/presurvei';

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
  search?: string;
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
};
