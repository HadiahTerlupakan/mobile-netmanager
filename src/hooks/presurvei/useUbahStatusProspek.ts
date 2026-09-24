import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ProspekStatus } from '@/constants/presurvei';
import { queryKeys } from '@/lib/queryClient';
import { PresurveiService } from '@/services/PresurveiService';
import { presentAppError, presentSuccessMessage } from '@/utils/errorPresenter';

const PESAN_STATUS_DIUBAH = 'Status prospek diperbarui';

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
 * Galat 409 (`INVALID_STATE`) berarti status sudah berubah di server —
 * pesannya diambil apa adanya dari backend lewat `presentAppError`
 * (`getUserFriendlyError`, `src/utils/errorHandling.ts:234`), yang sudah
 * menyertakan pesan transisi dari `AppError` (netmanager
 * `ProspekService.ts:170`). Layar TIDAK menampilkan toast tambahan untuk
 * kasus ini (lihat `AksiProspek` — tak ada `onError` kedua di layar),
 * supaya hanya satu pesan spesifik yang tampil dari jalur ini.
 *
 * Catatan (carry Task 7, belum diselesaikan di sini — di luar cakupan
 * berkas Task 15): `MutationCache.onError` global (`src/lib/queryClient.ts`)
 * tidak membaca `meta` apa pun dan SELALU menampilkan toast generiknya
 * sendiri untuk setiap galat mutasi, termasuk yang sudah ditangani di sini.
 * Ini bukan masalah khusus hook ini — semua mutasi lain di aplikasi (mis.
 * `useCatatKegiatan`) punya keterbatasan yang sama karena `MutationCache`
 * tidak punya mekanisme peredam per-mutasi setara
 * `meta.silentToastStatuses` milik `QueryCache`. Memperbaikinya perlu
 * menyentuh `src/lib/queryClient.ts`, di luar daftar berkas Task 15.
 */
export function useUbahStatusProspek(prospekId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: ProspekStatus) => PresurveiService.ubahStatusProspek(prospekId, status),
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.presurvei.all });
      presentSuccessMessage(PESAN_STATUS_DIUBAH);
    },
    onError: (error) => {
      presentAppError(error, { screen: 'RincianProspek', source: 'mutation' });
    },
  });
}
