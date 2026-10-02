import { useRouter } from 'expo-router';
import { CreditCard, MapPin, Search, Target, TrendingUp, type LucideIcon } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { ScreenErrorBoundary } from '@/components/atoms/ScreenErrorBoundary';
import { JudulBagian } from '@/components/molecules/JudulBagian';
import { KartuHeroGradien } from '@/components/molecules/KartuHeroGradien';
import { KepalaSapaan } from '@/components/molecules/KepalaSapaan';
import { AppFeature } from '@/constants/features';
import { useAuth } from '@/context/AuthContext';
import { useOfflineQuery } from '@/hooks/queries';
import { queryKeys } from '@/lib/queryClient';
import { DESAIN_PREMIUM, GAYA_ANGKA_TABULAR, useTemaPersona } from '@/theme';
import { formatRupiah } from '@/utils/rupiah';
import { punyaFitur } from '@/utils/persona';

/** Bagian statistik `/api/mobile/dashboard` yang dipakai Beranda mitra sales. */
interface StatistikMitraSales {
  suksesClosingMonth?: number;
  saldoKomisi?: number;
  enableFeePelanggan?: boolean;
  activeCustomers?: number;
}

const UKURAN_IKON_MENU = 22;
const UKURAN_IKON_KECIL = 14;

function AngkaKpi({ ikon: Ikon, label, nilai }: { ikon: LucideIcon; label: string; nilai: number }) {
  const { warna } = useTemaPersona();
  return (
    <View style={tw`flex-1`} accessible accessibilityLabel={`${label}: ${nilai}`}>
      <View style={tw`flex-row items-center`}>
        <Ikon size={UKURAN_IKON_KECIL} color={warna.utamaGaris} />
        <Text style={[tw`text-xs ml-1`, { color: warna.utamaGaris }]}>{label}</Text>
      </View>
      <Text style={[tw`text-xl font-bold text-white mt-0.5`, GAYA_ANGKA_TABULAR]}>{nilai}</Text>
    </View>
  );
}

/** Kartu sorotan: saldo komisi, closing bulan ini, pelanggan aktif, dan tombol pencairan. */
function KartuKomisi({ statistik, onCairkan }: { statistik: StatistikMitraSales; onCairkan: () => void }) {
  const { warna } = useTemaPersona();
  return (
    <KartuHeroGradien>
      <Text style={[tw`text-xs font-semibold uppercase tracking-wider`, { color: warna.utamaGaris }]}>Saldo komisi</Text>
      <Text style={[tw`text-3xl font-bold mt-1`, GAYA_ANGKA_TABULAR, { color: DESAIN_PREMIUM.aksenEmas }]}>
        {formatRupiah(statistik.saldoKomisi ?? 0)}
      </Text>
      <View style={[tw`flex-row mt-5 pt-4 border-t`, { borderColor: DESAIN_PREMIUM.garisDiAtasGelap }]}>
        <AngkaKpi ikon={TrendingUp} label="Closing bulan ini" nilai={statistik.suksesClosingMonth ?? 0} />
        {statistik.enableFeePelanggan ? (
          <AngkaKpi ikon={Target} label="Pelanggan aktif" nilai={statistik.activeCustomers ?? 0} />
        ) : null}
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Cairkan komisi"
        onPress={onCairkan}
        activeOpacity={0.85}
        style={tw`flex-row items-center justify-center bg-white rounded-xl py-3.5 mt-5`}
      >
        <CreditCard size={18} color={warna.utamaKuat} />
        <Text style={[tw`font-bold ml-2`, { color: warna.utamaKuat }]}>Cairkan komisi</Text>
      </TouchableOpacity>
    </KartuHeroGradien>
  );
}

function TileMenu({ ikon: Ikon, judul, keterangan, onTekan }: { ikon: LucideIcon; judul: string; keterangan: string; onTekan: () => void }) {
  const { tw: twTema, warna } = useTemaPersona();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={judul}
      onPress={onTekan}
      activeOpacity={0.7}
      style={tw`flex-1 bg-white rounded-2xl p-4 border border-slate-200/70`}
    >
      <View style={twTema`w-11 h-11 rounded-xl bg-utama-sangat-muda items-center justify-center mb-3`}>
        <Ikon size={UKURAN_IKON_MENU} color={warna.utamaKuat} />
      </View>
      <Text style={tw`text-sm font-bold text-slate-900`}>{judul}</Text>
      <Text style={tw`text-xs text-slate-500 mt-0.5`}>{keterangan}</Text>
    </TouchableOpacity>
  );
}

/** Beranda mitra sales: saldo komisi & capaian, lalu menu canvasing dan peta jangkauan. */
export function MitraSalesDashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { warna } = useTemaPersona();
  const [isMenyegarkan, setIsMenyegarkan] = useState(false);

  const { data: statistik, isPending, refetch } = useOfflineQuery<StatistikMitraSales>({
    queryKey: queryKeys.dashboard.stats(),
    endpoint: '/api/mobile/dashboard',
    enabled: !!user,
  });

  const segarkan = useCallback(async () => {
    setIsMenyegarkan(true);
    await refetch();
    setIsMenyegarkan(false);
  }, [refetch]);

  return (
    <ScreenErrorBoundary screenName="MitraSalesDashboard">
      <SafeAreaView style={[tw`flex-1`, { backgroundColor: DESAIN_PREMIUM.latarLayar }]} edges={['top']}>
        <ScrollView
          contentContainerStyle={tw`pb-24`}
          refreshControl={<RefreshControl refreshing={isMenyegarkan} onRefresh={() => void segarkan()} tintColor={warna.utamaKuat} />}
        >
          <KepalaSapaan
            nama={user?.name || 'Mitra Sales'}
            gambar={user?.image}
            onTekanProfil={() => router.push('/(app)/profile')}
            isLonceng
          />
          <View style={tw`px-4`}>
            {isPending && !statistik ? (
              <ActivityIndicator style={tw`my-12`} color={warna.utamaKuat} />
            ) : (
              <KartuKomisi statistik={statistik ?? {}} onCairkan={() => router.push('/mitra-wallet')} />
            )}

            <JudulBagian judul="Menu sales" />
            <View style={tw`flex-row gap-3`}>
              <TileMenu
                ikon={Search}
                judul="Canvasing"
                keterangan="Ajukan pelanggan baru"
                onTekan={() => router.push('/marketing/canvasing')}
              />
              {punyaFitur(user, AppFeature.TOPOLOGY) ? (
                <TileMenu
                  ikon={MapPin}
                  judul="Peta jangkauan"
                  keterangan="Cek coverage ODP"
                  onTekan={() => router.push('/(app)/topology-map')}
                />
              ) : (
                <View style={tw`flex-1`} />
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenErrorBoundary>
  );
}
