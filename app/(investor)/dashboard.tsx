import { useRouter } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { ScreenErrorBoundary } from '@/components/atoms/ScreenErrorBoundary';
import { KartuAngka } from '@/components/organisms/investor/KartuAngka';
import { KartuProyekInvestor } from '@/components/organisms/investor/KartuProyekInvestor';
import { KartuSaldoModal } from '@/components/organisms/investor/KartuSaldoModal';
import { KeadaanDaftar } from '@/components/organisms/investor/KeadaanDaftar';
import { useAuth } from '@/context/AuthContext';
import { useRingkasanInvestor } from '@/hooks/queries/useInvestor';
import type { RingkasanInvestor } from '@/types/investor';
import { formatRupiah } from '@/utils/investor';

function IsiBeranda({ ringkasan }: { ringkasan: RingkasanInvestor }) {
  const router = useRouter();
  const pelanggan = ringkasan.subscribers;
  return (
    <View style={tw`px-4`}>
      <KartuSaldoModal saldo={ringkasan.balance} bagiHasilSiapDibayar={ringkasan.profitShareAwaitingPayment} />

      <View style={tw`flex-row gap-3 mt-4`}>
        <KartuAngka label="Pendapatan proyek bagian saya" nilai={formatRupiah(ringkasan.totalActualRevenue)} />
        <KartuAngka
          label="Pelanggan aktif"
          nilai={`${pelanggan.active} orang`}
          keterangan={`${pelanggan.paying} sudah bayar bulan ini`}
        />
      </View>

      <Text style={tw`text-base font-bold text-gray-900 mt-6 mb-3`}>
        Proyek saya ({ringkasan.activeProjectsCount})
      </Text>
      {ringkasan.projects.length === 0 ? (
        <Text style={tw`text-gray-500`}>Belum ada proyek untuk Anda.</Text>
      ) : (
        ringkasan.projects.map((proyek) => (
          <KartuProyekInvestor
            key={proyek.id}
            nama={proyek.name}
            lokasi={proyek.siteName}
            status={proyek.status}
            onTekan={() => router.push({ pathname: '/(investor)/proyek/[id]', params: { id: proyek.id } })}
          />
        ))
      )}
    </View>
  );
}

/** Beranda investor: modal, uang masuk, dan proyek. */
export default function BerandaInvestorScreen() {
  const { user } = useAuth();
  const { data, isLoading, isError, isRefetching, refetch } = useRingkasanInvestor();

  return (
    <ScreenErrorBoundary screenName="BerandaInvestor">
      <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
        <ScrollView
          contentContainerStyle={tw`pb-8`}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
        >
          <View style={tw`px-4 pt-4 pb-4`}>
            <Text style={tw`text-sm font-medium text-gray-500`}>Selamat datang,</Text>
            <Text style={tw`text-2xl font-bold text-gray-900`}>{user?.name ?? 'Investor'}</Text>
          </View>
          <KeadaanDaftar
            isMemuat={isLoading}
            isGalat={isError}
            isKosong={false}
            pesanKosong=""
            onUlang={() => void refetch()}
          >
            {data ? <IsiBeranda ringkasan={data} /> : null}
          </KeadaanDaftar>
        </ScrollView>
      </SafeAreaView>
    </ScreenErrorBoundary>
  );
}
