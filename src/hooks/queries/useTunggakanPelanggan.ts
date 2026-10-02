import { useQuery } from "@tanstack/react-query";

import { ambilTunggakanPelanggan } from "@/services/PelangganService";

/** Kunci cache tunggakan pelanggan (dipakai Beranda sales & layar Tunggakan). */
export const KUNCI_TUNGGAKAN = ["pelanggan", "tunggakan"] as const;
const WAKTU_SEGAR_MS = 60_000;

/** Pelanggan isolir milik sales / tim / seluruh tenant sesuai lingkup pengguna. */
export function useTunggakanPelanggan(isAktif = true) {
  return useQuery({
    queryKey: KUNCI_TUNGGAKAN,
    queryFn: ambilTunggakanPelanggan,
    enabled: isAktif,
    staleTime: WAKTU_SEGAR_MS,
  });
}
