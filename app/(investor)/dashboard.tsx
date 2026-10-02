import { useRouter } from 'expo-router';
import { ReceiptText, Users } from 'lucide-react-native';
import React from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { ScreenErrorBoundary } from '@/components/atoms/ScreenErrorBoundary';
import { JudulBagian } from '@/components/molecules/JudulBagian';
import { KartuAngka } from '@/components/molecules/KartuAngka';
import { KartuPortofolio } from '@/components/organisms/investor/KartuPortofolio';
import { KartuProyekInvestor } from '@/components/organisms/investor/KartuProyekInvestor';
import { KeadaanDaftar } from '@/components/organisms/investor/KeadaanDaftar';
import { useAuth } from '@/context/AuthContext';
import { useRingkasanInvestor } from '@/hooks/queries/useInvestor';
import { useSegarkanDataInvestor } from '@/hooks/useSegarkanDataInvestor';
import { DESAIN_PREMIUM, useTemaPersona } from '@/theme';
import type { RingkasanInvestor } from '@/types/investor';
import { formatDate } from '@/utils/date';
import { formatPersen } from '@/utils/investor';

const JAM_SIANG = 11;
const JAM_SORE = 15;
const JAM_MALAM = 18;

/** Sapaan menurut jam perangkat. */
function sapaan(jam: number): string {
  if (jam < JAM_SIANG) return 'Selamat pagi';
  if (jam < JAM_SORE) return 'Selamat siang';
  if (jam < JAM_MALAM) return 'Selamat sore';
  return 'Selamat malam';
}

function KepalaBeranda({ nama, onTekanProfil }: { nama: string; onTekanProfil: () => void }) {
  const { tw: twTema } = useTemaPersona();
  return (
    <View style={tw`flex-row items-center px-4 pt-4 pb-5`}>
      <View style={tw`flex-1`}>
        <Text style={tw`text-sm text-slate-500`}>{sapaan(new Date().getHours())},</Text>
        <Text style={tw`text-2xl font-bold text-slate-900`} numberOfLines={1}>
          {nama}
        </Text>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Buka profil"
        onPress={onTekanProfil}
        style={twTema`w-11 h-11 rounded-full bg-utama-kuat items-center justify-center`}
      >
        <Text style={tw`text-base font-bold text-white`}>{nama.charAt(0).toUpperCase() || 'I'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function IsiBeranda({ ringkasan }: { ringkasan: RingkasanInvestor }) {
  const router = useRouter();
  const pelanggan = ringkasan.subscribers;
  return (
    <View style={tw`px-4`}>
      <KartuPortofolio
        modal={ringkasan.totalInvestment}
        jumlahProyek={ringkasan.activeProjectsCount}
        bagiHasil={ringkasan.totalActualRevenue}
        modalKembali={ringkasan.totalCapitalReturned}
        uangDiterima={ringkasan.balance.totalPayout}
        siapDibayar={ringkasan.amountAwaitingPayment}
      />

      <JudulBagian judul="Kinerja pelanggan" />
      <View style={tw`flex-row gap-3`}>
        <KartuAngka ikon={Users} label="Pelanggan aktif" nilai={`${pelanggan.active} orang`} />
        <KartuAngka
          ikon={ReceiptText}
          label="Bayar bulan ini"
          nilai={`${pelanggan.paying} orang`}
          keterangan={`${formatPersen(Math.round(pelanggan.paymentRatio))} dari pelanggan aktif`}
        />
      </View>

      <JudulBagian
        judul={`Proyek saya (${ringkasan.activeProjectsCount})`}
        aksi={
          ringkasan.projects.length > 0
            ? { label: 'Lihat semua', onTekan: () => router.push('/(investor)/proyek') }
            : undefined
        }
      />
      {ringkasan.projects.length === 0 ? (
        <Text style={tw`text-slate-500`}>Belum ada proyek untuk Anda.</Text>
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
      <Text style={tw`text-center text-xs text-slate-400 mt-4`}>
        Data per {formatDate(new Date().toISOString(), 'd MMMM yyyy')} · tarik ke bawah untuk memperbarui
      </Text>
    </View>
  );
}

/** Beranda investor: ringkasan portofolio, kinerja pelanggan, dan proyek. */
export default function BerandaInvestorScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data, isLoading, isError, isRefetching, refetch } = useRingkasanInvestor();
  useSegarkanDataInvestor();

  return (
    <ScreenErrorBoundary screenName="BerandaInvestor">
      <SafeAreaView style={[tw`flex-1`, { backgroundColor: DESAIN_PREMIUM.latarLayar }]} edges={['top']}>
        <ScrollView
          contentContainerStyle={tw`pb-8`}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
        >
          <KepalaBeranda nama={user?.name ?? 'Investor'} onTekanProfil={() => router.push('/(investor)/profile')} />
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
