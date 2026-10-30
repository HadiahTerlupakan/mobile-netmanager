import type { PaketPelanggan } from '@/types/portalPelanggan';
import api from './api';

const URL_PAKET = '/api/customer/package';
const URL_UPGRADE = `${URL_PAKET}/upgrade`;

/** Paket langganan pelanggan dan pengajuan upgrade-nya. */
export const PaketPelangganService = {
  /** Paket aktif, pengajuan yang menunggu, dan pilihan upgrade di lokasi pelanggan. */
  async paket(): Promise<PaketPelanggan> {
    // Respons berbentuk datar (`{ success, package, ... }`), bukan `{ data }`.
    const response = await api.get<PaketPelanggan>(URL_PAKET);
    return {
      ...response.data,
      pendingUpgrade: response.data.pendingUpgrade ?? null,
      upgradeOptions: response.data.upgradeOptions ?? [],
    };
  },

  /** Ajukan upgrade; berlaku pada siklus tagihan berikutnya. */
  async ajukanUpgrade(packageId: string): Promise<string | undefined> {
    const response = await api.post<{ message?: string }>(URL_UPGRADE, { packageId });
    return response.data.message;
  },

  /** Batalkan pengajuan upgrade yang belum diterapkan. */
  async batalkanUpgrade(): Promise<string | undefined> {
    const response = await api.delete<{ message?: string }>(URL_UPGRADE);
    return response.data.message;
  },
};
