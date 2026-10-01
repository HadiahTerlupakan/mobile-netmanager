import React from 'react';
import { ScrollView } from 'react-native';
import tw from 'twrnc';

import type { PenilaianSales } from '@/types/penilaian';
import { BingkaiModalPenilaian } from './BingkaiModalPenilaian';
import { RincianPenilaianSales } from './RincianPenilaianSales';

/** Ruang kosong di bawah isi yang digulung. */
const JARAK_BAWAH = 16;

interface ModalRincianAnggotaProps {
  penilaian: PenilaianSales;
  onTutup: () => void;
}

/** Rincian penilaian satu sales (indikator, pencapaian, realisasi rencana), layar penuh. */
export function ModalRincianAnggota({ penilaian, onTutup }: ModalRincianAnggotaProps) {
  return (
    <BingkaiModalPenilaian judul={penilaian.nama} onTutup={onTutup}>
      <ScrollView contentContainerStyle={[tw`px-4`, { paddingBottom: JARAK_BAWAH }]}>
        <RincianPenilaianSales penilaian={penilaian} judul="Skor & indikator" />
      </ScrollView>
    </BingkaiModalPenilaian>
  );
}
