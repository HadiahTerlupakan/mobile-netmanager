import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryClient';
import { getServerErrorMessage, isClientRejection } from '@/lib/queryErrorReporting';
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
 * Pesan server saat isian form ditolak (4xx), mis. 400 "Password saat ini salah".
 * Layar menampilkannya di bawah form karena toast hilang sebelum sempat dibaca.
 */
export function pesanPenolakanIsian(error: unknown): string | undefined {
  return isClientRejection(error) ? getServerErrorMessage(error) : undefined;
}

/**
 * Ganti password. Penolakan isian (password lama salah → 400) ditampilkan
 * layar lewat `pesanPenolakanIsian`; galat lain tetap lewat toast.
 */
export function useGantiPasswordPelanggan(onBerhasil: (pesan: string | undefined) => void) {
  return useMutation({
    ...OPSI_MUTASI,
    mutationFn: (muatan: MuatanGantiPassword) => AkunPelangganService.gantiPassword(muatan),
    onSuccess: onBerhasil,
    onError: (error) => {
      if (pesanPenolakanIsian(error)) return;
      presentAppError(error, { screen: 'GantiPasswordPelanggan', source: 'mutation' });
    },
  });
}
