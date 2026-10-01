import { useRouter } from 'expo-router';
import { useState } from 'react';

import { ruteLaporkanRencana, ruteUbahRencana } from '@/constants/rutePresurvei';
import { useKegiatanMenungguKirim } from '@/hooks/queries/usePresurveiKegiatan';
import { useRincianRencana } from '@/hooks/queries/usePresurveiRencana';
import { useIsOnline } from '@/hooks/useIsOnline';
import { validasiAlasanBatal } from '@/utils/presurvei/formRencana';
import { idRencanaMenungguKirim } from '@/utils/presurvei/rencana';
import { useLingkupRencana } from './useLingkupRencana';
import { useBatalkanRencana } from './useMutasiRencana';

/** Lembar batal: terbuka/tertutup, alasan, dan kesalahannya. */
function useLembarBatal(id: string) {
  const [isTerbuka, setIsTerbuka] = useState(false);
  const [alasan, setAlasan] = useState('');
  const [kesalahan, setKesalahan] = useState<string | undefined>(undefined);
  const tutup = () => {
    setIsTerbuka(false);
    setAlasan('');
    setKesalahan(undefined);
  };
  const batalkan = useBatalkanRencana(id, tutup);
  const konfirmasi = () => {
    const pesan = validasiAlasanBatal(alasan);
    setKesalahan(pesan);
    if (pesan !== undefined || batalkan.isPending) return;
    batalkan.mutate(alasan.trim());
  };
  return {
    isTerbuka,
    alasan,
    kesalahan,
    isMenyimpan: batalkan.isPending,
    buka: () => setIsTerbuka(true),
    tutup,
    ubahAlasan: setAlasan,
    konfirmasi,
  };
}

/**
 * Logika layar rincian rencana: data, status antrean laporannya, hak aksi
 * (sales vs pemberi tugas), navigasi laporkan/ubah, dan lembar batal. `isAktif` = hasil guard fitur; selama
 * false rincian tidak dimuat (deep link notifikasi tanpa izin).
 */
export function useLayarRincianRencana(id: string, isAktif: boolean) {
  const router = useRouter();
  const rincian = useRincianRencana(id, isAktif);
  const antrean = useKegiatanMenungguKirim();
  const isOnline = useIsOnline();
  const lingkup = useLingkupRencana();
  const batal = useLembarBatal(id);
  const rencana = rincian.data;

  const laporkan = () => {
    if (rencana) router.push(ruteLaporkanRencana(rencana));
  };

  return {
    rencana,
    isPending: rincian.isPending,
    refetch: rincian.refetch,
    lingkup,
    isOnline,
    isMenungguKirim: idRencanaMenungguKirim(antrean.data ?? []).has(id),
    laporkan,
    ubah: () => router.push(ruteUbahRencana(id)),
    batal,
  };
}
