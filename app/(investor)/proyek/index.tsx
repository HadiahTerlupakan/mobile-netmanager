import { useRouter } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { DESAIN_PREMIUM } from '@/theme';

import { ScreenErrorBoundary } from '@/components/atoms/ScreenErrorBoundary';
import { KartuProyekInvestor } from '@/components/organisms/investor/KartuProyekInvestor';
import { KeadaanDaftar } from '@/components/organisms/investor/KeadaanDaftar';
import { useDaftarProyekInvestor } from '@/hooks/queries/useInvestor';
import { useSegarkanDataInvestor } from '@/hooks/useSegarkanDataInvestor';
import { formatPersen, formatRupiah, formatRupiahRingkas } from '@/utils/investor';

/** Daftar proyek tempat investor menanam modal. */
export default function DaftarProyekInvestorScreen() {
  const router = useRouter();
  const { data = [], isLoading, isError, isRefetching, refetch } = useDaftarProyekInvestor();
  useSegarkanDataInvestor();
  const totalModal = data.reduce((total, proyek) => total + (Number(proyek.investmentAmount) || 0), 0);

  return (
    <ScreenErrorBoundary screenName="ProyekInvestor">
      <SafeAreaView style={[tw`flex-1`, { backgroundColor: DESAIN_PREMIUM.latarLayar }]} edges={['top']}>
        <ScrollView
          contentContainerStyle={tw`px-4 pb-8`}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
        >
          <View style={tw`pt-4 pb-5`}>
            <Text style={tw`text-2xl font-bold text-slate-900`}>Proyek Saya</Text>
            {data.length > 0 ? (
              <Text style={tw`text-sm text-slate-500 mt-0.5`}>
                {data.length} proyek · total modal {formatRupiah(totalModal)}
              </Text>
            ) : null}
          </View>
          <KeadaanDaftar
            isMemuat={isLoading}
            isGalat={isError}
            isKosong={data.length === 0}
            pesanKosong="Belum ada proyek untuk Anda."
            onUlang={() => void refetch()}
          >
            {data.map((proyek) => (
              <KartuProyekInvestor
                key={proyek.id}
                nama={proyek.name}
                lokasi={proyek.siteName}
                status={proyek.status}
                rincian={[
                  { label: 'Modal saya', nilai: formatRupiah(proyek.investmentAmount) },
                  { label: 'Bagi hasil', nilai: formatPersen(proyek.profitSharePercent) },
                  { label: 'Pendapatan proyek', nilai: formatRupiahRingkas(proyek.totalActualRevenue) },
                ]}
                onTekan={() => router.push({ pathname: '/(investor)/proyek/[id]', params: { id: proyek.id } })}
              />
            ))}
          </KeadaanDaftar>
        </ScrollView>
      </SafeAreaView>
    </ScreenErrorBoundary>
  );
}
