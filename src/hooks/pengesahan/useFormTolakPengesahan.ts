import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useTolakPengesahan } from '@/hooks/queries/usePengesahan';
import { presentSuccessMessage } from '@/utils/errorPresenter';
import { skemaTolakPengesahan, type NilaiFormTolakPengesahan } from '@/utils/pengesahan/formPengesahan';

export const PESAN_PENOLAKAN_TERKIRIM = 'Penolakan Anda sudah dikirim ke pembuat surat.';
const NILAI_AWAL: NilaiFormTolakPengesahan = { alasan: '' };

/** Form alasan menolak surat (RHF + Zod) yang terhubung ke mutasi tolak. */
export function useFormTolakPengesahan(id: string, onSelesai: () => void) {
  const form = useForm<NilaiFormTolakPengesahan>({ resolver: zodResolver(skemaTolakPengesahan), defaultValues: NILAI_AWAL });
  const tolak = useTolakPengesahan(id, () => {
    presentSuccessMessage(PESAN_PENOLAKAN_TERKIRIM);
    onSelesai();
  });

  const kirim = form.handleSubmit(({ alasan }) => {
    if (!tolak.isPending) tolak.mutate(alasan);
  });

  return { control: form.control, kesalahan: form.formState.errors, kirim, isMengirim: tolak.isPending };
}
