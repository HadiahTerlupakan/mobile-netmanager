import React from 'react';

import type { PenilaianKepala } from '@/types/penilaian';
import { daftarIndikatorKepala, formatSkor, indikatorTerlemah } from '@/utils/presurvei/penilaianKinerja';
import { KerangkaKartuKinerja, PetunjukPerhatianGelap } from './KerangkaKartuKinerja';
import { SkorDanPredikat } from './SkorDanPredikat';

interface KartuKinerjaTimProps {
  penilaian: PenilaianKepala;
  onBuka: () => void;
}

/** Petunjuk indikator terlemah; tidak dirender bila semua indikator belum terukur. */
function PetunjukPerhatian({ penilaian }: { penilaian: PenilaianKepala }) {
  const terlemah = indikatorTerlemah(daftarIndikatorKepala(penilaian.indikator));
  if (terlemah === null) return null;
  return <PetunjukPerhatianGelap teks={`${terlemah.label} (${formatSkor(terlemah.nilai)})`} />;
}

/** Beranda kepala sales: skor kepala, predikat, jumlah anggota, dan indikator terlemah. */
export function KartuKinerjaTim({ penilaian, onBuka }: KartuKinerjaTimProps) {
  return (
    <KerangkaKartuKinerja judul="Kinerja tim bulan ini" onBuka={onBuka}>
      <SkorDanPredikat
        skor={penilaian.skor}
        predikat={penilaian.predikat}
        keterangan={`${penilaian.jumlahAnggota} anggota tim`}
        isDiAtasGelap
      />
      <PetunjukPerhatian penilaian={penilaian} />
    </KerangkaKartuKinerja>
  );
}
