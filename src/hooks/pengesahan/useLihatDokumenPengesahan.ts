import { useMutation } from '@tanstack/react-query';

import { PengesahanService } from '@/services/PengesahanService';
import { bukaBerkasPdf } from '@/utils/bukaBerkasPdf';
import { presentAppError } from '@/utils/errorPresenter';

/** Unduh PDF surat lalu buka di penampil perangkat; galat ditampilkan di sini (tanpa toast global). */
export function useLihatDokumenPengesahan(id: string) {
  return useMutation({
    retry: false,
    meta: { skipGlobalErrorToast: true },
    mutationFn: async () => bukaBerkasPdf(await PengesahanService.unduhDokumen(id)),
    onError: (error) => presentAppError(error, { screen: 'DetailPengesahan', source: 'mutation' }),
  });
}
