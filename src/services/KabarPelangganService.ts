import type { Pengumuman, RingkasanNotifikasi } from '@/types/portalPelanggan';
import api from './api';

const URL_NOTIFIKASI = '/api/customer/notifications';
const URL_PENGUMUMAN = '/api/customer/announcements';

/**
 * Notifikasi & pengumuman pelanggan. Ketiga endpoint baca menjawab tanpa
 * amplop `{ data }`: notifikasi datar, jumlah sebagai `count`, pengumuman
 * sebagai array telanjang.
 */
export const KabarPelangganService = {
  /** Notifikasi terbaru plus daftar id pengumuman yang belum dibaca. */
  async notifikasi(batas: number): Promise<RingkasanNotifikasi> {
    const response = await api.get<RingkasanNotifikasi>(URL_NOTIFIKASI, { params: { limit: batas } });
    return { notifications: response.data.notifications ?? [], announcements: response.data.announcements ?? [] };
  },

  /** Jumlah untuk lencana lonceng di Beranda. */
  async jumlahBelumDibaca(): Promise<number> {
    const response = await api.get<{ count?: number }>(`${URL_NOTIFIKASI}/unread-count`);
    return response.data.count ?? 0;
  },

  /** Semua pengumuman aktif untuk pelanggan. */
  async pengumuman(): Promise<Pengumuman[]> {
    const response = await api.get<Pengumuman[]>(URL_PENGUMUMAN);
    return Array.isArray(response.data) ? response.data : [];
  },

  /** Tandai satu pengumuman sudah dibaca. */
  async tandaiPengumumanDibaca(id: string): Promise<void> {
    await api.post(`${URL_PENGUMUMAN}/${id}/read`);
  },
};
