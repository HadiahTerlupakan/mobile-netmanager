import React from 'react';
import { View } from 'react-native';

import type { PenilaianSales } from '@/types/penilaian';
import { daftarIndikatorSales } from '@/utils/presurvei/penilaianKinerja';
import { KartuPencapaianPenilaian } from './KartuPencapaianPenilaian';
import { KartuRealisasiRencana } from './KartuRealisasiRencana';
import { KartuSkorPenilaian } from './KartuSkorPenilaian';

interface RincianPenilaianSalesProps {
  penilaian: PenilaianSales;
  judul: string;
}

/** Rincian lengkap satu sales: skor & indikator, pencapaian target, realisasi rencana. */
export function RincianPenilaianSales({ penilaian, judul }: RincianPenilaianSalesProps) {
  return (
    <View>
      <KartuSkorPenilaian
        judul={judul}
        skor={penilaian.skor}
        predikat={penilaian.predikat}
        indikator={daftarIndikatorSales(penilaian.indikator)}
      />
      <KartuPencapaianPenilaian pencapaian={penilaian.pencapaian} />
      <KartuRealisasiRencana rencana={penilaian.rencana} />
    </View>
  );
}
