import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import type { PenilaianKepala } from '@/types/penilaian';
import { daftarIndikatorKepala, formatSkor, indikatorTerlemah } from '@/utils/presurvei/penilaianKinerja';
import { KerangkaKartuKinerja } from './KerangkaKartuKinerja';
import { SkorDanPredikat } from './SkorDanPredikat';

interface KartuKinerjaTimProps {
  penilaian: PenilaianKepala;
  onBuka: () => void;
}

/** Petunjuk indikator terlemah; tidak dirender bila semua indikator belum terukur. */
function PetunjukPerhatian({ penilaian }: { penilaian: PenilaianKepala }) {
  const terlemah = indikatorTerlemah(daftarIndikatorKepala(penilaian.indikator));
  if (terlemah === null) return null;
  return (
    <View style={tw`rounded-xl bg-amber-50 px-3 py-2 mt-3`}>
      <Text style={tw`text-xs text-amber-800`}>
        <Text style={tw`font-semibold`}>Perlu perhatian: </Text>
        {`${terlemah.label} (${formatSkor(terlemah.nilai)})`}
      </Text>
    </View>
  );
}

/** Beranda kepala sales: skor kepala, predikat, jumlah anggota, dan indikator terlemah. */
export function KartuKinerjaTim({ penilaian, onBuka }: KartuKinerjaTimProps) {
  return (
    <KerangkaKartuKinerja judul="Kinerja tim bulan ini" onBuka={onBuka}>
      <SkorDanPredikat
        skor={penilaian.skor}
        predikat={penilaian.predikat}
        keterangan={`${penilaian.jumlahAnggota} anggota tim`}
      />
      <PetunjukPerhatian penilaian={penilaian} />
    </KerangkaKartuKinerja>
  );
}
