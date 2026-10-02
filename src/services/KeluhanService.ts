import type { DetailKeluhan, HalamanKeluhan, KelompokStatusKeluhan, MuatanLaporKeluhan } from '@/types/keluhan';
import api from './api';

const URL_KELUHAN = '/api/mobile/keluhan';

/** Keluhan pelanggan lewat sales; lingkup (diri/tim/semua) diputuskan server. */
export const KeluhanService = {
  /** Satu halaman keluhan terbuka / selesai, opsional untuk satu sales. */
  async daftar(params: { status: KelompokStatusKeluhan; salesId?: string; page: number; limit: number }): Promise<HalamanKeluhan> {
    const response = await api.get<{ data: HalamanKeluhan }>(URL_KELUHAN, {
      params: Object.fromEntries(Object.entries(params).filter(([, nilai]) => nilai !== undefined)),
    });
    return response.data.data;
  },

  /** Detail keluhan: percakapan helpdesk dan WO yang menanganinya. */
  async detail(id: string): Promise<DetailKeluhan> {
    const response = await api.get<{ data: DetailKeluhan }>(`${URL_KELUHAN}/${id}`);
    return response.data.data;
  },

  /** Catat keluhan atas nama pelanggan; mengembalikan id & nomor tiket. */
  async lapor(muatan: MuatanLaporKeluhan): Promise<{ id: string; nomor: string }> {
    const response = await api.post<{ data: { id: string; nomor: string } }>(URL_KELUHAN, muatan);
    return response.data.data;
  },

  /** Balas helpdesk pada keluhan. */
  async balas(id: string, pesan: string): Promise<{ id: string }> {
    const response = await api.post<{ data: { id: string } }>(`${URL_KELUHAN}/${id}/balasan`, { pesan });
    return response.data.data;
  },
};
