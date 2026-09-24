import { useQueryClient } from '@tanstack/react-query';

import { ENDPOINT_KEGIATAN_PRESURVEI } from '@/constants/presurvei';
import { isOfflineMutationQueuedResult, useApiMutation } from '@/hooks/queries/useApiMutation';
import { queryKeys } from '@/lib/queryClient';
import type { HasilCatatKegiatan } from '@/types/presurvei';
import { presentAppError } from '@/utils/errorPresenter';
import { isGalatIdempotensiKunciDipakaiUlang } from '@/utils/galatIdempotensi';
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
 *
 * Galat server ditampilkan di sini, kecuali 409 `IDEMPOTENCY_KEY_REUSED`:
 * artinya hanya layar yang tahu (apakah variabel itu hasil pakai ulang dari
 * upaya yang mungkin sudah tercatat), jadi pesan untuk kasus itu diserahkan
 * ke layar. Data presurvei tetap disegarkan karena kegiatan itu bisa jadi
 * sudah ada di server.
 */
export function useCatatKegiatan(onTersimpan: (hasil: HasilSimpanKegiatan) => void) {
  const queryClient = useQueryClient();
  return useApiMutation<AmplopCatatKegiatan, VariabelCatatKegiatan>({
    endpoint: ENDPOINT_KEGIATAN_PRESURVEI,
    method: 'POST',
    buildPayload: badanCatatKegiatan,
    invalidateKeys: [queryKeys.presurvei.all],
    successMessage: PESAN_TERCATAT,
    showErrorAlert: false,
    // Ruling fix round Task 15 (#2): onError di bawah (dan per-panggilan di
    // `useLayarCatatKegiatan`) sudah menangani semua kasus galatnya sendiri
    // — tanpa ini, toast global `MutationCache.onError`
    // (`src/lib/queryClient.ts`) tetap tampil berdampingan.
    meta: { skipGlobalErrorToast: true },
    // Review akhir I1: default produksi `mutations.retry: 1`
    // (`src/lib/queryClient.ts`) akan mengulang otomatis setelah 5xx gateway
    // yang datang SETELAH server commit. Ulangan itu mengunggah foto lagi
    // (URL baru → hash badan beda) sehingga server membalas 409
    // `IDEMPOTENCY_KEY_REUSED` pada upaya yang layar anggap pertama, dan
    // simpan berikutnya memakai kunci baru → kegiatan ganda. Simpan ulang
    // ditangani layar dengan kunci yang sama (`useLayarCatatKegiatan`).
    retry: false,
    onSuccess: (data) => {
      const isAntre = isOfflineMutationQueuedResult(data);
      if (isAntre) void queryClient.invalidateQueries({ queryKey: queryKeys.presurvei.antrean() });
      onTersimpan({ isAntre });
    },
    onError: (error) => {
      if (!isGalatIdempotensiKunciDipakaiUlang(error)) {
        presentAppError(error, { source: 'mutation', route: ENDPOINT_KEGIATAN_PRESURVEI, report: false });
        return;
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.presurvei.all });
    },
  });
}
