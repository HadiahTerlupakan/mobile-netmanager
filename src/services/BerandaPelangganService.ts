import type { RingkasanBerandaPelanggan } from '@/types/portalPelanggan';
import api from './api';

/** Ringkasan Beranda pelanggan: profil, koneksi, dan tunggakan dalam satu respons. */
export const BerandaPelangganService = {
  async ringkasan(): Promise<RingkasanBerandaPelanggan> {
    const response = await api.get<{ data?: RingkasanBerandaPelanggan }>('/api/customer/dashboard/summary');
    return response.data.data ?? {};
  },
};
