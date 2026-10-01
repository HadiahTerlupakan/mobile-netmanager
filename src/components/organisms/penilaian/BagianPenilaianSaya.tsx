import React from 'react';
import { View } from 'react-native';

import { daftarIndikatorKepala } from '@/utils/presurvei/penilaianKinerja';
import type { TampilanPenilaian } from '@/utils/presurvei/tampilanPenilaian';
import { KartuSkorPenilaian } from './KartuSkorPenilaian';
import { RincianPenilaianSales } from './RincianPenilaianSales';

interface BagianPenilaianSayaProps {
  tampilan: TampilanPenilaian;
}

/**
 * Penilaian pengguna sendiri. Kepala sales: lima indikator kepemimpinan, lalu
 * penilaian pribadinya sebagai sales bila ada. Sales: rincian lengkapnya.
 * Lingkup SEMUA tidak punya penilaian sendiri.
 */
export function BagianPenilaianSaya({ tampilan }: BagianPenilaianSayaProps) {
  if (tampilan === null || tampilan.jenis === 'SEMUA') return null;
  if (tampilan.jenis === 'SALES') return <RincianPenilaianSales penilaian={tampilan.sales} judul="Penilaian saya" />;
  const { kepala, sales } = tampilan;
  return (
    <View>
      <KartuSkorPenilaian
        judul="Penilaian saya sebagai kepala sales"
        skor={kepala.skor}
        predikat={kepala.predikat}
        indikator={daftarIndikatorKepala(kepala.indikator)}
        keterangan={`${kepala.jumlahAnggota} anggota tim`}
      />
      {sales ? <RincianPenilaianSales penilaian={sales} judul="Penilaian saya sebagai sales" /> : null}
    </View>
  );
}
