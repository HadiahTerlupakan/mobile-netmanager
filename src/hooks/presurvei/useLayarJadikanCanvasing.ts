import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';

import { useRincianProspek } from '@/hooks/queries/usePresurveiProspek';
import { useIsOnline } from '@/hooks/useIsOnline';

import { useFormKonversi } from './useFormKonversi';
import { useJadikanCanvasing } from './useJadikanCanvasing';

/**
 * Logika layar Jadikan Canvasing: rincian prospek, status online, form,
 * kamera KTP, dan pengiriman dengan penjaga kirim-dobel. Layar
 * (`app/(app)/presurvei/prospek/[id]/jadikan-canvasing.tsx`) hanya
 * merender apa yang dikembalikan di sini — pola sama dengan
 * `useLayarRincianProspek` (Task 15), diwajibkan preflight-scan.md G10
 * untuk Task 16 juga ("`pilihAksi`/`kirim` di dalam layar").
 */
export function useLayarJadikanCanvasing(id: string) {
  const router = useRouter();
  const rincian = useRincianProspek(id);
  const form = useFormKonversi();
  const isOnline = useIsOnline();
  const konversi = useJadikanCanvasing(() => router.back());
  const [isKameraTerbuka, setIsKameraTerbuka] = useState(false);
  // Ref, bukan state: penjaga kirim-dobel harus sudah bernilai `true` SEBELUM
  // event tekan kedua diproses, dan tidak perlu memicu render sendiri.
  const isMengirim = useRef(false);

  const ambilFotoKtp = (uri: string) => {
    form.setFotoKtpLokal(uri);
    setIsKameraTerbuka(false);
  };

  const kirim = () => {
    const prospek = rincian.data;
    if (!prospek || !isOnline || isMengirim.current) return;
    if (!form.periksa() || form.fotoKtpLokal === null) return;
    isMengirim.current = true;
    konversi.mutate(
      { prospekId: prospek.id, statusAsal: prospek.status, nilai: form.nilai, fotoKtpLokal: form.fotoKtpLokal },
      { onSettled: () => { isMengirim.current = false; } },
    );
  };

  return {
    prospek: rincian.data,
    isPending: rincian.isPending,
    isError: rincian.isError,
    refetch: rincian.refetch,
    isOnline,
    isMenyimpan: konversi.isPending,
    form,
    isKameraTerbuka,
    bukaKamera: () => setIsKameraTerbuka(true),
    tutupKamera: () => setIsKameraTerbuka(false),
    ambilFotoKtp,
    kirim,
  };
}
