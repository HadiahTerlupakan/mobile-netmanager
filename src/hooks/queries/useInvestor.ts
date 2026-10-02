import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryClient';
import { InvestorService } from '@/services/InvestorService';

/** Angka keuangan investor berubah paling cepat harian; segar beberapa menit cukup. */
const WAKTU_SEGAR_INVESTOR_MS = 5 * 60_000;
const HALAMAN_PERTAMA = 1;

/** Ringkasan Beranda investor. */
export function useRingkasanInvestor() {
  return useQuery({
    queryKey: queryKeys.investor.ringkasan(),
    queryFn: InvestorService.ringkasan,
    staleTime: WAKTU_SEGAR_INVESTOR_MS,
  });
}

/** Daftar proyek investor. */
export function useDaftarProyekInvestor() {
  return useQuery({
    queryKey: queryKeys.investor.proyekList(),
    queryFn: InvestorService.daftarProyek,
    staleTime: WAKTU_SEGAR_INVESTOR_MS,
  });
}

/** Rincian satu proyek investor. */
export function useRincianProyekInvestor(id: string) {
  return useQuery({
    queryKey: queryKeys.investor.proyekDetail(id),
    queryFn: () => InvestorService.rincianProyek(id),
    enabled: id.length > 0,
    staleTime: WAKTU_SEGAR_INVESTOR_MS,
  });
}

/** Riwayat setoran modal investor. */
export function useSetoranModalInvestor() {
  return useQuery({
    queryKey: queryKeys.investor.setoran(),
    queryFn: InvestorService.setoranModal,
    staleTime: WAKTU_SEGAR_INVESTOR_MS,
  });
}

/** Riwayat bagi hasil investor. */
export function useBagiHasilInvestor() {
  return useQuery({
    queryKey: queryKeys.investor.bagiHasil(),
    queryFn: InvestorService.bagiHasil,
    staleTime: WAKTU_SEGAR_INVESTOR_MS,
  });
}

/** Riwayat uang diterima investor, dimuat per halaman saat digulir. */
export function usePencairanInvestor() {
  return useInfiniteQuery({
    queryKey: queryKeys.investor.pencairan(),
    queryFn: ({ pageParam }) => InvestorService.pencairan(pageParam),
    initialPageParam: HALAMAN_PERTAMA,
    getNextPageParam: (halaman) =>
      halaman.meta.page < halaman.meta.lastPage ? halaman.meta.page + 1 : undefined,
    staleTime: WAKTU_SEGAR_INVESTOR_MS,
  });
}
