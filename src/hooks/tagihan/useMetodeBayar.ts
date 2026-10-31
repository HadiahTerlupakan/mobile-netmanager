import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryClient';
import { TagihanPelangganService } from '@/services/TagihanPelangganService';

/**
 * Metode bayar untuk nominal yang akan dibayar. Daftar sebelumnya tetap
 * tampil selama nominal baru (mis. setelah kupon) dimuat, supaya pilihan
 * metode tidak berkedip menjadi skeleton.
 */
export function useMetodeBayar(nominal: number) {
  return useQuery({
    queryKey: queryKeys.portalPelanggan.metodeBayar(nominal),
    queryFn: () => TagihanPelangganService.metodeBayar(nominal),
    placeholderData: keepPreviousData,
  });
}
