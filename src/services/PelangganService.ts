import api from "./api";

/** Pelanggan versi ringkas yang dikirim endpoint mobile. */
export interface MobilePelanggan {
  id: string;
  idPelanggan: string;
  nama: string;
  username: string;
  status: string;
  paket: string | null;
  alamat: string | null;
  noTelp: string | null;
  jatuhTempo: string;
  siteId: string | null;
  siteName: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface PelangganPage {
  data: MobilePelanggan[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

interface ListParams {
  status?: string;
  search?: string;
  siteId?: string;
  page: number;
  limit: number;
}

/** Buang parameter kosong supaya query string tetap bersih. */
const toQueryParams = (params: ListParams): Record<string, string | number> =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ""),
  ) as Record<string, string | number>;

export const PelangganService = {
  /** Ambil satu halaman daftar pelanggan milik site karyawan. */
  async list(params: ListParams): Promise<PelangganPage> {
    const response = await api.get("/api/mobile/pelanggan", {
      params: toQueryParams(params),
    });
    return { data: response.data.data, meta: response.data.meta };
  },
};
