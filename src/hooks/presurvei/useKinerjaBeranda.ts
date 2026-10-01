import { useLingkupRencana } from '@/hooks/presurvei/useLingkupRencana';
import { usePenilaianKinerja } from '@/hooks/queries/usePenilaianKinerja';
import { isAksesDitolak } from '@/utils/httpStatus';
import { periodeDariTanggal } from '@/utils/presurvei/periodePenilaian';
import { tentukanTampilanPenilaian, type TampilanPenilaian } from '@/utils/presurvei/tampilanPenilaian';

/** Keadaan kartu kinerja Beranda; 'tersembunyi' = tak berizin (403) atau respons kosong. */
export type KeadaanKinerjaBeranda =
  | { jenis: 'tersembunyi' }
  | { jenis: 'memuat' }
  | { jenis: 'galat' }
  | { jenis: 'siap'; tampilan: NonNullable<TampilanPenilaian> };

/**
 * Data kartu kinerja bulan berjalan di Beranda. Jenis kartu (sales, kepala,
 * atau seluruh tim sales) mengikuti `tentukanTampilanPenilaian`. Data cache
 * tetap dipakai walau segarkan ulang gagal.
 */
export function useKinerjaBeranda(isAktif: boolean): { keadaan: KeadaanKinerjaBeranda; cobaLagi: () => void } {
  const { penggunaId } = useLingkupRencana();
  const kueri = usePenilaianKinerja(periodeDariTanggal(new Date()), isAktif);
  const cobaLagi = () => void kueri.refetch();
  if (!isAktif || isAksesDitolak(kueri.error)) return { keadaan: { jenis: 'tersembunyi' }, cobaLagi };
  if (kueri.data) {
    const tampilan = tentukanTampilanPenilaian(kueri.data, penggunaId);
    return { keadaan: tampilan ? { jenis: 'siap', tampilan } : { jenis: 'tersembunyi' }, cobaLagi };
  }
  return { keadaan: kueri.error ? { jenis: 'galat' } : { jenis: 'memuat' }, cobaLagi };
}
