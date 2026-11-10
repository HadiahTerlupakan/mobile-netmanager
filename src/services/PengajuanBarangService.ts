import type { HalamanPengajuanBarang } from '@/types/pengajuanBarang';

import api from './api';

/** Ambil satu halaman pengajuan barang milik gudang di site pengguna (hanya lihat). */
export async function ambilPengajuanBarang(cursor?: string | null): Promise<HalamanPengajuanBarang> {
  const response = await api.get<HalamanPengajuanBarang>('/api/mobile/inventory/pengajuan', {
    params: cursor ? { cursor } : undefined,
  });
  return { data: response.data.data ?? [], nextCursor: response.data.nextCursor ?? null };
}
