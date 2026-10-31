import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryClient';
import { BerandaPelangganService } from '@/services/BerandaPelangganService';

/**
 * Ringkasan Beranda pelanggan, endpoint yang sama dengan dashboard portal web.
 * Server memuat tiap bagiannya terpisah, jadi koneksi tetap terbaca walau
 * tagihan gagal dimuat, dan sebaliknya.
 */
export function useRingkasanBerandaPelanggan(isAktif: boolean) {
  return useQuery({
    queryKey: queryKeys.portalPelanggan.beranda(),
    queryFn: BerandaPelangganService.ringkasan,
    enabled: isAktif,
  });
}
