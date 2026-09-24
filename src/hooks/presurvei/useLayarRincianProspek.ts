import { useRouter } from 'expo-router';
import { useState } from 'react';

import { ruteCatatFollowUp, ruteJadikanCanvasing } from '@/constants/rutePresurvei';
import { useRincianProspek } from '@/hooks/queries/usePresurveiProspek';
import { useIsOnline } from '@/hooks/useIsOnline';
import { daftarPilihanUbahStatus, type AksiUbahStatus } from '@/utils/presurvei/aturanPresurvei';
import { useUbahStatusProspek } from './useUbahStatusProspek';

/**
 * Logika layar rincian prospek: muat data, status online, lembar Ubah
 * Status, dan keputusan navigasi vs mutasi saat sales memilih status tujuan.
 * Layar (`app/(app)/presurvei/prospek/[id]/index.tsx`) hanya merender apa
 * yang dikembalikan di sini (preflight-scan.md G10: logika keluar dari
 * komponen layar). `isAktif` = hasil guard fitur; selama false rincian tidak dimuat.
 */
export function useLayarRincianProspek(id: string, isAktif: boolean) {
  const router = useRouter();
  const rincian = useRincianProspek(id, isAktif);
  const isOnline = useIsOnline();
  const ubahStatus = useUbahStatusProspek(id);
  const [isPilihStatusTerbuka, setIsPilihStatusTerbuka] = useState(false);

  const prospek = rincian.data;

  /**
   * Deal membuka form Jadikan Canvasing (data konversi belum ada di
   * prospek); tujuan lain langsung dikirim sebagai mutasi status.
   */
  const pilihAksi = (aksi: AksiUbahStatus) => {
    setIsPilihStatusTerbuka(false);
    if (!prospek) return;
    if (aksi.jenis === 'buka-konversi') {
      router.push(ruteJadikanCanvasing(prospek.id));
      return;
    }
    ubahStatus.mutate(aksi.tujuan);
  };

  return {
    prospek,
    isPending: rincian.isPending,
    refetch: rincian.refetch,
    isOnline,
    isMenyimpan: ubahStatus.isPending,
    isPilihStatusTerbuka,
    pilihanStatus: prospek ? daftarPilihanUbahStatus(prospek.status) : [],
    bukaPilihStatus: () => setIsPilihStatusTerbuka(true),
    tutupPilihStatus: () => setIsPilihStatusTerbuka(false),
    pilihAksi,
    kePresurveiCatat: () => prospek && router.push(ruteCatatFollowUp(prospek)),
    keJadikanCanvasing: () => prospek && router.push(ruteJadikanCanvasing(prospek.id)),
  };
}
