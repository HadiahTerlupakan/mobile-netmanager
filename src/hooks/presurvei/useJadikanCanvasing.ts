import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { TIPE_UNGGAH_FOTO_KTP, type ProspekStatus } from '@/constants/presurvei';
import { queryKeys } from '@/lib/queryClient';
import { PresurveiService } from '@/services/PresurveiService';
import { uploadService, type UploadType } from '@/services/UploadService';
import type { HasilJadikanCanvasing, MuatanJadikanCanvasing } from '@/types/presurvei';
import { isGalatStatusTidakSah } from '@/utils/galatIdempotensi';
import { presentAppError, presentErrorMessage, presentSuccessMessage } from '@/utils/errorPresenter';
import { keMuatanKonversi, STATUS_DEAL, type NilaiFormKonversi } from '@/utils/presurvei/formKonversi';

const PESAN_BERHASIL = 'Prospek dijadikan canvasing';
const JUDUL_SETENGAH_JALAN = 'Belum Selesai';
const JUDUL_SUDAH_DIKONVERSI = 'Sudah Dikonversi';

/** Pesan bila status sudah Deal tapi canvasing gagal dibuat. */
export const PESAN_SETENGAH_JALAN =
  'Prospek sudah berstatus Deal, tetapi canvasing belum dibuat. Buka lagi rincian prospek lalu tekan Jadikan Canvasing.';

/** Pesan bila prospek ternyata sudah dikonversi (409 `INVALID_STATE` saat statusAsal sudah Deal). */
export const PESAN_SUDAH_DIKONVERSI =
  'Prospek ini sudah dijadikan canvasing atau statusnya berubah. Data terbaru sudah dimuat ulang.';

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

/** Satu unggahan KTP berhasil: URI lokal sumbernya dan URL hasil unggah. */
interface UnggahKtpTersimpan {
  uri: string;
  url: string;
}

/**
 * Bungkus `unggah` supaya foto KTP dengan URI lokal yang SAMA tidak
 * diunggah dua kali saat sales menekan ulang "Jadikan Canvasing" setelah
 * POST sebelumnya gagal (mis. status prospek berubah di server sementara
 * unggah tadi sudah berhasil) — foto KTP data sensitif dan kuota data
 * sales tidak boleh terbuang untuk unggahan yang hasilnya sudah ada. Bila
 * fotonya diganti (URI beda), diunggah ulang seperti biasa.
 *
 * `cache` disuntik dari luar (bukan variabel modul) supaya umurnya
 * mengikuti SATU instance hook (`useRef` di `useJadikanCanvasing`), bukan
 * bocor lintas sesi/prospek lain (fix round 1 Task 16).
 */
export function unggahDenganCacheKtp(
  unggah: DependensiKonversi['unggah'],
  cache: { current: UnggahKtpTersimpan | null },
): DependensiKonversi['unggah'] {
  return async (uri, tipe) => {
    if (cache.current?.uri === uri) return cache.current.url;
    const url = await unggah(uri, tipe);
    cache.current = { uri, url };
    return url;
  };
}

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
 * pesannya sendiri (setengah jalan, sudah dikonversi, vs galat lain) —
 * tanpa ini, toast global `MutationCache.onError`
 * (`src/lib/queryClient.ts`) tetap tampil berdampingan dan menggandakan
 * pesan untuk galat yang sama (pola Task 15).
 *
 * `kembaliKeRincian` dipanggil baik saat konversi SUKSES maupun saat
 * ternyata prospek SUDAH dikonversi pihak lain (409 `INVALID_STATE`) —
 * di kedua kasus, tujuan layar ini (menjadikan prospek canvasing) sudah
 * tercapai/tidak relevan lagi, jadi sales diarahkan kembali ke rincian
 * yang sudah dimuat ulang (fix round 1 Task 16).
 */
export function useJadikanCanvasing(kembaliKeRincian: () => void) {
  const queryClient = useQueryClient();
  const cacheUnggahKtp = useRef<UnggahKtpTersimpan | null>(null);
  const segarkanPresurvei = () => void queryClient.invalidateQueries({ queryKey: queryKeys.presurvei.all });

  return useMutation({
    mutationFn: (masukan: MasukanKonversi) =>
      jalankanKonversi(masukan, {
        ...DEPENDENSI_BAWAAN,
        unggah: unggahDenganCacheKtp(DEPENDENSI_BAWAAN.unggah, cacheUnggahKtp),
      }),
    retry: false,
    meta: { skipGlobalErrorToast: true },
    onSuccess: () => {
      segarkanPresurvei();
      // Canvasing baru lahir dari konversi ini, jadi daftar/ringkasan
      // canvasing ikut disegarkan (setara web `useInvalidate.ts:180`;
      // amandemen preflight-scan.md P22/S13 — sebelumnya tidak ikut).
      void queryClient.invalidateQueries({ queryKey: queryKeys.canvasing.all });
      presentSuccessMessage(PESAN_BERHASIL);
      kembaliKeRincian();
    },
    onError: (error, masukan) => {
      if (error instanceof KonversiSetengahJalanError) {
        segarkanPresurvei();
        presentErrorMessage(PESAN_SETENGAH_JALAN, JUDUL_SETENGAH_JALAN);
        return;
      }
      // Hanya bisa terjadi saat `statusAsal` sudah Deal (`kirimKonversi`
      // melempar galat asli tanpa membungkusnya) — server menolak
      // `jadikan-canvasing` karena prospek sudah tidak dalam state yang
      // valid, paling sering karena SUDAH dikonversi pihak/perangkat lain.
      if (isGalatStatusTidakSah(error)) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.presurvei.prospekDetail(masukan.prospekId),
          exact: true,
        });
        presentErrorMessage(PESAN_SUDAH_DIKONVERSI, JUDUL_SUDAH_DIKONVERSI);
        kembaliKeRincian();
        return;
      }
      presentAppError(error, { screen: 'JadikanCanvasing', source: 'mutation' });
    },
  });
}
