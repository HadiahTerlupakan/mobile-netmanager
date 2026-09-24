import { useRouter } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { BagianPencairanCanvasing } from '@/components/organisms/dashboard/BagianPencairanCanvasing';
import { BagianPresurveiBeranda } from '@/components/organisms/dashboard/BagianPresurveiBeranda';
import { BerandaModeCuti } from '@/components/organisms/dashboard/BerandaModeCuti';
import { DashboardHeader } from '@/components/organisms/dashboard/DashboardHeader';
import { KartuAbsenHariIni } from '@/components/organisms/dashboard/KartuAbsenHariIni';
import { QuickMenu, type IdMenuCepat } from '@/components/organisms/dashboard/QuickMenu';
import { AppFeature } from '@/constants/features';
import { useAuth } from '@/context/AuthContext';
import { useSegarkanPresurveiSetelahSinkron } from '@/hooks/queries/usePresurveiKegiatan';
import { useSegarkanBerandaSales } from '@/hooks/useSegarkanBerandaSales';
import { bolehCanvasing, punyaFitur } from '@/utils/persona';

/**
 * Menu cepat Beranda sales (spec §3): Presurvei & Canvasing sudah jadi tab.
 * Lembur & Kalender Libur dipertahankan (ruling I5 review akhir): kemampuan
 * karyawan yang sudah ada sebelum OTA; tile terkunci sendiri tanpa izin.
 */
const MENU_CEPAT_SALES: readonly IdMenuCepat[] = ['chat', 'izin', 'lembur', 'holidays'];

/** Beranda sales karyawan: absen, ringkasan presurvei, pencairan bonus canvasing, menu cepat. */
export function KaryawanSalesDashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { isMenyegarkan, segarkan } = useSegarkanBerandaSales();
  useSegarkanPresurveiSetelahSinkron();

  // Syarat sama dengan Beranda teknisi (`KaryawanTeknisiDashboardScreen`): cuti → hanya Chat.
  if (user?.isOnLeave) {
    return <BerandaModeCuti userName={user.name || 'Karyawan'} userImage={user.image ?? null} />;
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
      <ScrollView
        testID="beranda-sales-gulir"
        contentContainerStyle={tw`pb-24`}
        refreshControl={<RefreshControl refreshing={isMenyegarkan} onRefresh={() => void segarkan()} />}
      >
        <DashboardHeader
          userName={user?.name ?? ''}
          userImage={user?.image}
          onProfilePress={() => router.push('/(app)/profile')}
        />
        {punyaFitur(user, AppFeature.ABSENSI) ? <KartuAbsenHariIni /> : null}
        <View style={tw`px-4`}>
          <BagianPresurveiBeranda isPresurveiAktif={punyaFitur(user, AppFeature.PRESURVEI)} />
        </View>
        {bolehCanvasing(user) ? <BagianPencairanCanvasing /> : null}
        <QuickMenu features={user?.features ?? []} isSales role={user?.role} isMitra={false} menuIds={MENU_CEPAT_SALES} />
      </ScrollView>
    </SafeAreaView>
  );
}
