import { useCallback } from 'react';

import { useTandaTanganPengesahan } from '@/hooks/queries/usePengesahan';
import type { HasilTandaTanganPengesahan } from '@/types/pengesahan';
import { presentErrorMessage, presentSuccessMessage } from '@/utils/errorPresenter';
import { PESAN_TANDA_TANGAN_KOSONG, periksaDataUrlTandaTangan } from '@/utils/pengesahan/formPengesahan';

export const PESAN_SURAT_SAH = 'Semua pihak sudah tanda tangan. Surat kini sah.';
export const PESAN_TANDA_TANGAN_TERSIMPAN = 'Tanda tangan Anda tersimpan.';

/** Pesan sukses sesuai hasil: surat sah bila semua pihak sudah tanda tangan. */
function umumkanHasil(hasil: HasilTandaTanganPengesahan): void {
  if (hasil.completed) {
    presentSuccessMessage(PESAN_SURAT_SAH, 'Surat sah');
    return;
  }
  presentSuccessMessage(PESAN_TANDA_TANGAN_TERSIMPAN);
}

/** Periksa lalu kirim tanda tangan; `onSelesai` dipanggil setelah server menerimanya. `beriTahuKosong` untuk kanvas kosong. */
export function useKirimTandaTangan(id: string, onSelesai: () => void) {
  const { mutate, isPending } = useTandaTanganPengesahan(id, (hasil) => {
    umumkanHasil(hasil);
    onSelesai();
  });

  const kirim = useCallback(
    (dataUrl: string) => {
      const galat = periksaDataUrlTandaTangan(dataUrl);
      if (galat) {
        presentErrorMessage(galat);
        return;
      }
      if (!isPending) mutate(dataUrl);
    },
    [mutate, isPending],
  );

  const beriTahuKosong = useCallback(() => presentErrorMessage(PESAN_TANDA_TANGAN_KOSONG), []);

  return { kirim, beriTahuKosong, isMengirim: isPending };
}
