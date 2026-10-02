import { useInfiniteQuery } from "@tanstack/react-query";

import { ambilPelangganSaya } from "@/services/PelangganService";
import type { StatusPelangganSaya } from "@/types/pelangganSaya";

/** Awalan kunci cache "Pelanggan saya"; dibatalkan setelah lapor keluhan. */
export const KUNCI_PELANGGAN_SAYA = ["pelanggan", "saya"] as const;
const UKURAN_HALAMAN = 20;
const HALAMAN_PERTAMA = 1;
const WAKTU_SEGAR_MS = 60_000;

/** Pelanggan yang dipegang sales, dimuat per halaman saat digulir. */
export function usePelangganSaya(saringan: { cari?: string; status?: StatusPelangganSaya }) {
  return useInfiniteQuery({
    queryKey: [...KUNCI_PELANGGAN_SAYA, saringan.cari ?? "", saringan.status ?? ""],
    queryFn: ({ pageParam }) => ambilPelangganSaya({ ...saringan, page: pageParam, limit: UKURAN_HALAMAN }),
    initialPageParam: HALAMAN_PERTAMA,
    getNextPageParam: (halaman) => (halaman.page * halaman.limit < halaman.total ? halaman.page + 1 : undefined),
    staleTime: WAKTU_SEGAR_MS,
  });
}
