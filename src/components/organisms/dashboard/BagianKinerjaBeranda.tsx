import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { KartuKinerjaSaya } from '@/components/organisms/penilaian/KartuKinerjaSaya';
import { KartuKinerjaTim } from '@/components/organisms/penilaian/KartuKinerjaTim';
import { KartuKinerjaTimSales } from '@/components/organisms/penilaian/KartuKinerjaTimSales';
import { RUTE_PENILAIAN_KINERJA, rutePenilaianTab } from '@/constants/rutePresurvei';
import { useKinerjaBeranda } from '@/hooks/presurvei/useKinerjaBeranda';

interface BagianKinerjaBerandaProps {
  isPresurveiAktif: boolean;
}

const GAYA_KARTU_KOSONG = 'bg-white rounded-2xl p-4 mb-4 border border-gray-100 shadow-sm';

/**
 * Kartu kinerja bulan ini di Beranda sesuai jenis tampilan penilaian:
 * "Kinerja tim sales" (lingkup SEMUA, membuka tab Kepala sales), "Kinerja
 * tim" (kepala sales), atau "Kinerja saya" (sales). Disembunyikan bila
 * penilaian tidak berizin (403) atau respons kosong.
 */
export function BagianKinerjaBeranda({ isPresurveiAktif }: BagianKinerjaBerandaProps) {
  const router = useRouter();
  const { keadaan, cobaLagi } = useKinerjaBeranda(isPresurveiAktif);
  const buka = () => router.push(RUTE_PENILAIAN_KINERJA);

  if (keadaan.jenis === 'tersembunyi') return null;
  if (keadaan.jenis === 'memuat') {
    return <View style={tw`${GAYA_KARTU_KOSONG}`}><ActivityIndicator /></View>;
  }
  if (keadaan.jenis === 'galat') {
    return (
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Muat ulang penilaian kinerja" onPress={cobaLagi} style={tw`${GAYA_KARTU_KOSONG}`}>
        <Text style={tw`text-sm text-red-700`}>Penilaian kinerja gagal dimuat. Ketuk untuk coba lagi.</Text>
      </TouchableOpacity>
    );
  }
  const { tampilan } = keadaan;
  if (tampilan.jenis === 'SEMUA') {
    return <KartuKinerjaTimSales kepala={tampilan.kepala} onBuka={() => router.push(rutePenilaianTab('KEPALA', Date.now()))} />;
  }
  if (tampilan.jenis === 'KEPALA') return <KartuKinerjaTim penilaian={tampilan.kepala} onBuka={buka} />;
  return <KartuKinerjaSaya penilaian={tampilan.sales} onBuka={buka} />;
}
