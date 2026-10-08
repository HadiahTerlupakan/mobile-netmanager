import { Href, useRouter } from 'expo-router';
import { LayoutGrid } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { EmptyState } from '@/components/atoms/EmptyState';
import { DashboardSkeleton } from '@/components/molecules/DashboardSkeleton';
import { KepalaSapaan } from '@/components/molecules/KepalaSapaan';
import { BerandaModeCuti } from '@/components/organisms/dashboard/BerandaModeCuti';
import { KartuAbsenHariIni } from '@/components/organisms/dashboard/KartuAbsenHariIni';
import { KartuPencairanCanvasing } from '@/components/organisms/dashboard/KartuPencairanCanvasing';
import { QuickMenu } from '@/components/organisms/dashboard/QuickMenu';
import { KartuCanvasingTeknisi } from '@/components/organisms/teknisi/KartuCanvasingTeknisi';
import { KartuWorkOrderTeknisi } from '@/components/organisms/teknisi/KartuWorkOrderTeknisi';
import { canvasingAdalahPekerjaannya } from '@/utils/peranCanvasing';
import { AppFeature } from '@/constants/features';
import { useAuth } from '@/context/AuthContext';
import { useOfflineQuery } from '@/hooks/queries';
import { useProfileSync } from '@/hooks/useProfileSync';
import { useStatistikBeranda } from '@/hooks/useStatistikBeranda';
import { queryKeys } from '@/lib/queryClient';
import { DESAIN_PREMIUM } from '@/theme';
import { isPersonaMitra, punyaFitur, tentukanPersona } from '@/utils/persona';

interface CanvasingSummary {
  completedToday: number;
  completedWeek: number;
  completedMonth: number;
  approved: number;
}

/**
 * Beranda teknisi karyawan (dan bawaan saat user belum dimuat): kartu sorotan
 * Work order saya (ditugaskan, tersedia, tiket selesai), absen hari ini,
 * canvasing HANYA bila canvasing memang pekerjaannya, pencairan bonus bila
 * berwenang, lalu menu cepat.
 *
 * Teknisi bukan sales: kinerja tim sales tidak ditampilkan di sini, dan kartu
 * canvasing tidak muncul hanya karena role kebetulan memegang `m_canvasing`.
 * Pintunya tetap ada di menu cepat dan tab.
 */
export function KaryawanTeknisiDashboardScreen() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [isMenyegarkan, setIsMenyegarkan] = useState(false);
  const { profileData, hasFeature, refetch: refetchProfile, isPending: loadingProfile } = useProfileSync();
  const { data: statsData, isPending: loadingStats, refetch: refetchStats } = useStatistikBeranda();
  const {
    data: canvasingSummary,
    isPending: loadingCanvasing,
    refetch: refetchCanvasing,
  } = useOfflineQuery<CanvasingSummary>({
    queryKey: queryKeys.canvasing.summary(),
    endpoint: '/api/marketing/canvasing/summary',
    select: (data: { data?: CanvasingSummary } & Partial<CanvasingSummary>) =>
      (data?.data ?? data) as CanvasingSummary,
    enabled: !!token,
  });

  const hasWorkOrder = hasFeature(AppFeature.WORK_ORDER);
  const hasCanvasing = hasFeature(AppFeature.CANVASING);
  // Teknisi hanya bisa mencairkan bila role-nya diberi izin cashout (opsional per role).
  const bisaCairkanBonus = profileData?.canCashoutCanvasing ?? user?.isSales === true;
  // Izin menjawab "boleh masuk?", bukan "ini pekerjaannya?". Sorotan beranda
  // butuh pertanyaan kedua, supaya beranda teknisi tidak terbaca separuh sales.
  const sorotkanCanvasing = canvasingAdalahPekerjaannya({
    punyaIzinCanvasing: hasCanvasing,
    isSales: user?.isSales,
  });
  const namaPengguna = profileData?.name || user?.name || 'Karyawan';
  const gambar = profileData?.image ?? user?.image;

  const segarkan = useCallback(async () => {
    setIsMenyegarkan(true);
    await Promise.all([refetchStats(), refetchProfile(), refetchCanvasing()]);
    setIsMenyegarkan(false);
  }, [refetchStats, refetchProfile, refetchCanvasing]);

  const isMemuat =
    (loadingStats && !statsData) ||
    (loadingProfile && !profileData) ||
    (hasCanvasing && loadingCanvasing && !canvasingSummary);

  if (isMemuat) {
    return <DashboardSkeleton />;
  }

  if (user?.isOnLeave) {
    return <BerandaModeCuti userName={namaPengguna} userImage={gambar ?? null} />;
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[tw`flex-1`, { backgroundColor: DESAIN_PREMIUM.latarLayar }]}>
      <ScrollView
        testID="beranda-teknisi-gulir"
        contentContainerStyle={tw`pb-6`}
        refreshControl={<RefreshControl refreshing={isMenyegarkan} onRefresh={() => void segarkan()} />}
      >
        <KepalaSapaan
          nama={namaPengguna}
          gambar={gambar}
          onTekanProfil={() => router.push('/(app)/profile' as Href)}
          isLonceng
        />

        {hasWorkOrder ? (
          <View style={tw`px-4 mb-4`}>
            <KartuWorkOrderTeknisi
              ringkasan={{
                ditugaskan: statsData?.workOrdersAssigned || 0,
                tersedia: statsData?.workOrdersPending || 0,
                selesaiHariIni: statsData?.woCompletedToday || 0,
                selesaiMinggu: statsData?.woCompletedWeek || 0,
                selesaiBulan: statsData?.woCompletedMonth || 0,
              }}
              onBuka={() => router.push('/(app)/work-order' as Href)}
            />
          </View>
        ) : null}

        {punyaFitur(user, AppFeature.ABSENSI) ? <KartuAbsenHariIni /> : null}

        {sorotkanCanvasing ? (
          <View style={tw`px-4`}>
            <KartuCanvasingTeknisi
              ringkasan={{
                disetujui: canvasingSummary?.approved || 0,
                selesaiHariIni: canvasingSummary?.completedToday || 0,
                selesaiMinggu: canvasingSummary?.completedWeek || 0,
                selesaiBulan: canvasingSummary?.completedMonth || 0,
              }}
              onBuka={() => router.push('/(app)/marketing/canvasing' as Href)}
            />
          </View>
        ) : null}
        {sorotkanCanvasing && bisaCairkanBonus ? (
          <KartuPencairanCanvasing statistik={statsData} onBerhasilCair={() => void refetchStats()} />
        ) : null}

        {!hasWorkOrder && !hasCanvasing ? (
          <EmptyState ikon={LayoutGrid} judul="Tidak ada modul aktif" pesan="Hubungi admin untuk mengaktifkan modul kerja Anda." />
        ) : null}

        <QuickMenu
          features={profileData?.features || user?.features || []}
          role={user?.role}
          isMitra={isPersonaMitra(tentukanPersona(user))}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
