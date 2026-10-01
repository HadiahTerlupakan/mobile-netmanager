import React from 'react';
import { ScrollView, View } from 'react-native';
import tw from 'twrnc';

import type { LayarPenilaian } from '@/hooks/presurvei/useLayarPenilaian';
import { anggotaTimSaya, petaNamaKepala } from '@/utils/presurvei/tampilanPenilaian';
import { BagianPenilaianSaya } from './BagianPenilaianSaya';
import { DaftarPenilaianKepala } from './DaftarPenilaianKepala';
import { DaftarPenilaianSales } from './DaftarPenilaianSales';
import { KepalaLayarPenilaian } from './KepalaLayarPenilaian';

/** Ruang kosong di bawah isi tab "Saya". */
const JARAK_BAWAH = 24;

interface IsiTabPenilaianProps {
  layar: LayarPenilaian;
}

/**
 * Isi tab aktif. Tab berdaftar (Tim, Kepala sales, Semua sales) memakai
 * FlatList sebagai penggulung utama dengan kepala layar di
 * ListHeaderComponent, supaya daftar panjang tetap tervirtualisasi. Tab
 * "Saya" (dan sales biasa tanpa tab) cukup ScrollView.
 */
export function IsiTabPenilaian({ layar }: IsiTabPenilaianProps) {
  const { tampilan, tab, penggunaId } = layar;
  const kepalaLayar = <KepalaLayarPenilaian layar={layar} />;
  if (tampilan?.jenis === 'KEPALA' && tab === 'TIM') {
    const anggota = anggotaTimSaya(layar.hasil?.sales ?? [], tampilan.kepala.kepalaId);
    return <DaftarPenilaianSales key="TIM" daftar={anggota} header={kepalaLayar} penggunaId={penggunaId} onBuka={layar.bukaSales} />;
  }
  if (tampilan?.jenis === 'SEMUA' && tab === 'KEPALA') {
    return <DaftarPenilaianKepala daftar={tampilan.kepala} header={kepalaLayar} onBuka={layar.bukaKepala} />;
  }
  if (tampilan?.jenis === 'SEMUA' && tab === 'SALES') {
    return (
      <DaftarPenilaianSales
        key="SALES"
        daftar={tampilan.sales}
        header={kepalaLayar}
        penggunaId={penggunaId}
        namaKepala={petaNamaKepala(tampilan.kepala)}
        onBuka={layar.bukaSales}
      />
    );
  }
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: JARAK_BAWAH }}>
      {kepalaLayar}
      <View style={tw`px-4`}>
        <BagianPenilaianSaya tampilan={tampilan} />
      </View>
    </ScrollView>
  );
}
