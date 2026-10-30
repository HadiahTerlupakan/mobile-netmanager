import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryClient';
import { KabarPelangganService } from '@/services/KabarPelangganService';

const BATAS_NOTIFIKASI = 30;

/** Notifikasi terbaru plus id pengumuman yang belum dibaca. */
export function useNotifikasiPelanggan() {
  return useQuery({
    queryKey: queryKeys.portalPelanggan.notifikasi(),
    queryFn: () => KabarPelangganService.notifikasi(BATAS_NOTIFIKASI),
  });
}

/** Angka lencana lonceng Beranda. */
export function useJumlahKabarBelumDibaca() {
  return useQuery({
    queryKey: queryKeys.portalPelanggan.jumlahBelumDibaca(),
    queryFn: KabarPelangganService.jumlahBelumDibaca,
  });
}

/** Semua pengumuman aktif untuk pelanggan. */
export function usePengumumanPelanggan() {
  return useQuery({
    queryKey: queryKeys.portalPelanggan.pengumuman(),
    queryFn: KabarPelangganService.pengumuman,
  });
}

/**
 * Tandai pengumuman dibaca saat dibuka. Kegagalan tidak ditampilkan:
 * pelanggan sudah bisa membaca isinya, dan pengumuman itu cukup tetap
 * bertanda "Baru" sampai dibuka lagi.
 */
export function useTandaiPengumumanDibaca() {
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    meta: { skipGlobalErrorToast: true },
    mutationFn: (id: string) => KabarPelangganService.tandaiPengumumanDibaca(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.portalPelanggan.notifikasi() });
    },
  });
}
