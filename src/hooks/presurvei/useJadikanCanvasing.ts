import { useMutation, useQueryClient } from '@tanstack/react-query';

import { TIPE_UNGGAH_FOTO_KTP, type ProspekStatus } from '@/constants/presurvei';
import { queryKeys } from '@/lib/queryClient';
import { PresurveiService } from '@/services/PresurveiService';
import { uploadService, type UploadType } from '@/services/UploadService';
import type { HasilJadikanCanvasing, MuatanJadikanCanvasing } from '@/types/presurvei';
import { presentAppError, presentErrorMessage, presentSuccessMessage } from '@/utils/errorPresenter';
import { keMuatanKonversi, STATUS_DEAL, type NilaiFormKonversi } from '@/utils/presurvei/formKonversi';

const PESAN_BERHASIL = 'Prospek dijadikan canvasing';
const JUDUL_SETENGAH_JALAN = 'Belum Selesai';

/** Pesan bila status sudah Deal tapi canvasing gagal dibuat. */
export const PESAN_SETENGAH_JALAN =
  'Prospek sudah berstatus Deal, tetapi canvasing belum dibuat. Buka lagi rincian prospek lalu tekan Jadikan Canvasing.';

/** Status sudah dipindah ke Deal, tetapi langkah konversi gagal. */
export class KonversiSetengahJalanError extends Error {
  readonly penyebab: unknown;

  constructor(penyebab: unknown) {
    super(PESAN_SETENGAH_JALAN);
    this.name = 'KonversiSetengahJalanError';
    this.penyebab = penyebab;
  }
}

/** Masukan satu konversi. `statusAsal` berasal dari rincian server, bukan parameter route. */
export interface MasukanKonversi {
  prospekId: string;
  statusAsal: ProspekStatus;
  nilai: NilaiFormKonversi;
  fotoKtpLokal: string;
}

/** Dependensi yang bisa diganti saat test. */
export interface DependensiKonversi {
  unggah: (uri: string, tipe: UploadType) => Promise<string>;
  ubahStatus: (id: string, status: ProspekStatus) => Promise<unknown>;
  jadikan: (id: string, muatan: MuatanJadikanCanvasing) => Promise<HasilJadikanCanvasing>;
}

const DEPENDENSI_BAWAAN: DependensiKonversi = {
  unggah: (uri, tipe) => uploadService.uploadFile(uri, tipe),
  ubahStatus: (id, status) => PresurveiService.ubahStatusProspek(id, status),
  jadikan: (id, muatan) => PresurveiService.jadikanCanvasing(id, muatan),
};

async function kirimKonversi(masukan: MasukanKonversi, muatan: MuatanJadikanCanvasing, deps: DependensiKonversi) {
  try {
    return await deps.jadikan(masukan.prospekId, muatan);
  } catch (error) {
    if (masukan.statusAsal === STATUS_DEAL) throw error;
    throw new KonversiSetengahJalanError(error);
  }
}

/**
 * Konversi dua langkah seperti web (`useJadikanCanvasing.ts` netmanager):
 * unggah KTP → (bila belum Deal) PATCH Deal → POST jadikan-canvasing.
 * KTP diunggah lebih dulu supaya kegagalan jaringan tidak memindah status.
 */
export async function jalankanKonversi(
  masukan: MasukanKonversi,
  deps: DependensiKonversi = DEPENDENSI_BAWAAN,
): Promise<HasilJadikanCanvasing> {
  const fotoKtp = await deps.unggah(masukan.fotoKtpLokal, TIPE_UNGGAH_FOTO_KTP);
  const muatan = keMuatanKonversi(masukan.nilai, fotoKtp);
  if (masukan.statusAsal !== STATUS_DEAL) await deps.ubahStatus(masukan.prospekId, STATUS_DEAL);
  return kirimKonversi(masukan, muatan, deps);
}

/**
 * Mutasi Jadikan Canvasing; butuh online, tidak pernah diantre (spec §8).
 *
 * `retry: false` menimpa default aplikasi (`mutations.retry: 1`,
 * `src/lib/queryClient.ts`): mengulang otomatis akan mengulang SELURUH
 * `jalankanKonversi` (unggah ulang KTP, PATCH Deal lagi) dan bisa
 * menampilkan pesan "setengah jalan" palsu untuk konversi yang sebetulnya
 * sudah diproses server — pola sama dengan `useUbahStatusProspek` (Task 15,
 * preflight P47).
 *
 * `meta.skipGlobalErrorToast`: `onError` di bawah sudah menampilkan
 * pesannya sendiri (setengah jalan vs galat lain) — tanpa ini, toast global
 * `MutationCache.onError` (`src/lib/queryClient.ts`) tetap tampil
 * berdampingan dan menggandakan pesan untuk galat yang sama (pola Task 15).
 */
export function useJadikanCanvasing(onBerhasil: () => void) {
  const queryClient = useQueryClient();
  const segarkanPresurvei = () => void queryClient.invalidateQueries({ queryKey: queryKeys.presurvei.all });

  return useMutation({
    mutationFn: (masukan: MasukanKonversi) => jalankanKonversi(masukan),
    retry: false,
    meta: { skipGlobalErrorToast: true },
    onSuccess: () => {
      segarkanPresurvei();
      // Canvasing baru lahir dari konversi ini, jadi daftar/ringkasan
      // canvasing ikut disegarkan (setara web `useInvalidate.ts:180`;
      // amandemen preflight-scan.md P22/S13 — sebelumnya tidak ikut).
      void queryClient.invalidateQueries({ queryKey: queryKeys.canvasing.all });
      presentSuccessMessage(PESAN_BERHASIL);
      onBerhasil();
    },
    onError: (error) => {
      if (error instanceof KonversiSetengahJalanError) {
        segarkanPresurvei();
        presentErrorMessage(PESAN_SETENGAH_JALAN, JUDUL_SETENGAH_JALAN);
        return;
      }
      presentAppError(error, { screen: 'JadikanCanvasing', source: 'mutation' });
    },
  });
}
