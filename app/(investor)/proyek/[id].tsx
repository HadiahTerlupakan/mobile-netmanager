import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { ScreenErrorBoundary } from '@/components/atoms/ScreenErrorBoundary';
import { KepalaLayar } from '@/components/molecules/KepalaLayar';
import { LencanaStatus } from '@/components/molecules/LencanaStatus';
import { KartuAngka } from '@/components/organisms/investor/KartuAngka';
import { KeadaanDaftar } from '@/components/organisms/investor/KeadaanDaftar';
import { STATUS_PROYEK } from '@/constants/investor';
import { useRincianProyekInvestor } from '@/hooks/queries/useInvestor';
import type { CapaianBulananProyek, RincianProyekInvestor } from '@/types/investor';
import { formatPersen, formatRupiah, labelBulanProyek, tampilanStatus } from '@/utils/investor';

/** Capaian bulanan terbaru dulu (bulan ke-n terbesar). */
function urutkanTerbaru(daftar: CapaianBulananProyek[]): CapaianBulananProyek[] {
  return [...daftar].sort((a, b) => b.month - a.month);
}

function IsiRincian({ proyek }: { proyek: RincianProyekInvestor }) {
  const pelanggan = proyek.subscribers;
  const capaian = urutkanTerbaru(proyek.actualAchievements);
  return (
    <View style={tw`px-4 pt-4`}>
      <Text style={tw`text-xl font-bold text-gray-900`}>{proyek.name}</Text>
      {proyek.siteName ? <Text style={tw`text-sm text-gray-500 mt-0.5`}>{proyek.siteName}</Text> : null}
      <View style={tw`mt-2`}>
        <LencanaStatus status={tampilanStatus(STATUS_PROYEK, proyek.status)} />
      </View>
      {proyek.description ? <Text style={tw`text-sm text-gray-700 mt-3`}>{proyek.description}</Text> : null}

      <View style={tw`flex-row gap-3 mt-4`}>
        <KartuAngka label="Modal saya di proyek ini" nilai={formatRupiah(proyek.investmentAmount)} />
        <KartuAngka label="Bagian bagi hasil saya" nilai={formatPersen(proyek.profitSharePercent)} />
      </View>
      <View style={tw`flex-row gap-3 mt-3`}>
        <KartuAngka
          label="Pelanggan aktif"
          nilai={`${pelanggan.active} orang`}
          keterangan={proyek.targetSubscribers ? `Target ${proyek.targetSubscribers} orang` : undefined}
        />
        <KartuAngka
          label="Sudah bayar bulan ini"
          nilai={`${pelanggan.paying} orang`}
          keterangan={`Perkiraan pendapatan ${formatRupiah(proyek.estimatedCurrentRevenue)}`}
        />
      </View>

      <Text style={tw`text-base font-bold text-gray-900 mt-6 mb-3`}>Hasil per bulan</Text>
      {capaian.length === 0 ? (
        <Text style={tw`text-gray-500`}>Belum ada laporan bulanan.</Text>
      ) : (
        capaian.map((bulan) => (
          <View key={bulan.id} style={tw`flex-row bg-white rounded-xl p-4 border border-gray-100 mb-2`}>
            <View style={tw`flex-1`}>
              <Text style={tw`font-semibold text-gray-900`}>{labelBulanProyek(bulan.month, proyek.startDate)}</Text>
              <Text style={tw`text-sm text-gray-900`}>Pendapatan {formatRupiah(bulan.achievedRevenue)}</Text>
              <Text style={tw`text-xs text-gray-500 mt-0.5`}>Biaya operasional {formatRupiah(bulan.opex)}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

/** Rincian satu proyek investor. */
export default function RincianProyekInvestorScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, isRefetching, refetch } = useRincianProyekInvestor(id);

  return (
    <ScreenErrorBoundary screenName="RincianProyekInvestor">
      <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top', 'bottom']}>
        <KepalaLayar judul="Rincian Proyek" />
        <ScrollView
          contentContainerStyle={tw`pb-8`}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
        >
          <KeadaanDaftar
            isMemuat={isLoading}
            isGalat={isError}
            isKosong={false}
            pesanKosong=""
            onUlang={() => void refetch()}
          >
            {data ? <IsiRincian proyek={data} /> : null}
          </KeadaanDaftar>
        </ScrollView>
      </SafeAreaView>
    </ScreenErrorBoundary>
  );
}
