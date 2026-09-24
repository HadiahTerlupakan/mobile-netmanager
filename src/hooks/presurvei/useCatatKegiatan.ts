import { useQueryClient } from '@tanstack/react-query';

import { ENDPOINT_KEGIATAN_PRESURVEI } from '@/constants/presurvei';
import { isOfflineMutationQueuedResult, useApiMutation } from '@/hooks/queries/useApiMutation';
import { queryKeys } from '@/lib/queryClient';
import type { HasilCatatKegiatan } from '@/types/presurvei';
import { badanCatatKegiatan, type VariabelCatatKegiatan } from '@/utils/presurvei/variabelCatat';

const PESAN_TERCATAT = 'Kegiatan tercatat';

/** Hasil simpan untuk layar: terkirim langsung atau masuk antrean. */
export interface HasilSimpanKegiatan {
  isAntre: boolean;
}

interface AmplopCatatKegiatan {
  success: boolean;
  data: HasilCatatKegiatan;
}

/**
 * Mutasi catat kegiatan presurvei. Offline → antrean SQLite beserta foto
 * (Task 9); daftar "Menunggu kirim" disegarkan saat itu juga.
 */
export function useCatatKegiatan(onTersimpan: (hasil: HasilSimpanKegiatan) => void) {
  const queryClient = useQueryClient();
  return useApiMutation<AmplopCatatKegiatan, VariabelCatatKegiatan>({
    endpoint: ENDPOINT_KEGIATAN_PRESURVEI,
    method: 'POST',
    buildPayload: badanCatatKegiatan,
    invalidateKeys: [queryKeys.presurvei.all],
    successMessage: PESAN_TERCATAT,
    onSuccess: (data) => {
      const isAntre = isOfflineMutationQueuedResult(data);
      if (isAntre) void queryClient.invalidateQueries({ queryKey: queryKeys.presurvei.antrean() });
      onTersimpan({ isAntre });
    },
  });
}
