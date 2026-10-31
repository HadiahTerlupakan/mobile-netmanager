import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import type { KuponTagihan } from '@/components/organisms/tagihan/PanelRincianPembayaran';
import { TagihanPelangganService, type DiskonKupon, type HasilVerifikasiKupon } from '@/services/TagihanPelangganService';
import { presentAppError, presentSuccessMessage } from '@/utils/errorPresenter';
import { logger } from '@/utils/logger';

/** Diskon beserta total tagihan saat kupon diverifikasi. */
type DiskonTerverifikasi = DiskonKupon & { nominalTagihan: number };

/**
 * Kode kupon yang diketik, diverifikasi ke server untuk total tagihan saat ini.
 *
 * Diskon tetap terpasang setelah checkout dibuat, supaya "Ganti Metode"
 * membuat checkout baru dengan kupon yang sama; diskon gugur sendiri bila
 * total tagihan berubah (mis. tagihan baru terbit), karena nilainya dihitung
 * atas total lama.
 */
export function useKuponTagihan(totalTagihan: number): KuponTagihan {
  const [kode, setKode] = useState('');
  const [diskon, setDiskon] = useState<DiskonTerverifikasi | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  const terapkan = (hasil: HasilVerifikasiKupon, nominalTagihan: number) => {
    if (!hasil.isSah) {
      setGalat(hasil.pesan);
      return;
    }
    setDiskon({ ...hasil.diskon, nominalTagihan });
    presentSuccessMessage('Kupon berhasil digunakan!');
  };

  // Operasi finansial → plain useMutation (tanpa offline-queue).
  const verifikasi = useMutation({
    retry: false,
    meta: { skipGlobalErrorToast: true },
    mutationFn: (kodeDicek: string) => TagihanPelangganService.verifikasiKupon(kodeDicek, totalTagihan),
    onSuccess: (hasil) => terapkan(hasil, totalTagihan),
    onError: (error) => {
      logger.error('[CustomerTagihan] Failed to verify coupon', error);
      presentAppError(error, { screen: 'CustomerTagihanScreen', route: '/(customer)/tagihan' });
    },
  });

  const hapus = () => {
    setDiskon(null);
    setKode('');
    setGalat(null);
  };

  return {
    kode,
    setKode: (kodeBaru) => {
      setKode(kodeBaru);
      setGalat(null);
    },
    diskon: diskon?.nominalTagihan === totalTagihan ? diskon : null,
    galat,
    isMengecek: verifikasi.isPending,
    onCek: () => {
      if (!kode.trim()) return;
      setDiskon(null);
      setGalat(null);
      verifikasi.mutate(kode.trim());
    },
    onHapus: hapus,
  };
}
