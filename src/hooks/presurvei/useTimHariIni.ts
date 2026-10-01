import { useRekapRencana } from '@/hooks/queries/usePresurveiRencana';
import { filterRencanaHarian } from '@/utils/presurvei/rencana';
import { gabungRekapTimHariIni, rentangTerlewatTim } from '@/utils/presurvei/timRencana';

/**
 * Data kartu "Tim hari ini": rekap hari ini (selesai/total) digabung rekap
 * 91 hari ke belakang (terlewat). Keduanya di bawah `presurvei.all`, jadi
 * ikut tarik-untuk-segarkan Beranda. Pemanggil hanya dirender bagi pemberi
 * tugas dengan presurvei aktif.
 */
export function useTimHariIni() {
  const sekarang = new Date();
  const hariIni = useRekapRencana(filterRencanaHarian(sekarang), true);
  const lampau = useRekapRencana(rentangTerlewatTim(sekarang), true);
  return {
    baris: hariIni.data && lampau.data ? gabungRekapTimHariIni(hariIni.data.baris, lampau.data.baris) : undefined,
    isGagal: hariIni.isError || lampau.isError,
    cobaLagi: () => {
      void hariIni.refetch();
      void lampau.refetch();
    },
  };
}
