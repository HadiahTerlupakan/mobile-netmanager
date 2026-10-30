import type { MuatanGantiPassword, MuatanUbahProfil, ProfilPelanggan } from '@/types/portalPelanggan';
import { ambilMuatan } from '@/utils/responsPelanggan';
import api from './api';

const URL_PROFIL = '/api/customer/profile';

/** Profil, preferensi notifikasi, dan password akun pelanggan. */
export const AkunPelangganService = {
  /** Profil pelanggan yang sedang login. */
  async profil(): Promise<ProfilPelanggan> {
    const response = await api.get(URL_PROFIL);
    return ambilMuatan<ProfilPelanggan>(response.data, 'profile') as ProfilPelanggan;
  },

  /** Simpan nomor telepon & preferensi notifikasi; mengembalikan pesan dari server. */
  async ubahProfil(muatan: MuatanUbahProfil): Promise<string | undefined> {
    const response = await api.patch<{ message?: string }>(URL_PROFIL, muatan);
    return response.data.message;
  },

  /** Ganti password lewat endpoint profil yang sama; mengembalikan pesan dari server. */
  async gantiPassword(muatan: MuatanGantiPassword): Promise<string | undefined> {
    const response = await api.patch<{ message?: string }>(URL_PROFIL, muatan);
    return response.data.message;
  },
};
