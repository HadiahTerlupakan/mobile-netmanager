import { useEffect, useState } from 'react';

import { useLingkupRencana } from '@/hooks/presurvei/useLingkupRencana';
import { usePenilaianKinerja } from '@/hooks/queries/usePenilaianKinerja';
import type { PeriodePenilaian } from '@/types/penilaian';
import { geserBulan, isBolehMajuPeriode, labelPeriode, periodeDariTanggal } from '@/utils/presurvei/periodePenilaian';
import {
  opsiTabPenilaian,
  tabAktifPenilaian,
  tentukanTampilanPenilaian,
  type TabPenilaian,
} from '@/utils/presurvei/tampilanPenilaian';

/** Pemilih bulan: periode aktif, label, dan geser tanpa melewati bulan berjalan. */
function usePemilihPeriode() {
  const [periode, setPeriode] = useState<PeriodePenilaian>(() => periodeDariTanggal(new Date()));
  const isBolehMaju = isBolehMajuPeriode(periode, new Date());
  const geser = (jumlahBulan: number) => {
    if (jumlahBulan > 0 && !isBolehMaju) return;
    setPeriode((lama) => geserBulan(lama, jumlahBulan));
  };
  return { periode, label: labelPeriode(periode), isBolehMaju, geser };
}

/** Tab yang diminta lewat param rute; `diminta` membuat ketukan berulang tetap diterapkan. */
export interface PermintaanTab {
  tab: TabPenilaian | null;
  diminta: string | undefined;
}

/** Pilihan tab pengguna; dipertahankan saat ganti bulan, ditimpa permintaan rute baru. */
function usePilihanTab(permintaan: PermintaanTab) {
  const [dipilih, setDipilih] = useState<TabPenilaian | null>(permintaan.tab);
  useEffect(() => {
    if (permintaan.tab !== null) setDipilih(permintaan.tab);
  }, [permintaan.tab, permintaan.diminta]);
  return { dipilih, pilih: setDipilih };
}

/** Rincian yang sedang dibuka di modal: satu sales atau satu kepala. */
type RincianTerbuka = { jenis: 'SALES' | 'KEPALA'; id: string } | null;

/**
 * State layar penilaian kinerja: periode, data, jenis tampilan
 * (`tentukanTampilanPenilaian`), tab aktif, dan rincian yang dibuka.
 */
export function useLayarPenilaian(isAktif: boolean, permintaan: PermintaanTab) {
  const pemilih = usePemilihPeriode();
  const pilihanTab = usePilihanTab(permintaan);
  const [terbuka, setTerbuka] = useState<RincianTerbuka>(null);
  const { penggunaId } = useLingkupRencana();
  const kueri = usePenilaianKinerja(pemilih.periode, isAktif);
  const hasil = kueri.data;
  const tampilan = hasil ? tentukanTampilanPenilaian(hasil, penggunaId) : null;
  const opsiTab = opsiTabPenilaian(tampilan);
  return {
    pemilih,
    kueri,
    hasil,
    tampilan,
    penggunaId,
    opsiTab,
    tab: tabAktifPenilaian(opsiTab, pilihanTab.dipilih),
    pilihTab: pilihanTab.pilih,
    salesTerbuka: terbuka?.jenis === 'SALES' ? hasil?.sales.find((baris) => baris.salesId === terbuka.id) ?? null : null,
    kepalaTerbuka: terbuka?.jenis === 'KEPALA' ? hasil?.kepala.find((baris) => baris.kepalaId === terbuka.id) ?? null : null,
    bukaSales: (id: string) => setTerbuka({ jenis: 'SALES', id }),
    bukaKepala: (id: string) => setTerbuka({ jenis: 'KEPALA', id }),
    tutupRincian: () => setTerbuka(null),
  };
}

/** Nilai kembali `useLayarPenilaian`. */
export type LayarPenilaian = ReturnType<typeof useLayarPenilaian>;
