import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { queryKeys } from '@/lib/queryClient';
import { PresurveiService } from '@/services/PresurveiService';
import type { MuatanBuatProspek, ProspekListItem } from '@/types/presurvei';
import { presentAppError, presentErrorMessage, presentSuccessMessage } from '@/utils/errorPresenter';
import {
  ambilDuplikatProspek,
  pilihTawaranDuplikat,
  teksPemberitahuanDuplikat,
  type TawaranDuplikat,
} from '@/utils/presurvei/duplikatProspek';
import { useLingkupRencana } from './useLingkupRencana';

export const PESAN_PROSPEK_TERSIMPAN = 'Prospek tersimpan';
export const PESAN_DUPLIKAT_GAGAL_DIBUKA =
  'Data prospek itu tidak bisa dibuka. Coba lagi, atau pilih "Tetap simpan sebagai baru".';

/** Nomor ganda yang menunggu keputusan sales (409 `DUPLIKAT`). */
export interface DuplikatMenunggu {
  teks: string;
  isBolehDipakai: boolean;
  isMemuat: boolean;
  pakaiYangAda: () => void;
  batal: () => void;
}

export interface SimpanProspek {
  kirim: (muatan: MuatanBuatProspek) => void;
  isMenyimpan: boolean;
  /** null selama tidak ada nomor ganda yang perlu diputuskan. */
  duplikat: DuplikatMenunggu | null;
}

/**
 * Simpan prospek baru (online saja, tanpa antrean) dan tangkap nomor
 * ganda tanpa galat mentah: sales bisa memakai data lama miliknya, atau
 * pemanggil mengirim ulang dengan `abaikanDuplikat`. Ketukan ganda diabaikan.
 */
export function useSimpanProspek(onBerhasil: (prospek: ProspekListItem) => void): SimpanProspek {
  const queryClient = useQueryClient();
  const { penggunaId } = useLingkupRencana();
  const [tawaran, setTawaran] = useState<TawaranDuplikat | null>(null);
  const [isMemuatDuplikat, setIsMemuatDuplikat] = useState(false);
  const isSedangMengirim = useRef(false);

  const mutasi = useMutation({
    retry: false,
    meta: { skipGlobalErrorToast: true },
    mutationFn: (muatan: MuatanBuatProspek) => PresurveiService.buatProspek(muatan),
    onSuccess: (prospek) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.presurvei.all });
      presentSuccessMessage(PESAN_PROSPEK_TERSIMPAN);
      onBerhasil(prospek);
    },
    onError: (error) => {
      const daftarDuplikat = ambilDuplikatProspek(error);
      if (daftarDuplikat !== null) {
        setTawaran(pilihTawaranDuplikat(daftarDuplikat, penggunaId));
        return;
      }
      presentAppError(error, { screen: 'TambahProspek', source: 'mutation' });
    },
    onSettled: () => {
      isSedangMengirim.current = false;
    },
  });

  const kirim = (muatan: MuatanBuatProspek) => {
    if (isSedangMengirim.current) return;
    isSedangMengirim.current = true;
    setTawaran(null);
    mutasi.mutate(muatan);
  };

  const pakaiYangAda = () => {
    const prospek = tawaran?.prospek;
    if (!prospek || !tawaran.isBolehDipakai || isMemuatDuplikat) return;
    setIsMemuatDuplikat(true);
    queryClient
      .fetchQuery({
        queryKey: queryKeys.presurvei.prospekDetail(prospek.id),
        queryFn: () => PresurveiService.rincianProspek(prospek.id),
      })
      .then((rincian) => {
        setTawaran(null);
        onBerhasil(rincian);
      })
      .catch(() => presentErrorMessage(PESAN_DUPLIKAT_GAGAL_DIBUKA))
      .finally(() => setIsMemuatDuplikat(false));
  };

  const duplikat: DuplikatMenunggu | null = tawaran
    ? {
        teks: teksPemberitahuanDuplikat(tawaran),
        isBolehDipakai: tawaran.isBolehDipakai,
        isMemuat: isMemuatDuplikat,
        pakaiYangAda,
        batal: () => setTawaran(null),
      }
    : null;

  return { kirim, isMenyimpan: mutasi.isPending, duplikat };
}
