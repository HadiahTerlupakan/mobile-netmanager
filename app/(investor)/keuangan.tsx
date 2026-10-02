import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { DESAIN_PREMIUM } from '@/theme';

import { ScreenErrorBoundary } from '@/components/atoms/ScreenErrorBoundary';
import type { OpsiChip } from '@/components/molecules/PilihanChip';
import { SegmenPilihan } from '@/components/molecules/SegmenPilihan';
import {
  DaftarBagiHasil,
  DaftarPencairan,
  DaftarSetoranModal,
} from '@/components/organisms/investor/DaftarRiwayatKeuangan';
import { useSegarkanDataInvestor } from '@/hooks/useSegarkanDataInvestor';
import { queryKeys } from '@/lib/queryClient';

type BagianUang = 'bagi-hasil' | 'diterima' | 'modal';

const OPSI_BAGIAN: readonly OpsiChip<BagianUang>[] = [
  { nilai: 'bagi-hasil', label: 'Bagi hasil' },
  { nilai: 'diterima', label: 'Uang diterima' },
  { nilai: 'modal', label: 'Modal' },
];

const BAGIAN_BAWAAN: BagianUang = 'bagi-hasil';

/** Penjaga tipe nilai `?bagian=` dari tautan notifikasi. */
function isBagianUang(nilai: unknown): nilai is BagianUang {
  return OPSI_BAGIAN.some((opsi) => opsi.nilai === nilai);
}

const DAFTAR_PER_BAGIAN: Readonly<Record<BagianUang, () => React.JSX.Element>> = {
  'bagi-hasil': DaftarBagiHasil,
  diterima: DaftarPencairan,
  modal: DaftarSetoranModal,
};

/**
 * Riwayat uang investor: bagi hasil, uang yang sudah diterima, dan setoran modal.
 * `?bagian=` (dari tautan notifikasi) memilih bagian yang dibuka.
 */
export default function KeuanganInvestorScreen() {
  const queryClient = useQueryClient();
  const { bagian: bagianTautan } = useLocalSearchParams<{ bagian?: string }>();
  const [bagian, setBagian] = useState<BagianUang>(
    isBagianUang(bagianTautan) ? bagianTautan : BAGIAN_BAWAAN,
  );

  // Notifikasi baru saat layar ini sudah terbuka hanya mengganti parameter.
  useEffect(() => {
    if (isBagianUang(bagianTautan)) setBagian(bagianTautan);
  }, [bagianTautan]);

  const [isMenyegarkan, setIsMenyegarkan] = useState(false);
  useSegarkanDataInvestor();
  const Daftar = DAFTAR_PER_BAGIAN[bagian];

  const segarkan = async () => {
    setIsMenyegarkan(true);
    try {
      await queryClient.invalidateQueries({ queryKey: queryKeys.investor.all });
    } finally {
      setIsMenyegarkan(false);
    }
  };

  return (
    <ScreenErrorBoundary screenName="KeuanganInvestor">
      <SafeAreaView style={[tw`flex-1`, { backgroundColor: DESAIN_PREMIUM.latarLayar }]} edges={['top']}>
        <ScrollView
          contentContainerStyle={tw`px-4 pb-8`}
          refreshControl={<RefreshControl refreshing={isMenyegarkan} onRefresh={() => void segarkan()} />}
        >
          <View style={tw`pt-4 pb-5`}>
            <Text style={tw`text-2xl font-bold text-slate-900`}>Uang Saya</Text>
            <Text style={tw`text-sm text-slate-500 mt-0.5`}>Bagi hasil, pencairan, dan setoran modal</Text>
          </View>
          <SegmenPilihan opsi={OPSI_BAGIAN} terpilih={bagian} onPilih={setBagian} />
          <View style={tw`mt-4`}>
            <Daftar />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenErrorBoundary>
  );
}
