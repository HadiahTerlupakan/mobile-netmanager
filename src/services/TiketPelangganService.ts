import type { DetailTiket, MuatanTutupTiket } from '@/types/portalPelanggan';
import { ambilMuatan } from '@/utils/responsPelanggan';
import api from './api';

const URL_TIKET = '/api/customer/tickets';

/** Tiket bantuan milik pelanggan yang sedang login. */
export const TiketPelangganService = {
  /** Detail tiket beserta balasannya; tiket pelanggan lain dijawab 404. */
  async detail(id: string): Promise<DetailTiket> {
    const response = await api.get(`${URL_TIKET}/${id}`);
    const tiket = ambilMuatan<DetailTiket>(response.data, 'ticket') as DetailTiket;
    // Balasan pernah bernama `messages`; server lama tanpa `replies` tidak boleh membuat layar crash.
    return { ...tiket, replies: tiket.replies ?? [], attachments: tiket.attachments ?? [] };
  },

  /** Kirim balasan teks pelanggan. */
  async balas(id: string, pesan: string): Promise<void> {
    await api.post(`${URL_TIKET}/${id}/reply`, { message: pesan });
  },

  /** Tutup tiket dengan rating/feedback opsional; mengembalikan pesan dari server. */
  async tutup(id: string, muatan: MuatanTutupTiket): Promise<string | undefined> {
    const response = await api.post<{ message?: string }>(`${URL_TIKET}/${id}/close`, muatan);
    return response.data.message;
  },
};
