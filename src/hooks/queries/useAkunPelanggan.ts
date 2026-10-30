import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryClient';
import { AkunPelangganService } from '@/services/AkunPelangganService';
import type { MuatanGantiPassword, MuatanUbahProfil } from '@/types/portalPelanggan';
import { presentAppError } from '@/utils/errorPresenter';

const OPSI_MUTASI = { retry: false, meta: { skipGlobalErrorToast: true } } as const;

/** Profil pelanggan untuk form Edit Profil. */
export function useProfilPelanggan() {
  return useQuery({
    queryKey: queryKeys.portalPelanggan.profil(),
    queryFn: AkunPelangganService.profil,
  });
}

/** Simpan nomor telepon & preferensi notifikasi. */
export function useUbahProfilPelanggan(onBerhasil: (pesan: string | undefined) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    ...OPSI_MUTASI,
    mutationFn: (muatan: MuatanUbahProfil) => AkunPelangganService.ubahProfil(muatan),
    onSuccess: (pesan) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.portalPelanggan.profil() });
      onBerhasil(pesan);
    },
    onError: (error) => presentAppError(error, { screen: 'EditProfilPelanggan', source: 'mutation' }),
  });
}

/**
 * Ganti password. Password lama yang salah dijawab 400 beserta pesannya;
 * `presentAppError` menampilkan pesan itu apa adanya.
 */
export function useGantiPasswordPelanggan(onBerhasil: (pesan: string | undefined) => void) {
  return useMutation({
    ...OPSI_MUTASI,
    mutationFn: (muatan: MuatanGantiPassword) => AkunPelangganService.gantiPassword(muatan),
    onSuccess: onBerhasil,
    onError: (error) => presentAppError(error, { screen: 'GantiPasswordPelanggan', source: 'mutation' }),
  });
}
