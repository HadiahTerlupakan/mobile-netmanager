import { useRouter } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { KepalaSapaan } from '@/components/molecules/KepalaSapaan';
import { BagianPencairanCanvasing } from '@/components/organisms/dashboard/BagianPencairanCanvasing';
import { BagianPresurveiBeranda } from '@/components/organisms/dashboard/BagianPresurveiBeranda';
import { BerandaModeCuti } from '@/components/organisms/dashboard/BerandaModeCuti';
import { KartuTunggakanBeranda } from '@/components/organisms/dashboard/KartuTunggakanBeranda';
import { KartuAbsenHariIni } from '@/components/organisms/dashboard/KartuAbsenHariIni';
import { QuickMenu, type IdMenuCepat } from '@/components/organisms/dashboard/QuickMenu';
import { AppFeature } from '@/constants/features';
import { useAuth } from '@/context/AuthContext';
import { DESAIN_PREMIUM } from '@/theme';
import { useSegarkanPresurveiSetelahSinkron } from '@/hooks/queries/usePresurveiKegiatan';
import { useSegarkanBerandaSales } from '@/hooks/useSegarkanBerandaSales';
import { bolehCanvasing, punyaFitur } from '@/utils/persona';

/**
 * Menu cepat Beranda sales (spec §3): Presurvei & Canvasing sudah jadi tab.
 * Pelanggan saya & Keluhan: sales jadi pintu pertama keluhan pelanggannya.
 * Lembur tidak ditawarkan: sales tidak mengenal lembur (keputusan pemilik
 * 2026-09-26). Kalender Libur tetap; tile terkunci sendiri tanpa izin.
 */
const MENU_CEPAT_SALES: readonly IdMenuCepat[] = ['pelanggan-saya', 'keluhan', 'tunggakan', 'chat', 'izin', 'holidays'];

/** Beranda sales karyawan: sapaan, absen, kinerja & aktivitas presurvei, bonus canvasing, menu cepat. */
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
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: DESAIN_PREMIUM.latarLayar }]} edges={['top']}>
      <ScrollView
        testID="beranda-sales-gulir"
        contentContainerStyle={tw`pb-24`}
        refreshControl={<RefreshControl refreshing={isMenyegarkan} onRefresh={() => void segarkan()} />}
      >
        <KepalaSapaan
          nama={user?.name || 'Sales'}
          gambar={user?.image}
          onTekanProfil={() => router.push('/(app)/profile')}
          isLonceng
        />
        {punyaFitur(user, AppFeature.ABSENSI) ? <KartuAbsenHariIni /> : null}
        <View style={tw`px-4`}>
          <BagianPresurveiBeranda isPresurveiAktif={punyaFitur(user, AppFeature.PRESURVEI)} />
          <KartuTunggakanBeranda isAktif={punyaFitur(user, AppFeature.PRESURVEI)} />
        </View>
        {bolehCanvasing(user) ? <BagianPencairanCanvasing /> : null}
        <QuickMenu features={user?.features ?? []} role={user?.role} isMitra={false} menuIds={MENU_CEPAT_SALES} />
      </ScrollView>
    </SafeAreaView>
  );
}
