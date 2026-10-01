import { useQuery } from '@tanstack/react-query';

import type { RencanaStatusTampil } from '@/constants/presurvei';
import { queryKeys } from '@/lib/queryClient';
import { PresurveiService } from '@/services/PresurveiService';

/**
 * Batas `limit` route (`rencana.validator.ts` LIMIT_MAKS = 300). Agenda satu
 * hari tim 10–30 sales muat di dalamnya; untuk daftar terlewat, `meta.total`
 * tetap memberi jumlah sebenarnya walau yang dimuat dibatasi.
 */
const BATAS_RENCANA = 300;
const HALAMAN_PERTAMA = 1;
const WAKTU_SEGAR_MS = 60_000;
/** Anggota tim jarang berubah dalam satu sesi. */
const WAKTU_SEGAR_SALES_MS = 5 * 60_000;

/** Filter layar daftar rencana; tanggal "YYYY-MM-DD". */
export interface FilterDaftarRencana {
  dari?: string;
  sampai?: string;
  status?: RencanaStatusTampil;
  /** Persempit ke satu sales (pemberi tugas). */
  salesId?: string;
}

/**
 * Rencana dalam lingkup pemanggil sesuai filter (satu halaman): sales biasa
 * miliknya, pemberi tugas dirinya + tim kecuali `salesId` diisi. `isAktif` =
 * hasil guard fitur/izin presurvei; selama false tidak ada GET.
 */
export function useDaftarRencana(filter: FilterDaftarRencana, isAktif = true) {
  return useQuery({
    queryKey: queryKeys.presurvei.rencanaList(filter),
    queryFn: () =>
      PresurveiService.daftarRencana({ ...filter, page: HALAMAN_PERTAMA, limit: BATAS_RENCANA }),
    enabled: isAktif,
    staleTime: WAKTU_SEGAR_MS,
  });
}

/** Rincian satu rencana beserta laporannya; nonaktif tanpa id atau sebelum guard mengizinkan. */
export function useRincianRencana(id: string, isAktif = true) {
  return useQuery({
    queryKey: queryKeys.presurvei.rencanaDetail(id),
    queryFn: () => PresurveiService.rincianRencana(id),
    enabled: isAktif && id !== '',
  });
}

/** Sales yang boleh ditugasi; hanya dimuat untuk pemberi tugas (sales biasa dijawab 403). */
export function useSalesTersediaRencana(isAktif: boolean) {
  return useQuery({
    queryKey: queryKeys.presurvei.rencanaSalesTersedia(),
    queryFn: () => PresurveiService.salesTersediaRencana(),
    enabled: isAktif,
    staleTime: WAKTU_SEGAR_SALES_MS,
  });
}

/** Rekap rencana vs realisasi per sales pada rentang "YYYY-MM-DD"; untuk pemberi tugas. */
export function useRekapRencana(rentang: { dari: string; sampai: string }, isAktif: boolean) {
  return useQuery({
    queryKey: queryKeys.presurvei.rencanaRekap(rentang),
    queryFn: () => PresurveiService.rekapRencana(rentang),
    enabled: isAktif,
    staleTime: WAKTU_SEGAR_MS,
  });
}
