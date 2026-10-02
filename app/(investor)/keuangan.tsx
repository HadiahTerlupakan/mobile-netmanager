import { useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { ScreenErrorBoundary } from '@/components/atoms/ScreenErrorBoundary';
import type { OpsiChip } from '@/components/molecules/PilihanChip';
import { SegmenPilihan } from '@/components/molecules/SegmenPilihan';
import {
  DaftarBagiHasil,
  DaftarPencairan,
  DaftarSetoranModal,
} from '@/components/organisms/investor/DaftarRiwayatKeuangan';
import { queryKeys } from '@/lib/queryClient';

type BagianUang = 'bagi-hasil' | 'diterima' | 'modal';

const OPSI_BAGIAN: readonly OpsiChip<BagianUang>[] = [
  { nilai: 'bagi-hasil', label: 'Bagi hasil' },
  { nilai: 'diterima', label: 'Uang diterima' },
  { nilai: 'modal', label: 'Modal' },
];

const DAFTAR_PER_BAGIAN: Readonly<Record<BagianUang, () => React.JSX.Element>> = {
  'bagi-hasil': DaftarBagiHasil,
  diterima: DaftarPencairan,
  modal: DaftarSetoranModal,
};

/** Riwayat uang investor: bagi hasil, uang yang sudah diterima, dan setoran modal. */
export default function KeuanganInvestorScreen() {
  const queryClient = useQueryClient();
  const [bagian, setBagian] = useState<BagianUang>('bagi-hasil');
  const [isMenyegarkan, setIsMenyegarkan] = useState(false);
  const Daftar = DAFTAR_PER_BAGIAN[bagian];

  const segarkan = async () => {
    setIsMenyegarkan(true);
    await queryClient.invalidateQueries({ queryKey: queryKeys.investor.all });
    setIsMenyegarkan(false);
  };

  return (
    <ScreenErrorBoundary screenName="KeuanganInvestor">
      <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
        <ScrollView
          contentContainerStyle={tw`px-4 pb-8`}
          refreshControl={<RefreshControl refreshing={isMenyegarkan} onRefresh={() => void segarkan()} />}
        >
          <Text style={tw`text-2xl font-bold text-gray-900 pt-4 pb-4`}>Uang Saya</Text>
          <SegmenPilihan opsi={OPSI_BAGIAN} terpilih={bagian} onPilih={setBagian} />
          <View style={tw`mt-4`}>
            <Daftar />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenErrorBoundary>
  );
}
