import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ProspekStatus } from '@/constants/presurvei';
import { queryKeys } from '@/lib/queryClient';
import { PresurveiService } from '@/services/PresurveiService';
import { isGalatStatusTidakSah } from '@/utils/galatIdempotensi';
import { presentAppError, presentErrorMessage, presentSuccessMessage } from '@/utils/errorPresenter';

const PESAN_STATUS_DIUBAH = 'Status prospek diperbarui';
const JUDUL_STATUS_SUDAH_BERUBAH = 'Status Sudah Berubah';
const PESAN_STATUS_SUDAH_BERUBAH =
  'Status prospek ini sudah berubah di tempat lain. Data terbaru sudah dimuat ulang.';

/**
 * Ubah status prospek. Sengaja TIDAK memakai antrean offline: transisi
 * bergantung pada status server terkini, dan transisi yang diantre bisa
 * sudah tidak sah saat terkirim (spec §4.3). Server menolak yang tak sah (409).
 *
 * `retry: false` menimpa default aplikasi (`mutations.retry: 1`,
 * `src/lib/queryClient.ts`): mengulang otomatis akan mengirim ulang PATCH
 * yang sudah ditolak server, dan bisa menampilkan 409 "sedang berubah" untuk
 * transisi yang sebetulnya sudah selesai diproses (preflight-scan.md P47).
 *
 * Galat 409 `INVALID_STATE` berarti status sudah berubah di server sejak
 * layar dimuat (netmanager `ProspekService.ts:170`). Deteksinya
 * (`isGalatStatusTidakSah`) dipindah ke `@/utils/galatIdempotensi` di fix
 * round 1 Task 16 supaya tidak diduplikasi dengan `useJadikanCanvasing`,
 * yang punya kasus 409 `INVALID_STATE` serupa (prospek sudah dikonversi).
 * Ruling fix round Task 15 (#1): rincian (`prospekDetail`) dimuat ulang secara TERSASAR — bukan
 * seluruh `presurvei.all` — supaya layar tidak terus menampilkan status
 * basi (staleTime 5 menit query rincian) dan sales tidak terus mencoba
 * transisi yang sudah tidak sah; pesannya menjelaskan bahwa data sudah
 * dimuat ulang, bukan sekadar meneruskan pesan transisi mentah dari
 * backend. Galat lain (termasuk 409 tanpa kode ini) tetap lewat
 * `presentAppError` seperti biasa, tanpa memuat ulang apa pun.
 */
export function useUbahStatusProspek(prospekId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: ProspekStatus) => PresurveiService.ubahStatusProspek(prospekId, status),
    retry: false,
    // Ruling fix round Task 15 (#2): onError di bawah sudah menampilkan
    // pesannya sendiri (409 vs galat lain) — tanpa ini, toast global
    // `MutationCache.onError` (`src/lib/queryClient.ts`) tetap tampil
    // berdampingan dan menggandakan pesan untuk galat yang sama.
    meta: { skipGlobalErrorToast: true },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.presurvei.all });
      presentSuccessMessage(PESAN_STATUS_DIUBAH);
    },
    onError: (error) => {
      if (isGalatStatusTidakSah(error)) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.presurvei.prospekDetail(prospekId),
          exact: true,
        });
        presentErrorMessage(PESAN_STATUS_SUDAH_BERUBAH, JUDUL_STATUS_SUDAH_BERUBAH);
        return;
      }
      presentAppError(error, { screen: 'RincianProspek', source: 'mutation' });
    },
  });
}
