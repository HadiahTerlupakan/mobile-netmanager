import { useRouter } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { ScreenErrorBoundary } from '@/components/atoms/ScreenErrorBoundary';
import { KartuProyekInvestor } from '@/components/organisms/investor/KartuProyekInvestor';
import { KeadaanDaftar } from '@/components/organisms/investor/KeadaanDaftar';
import { useDaftarProyekInvestor } from '@/hooks/queries/useInvestor';
import { formatPersen, formatRupiah } from '@/utils/investor';

/** Daftar proyek tempat investor menanam modal. */
export default function DaftarProyekInvestorScreen() {
  const router = useRouter();
  const { data = [], isLoading, isError, isRefetching, refetch } = useDaftarProyekInvestor();

  return (
    <ScreenErrorBoundary screenName="ProyekInvestor">
      <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
        <ScrollView
          contentContainerStyle={tw`px-4 pb-8`}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
        >
          <Text style={tw`text-2xl font-bold text-gray-900 pt-4 pb-4`}>Proyek Saya</Text>
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
                  { label: 'Pendapatan proyek', nilai: formatRupiah(proyek.totalActualRevenue) },
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
