import { useRouter } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { BagianKinerjaBeranda } from '@/components/organisms/dashboard/BagianKinerjaBeranda';
import { BerandaModeCuti } from '@/components/organisms/dashboard/BerandaModeCuti';
import { DashboardHeader } from '@/components/organisms/dashboard/DashboardHeader';
import { KartuAbsenHariIni } from '@/components/organisms/dashboard/KartuAbsenHariIni';
import { QuickMenu, type IdMenuCepat } from '@/components/organisms/dashboard/QuickMenu';
import { AppFeature } from '@/constants/features';
import { useAuth } from '@/context/AuthContext';
import { useProfileSync } from '@/hooks/useProfileSync';
import { useSegarkanBeranda } from '@/hooks/useSegarkanBeranda';
import { queryKeys } from '@/lib/queryClient';
import { punyaFitur } from '@/utils/persona';
import { isPemberiTugas } from '@/utils/presurvei/timRencana';

/**
 * Menu cepat staff: hanya pendukung kepegawaian, dan hanya yang berizin
 * (`isSembunyikanTerkunci`). Slip gaji (`m_salary`) belum punya layar mobile,
 * jadi belum ditawarkan.
 */
const MENU_CEPAT_STAFF: readonly IdMenuCepat[] = ['izin', 'lembur', 'holidays', 'chat'];

/** Kueri yang disegarkan saat Beranda staff ditarik: absen dan kartu penilaian kinerja. */
const KUNCI_BERANDA_STAFF = [queryKeys.attendance.all, queryKeys.presurvei.all] as const;

/**
 * Beranda staff karyawan: absen hari ini dan menu kepegawaian. Staff bukan
 * teknisi — tidak ada work order, statistik tiket, barang, topologi, isolir.
 * Dipakai juga Finance & Direktur sementara (lihat `app/(app)/dashboard.tsx`).
 */
export function KaryawanStaffDashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { profileData } = useProfileSync();
  const { isMenyegarkan, segarkan } = useSegarkanBeranda(KUNCI_BERANDA_STAFF);
  const namaPengguna = user?.name || 'Karyawan';

  // Syarat sama dengan Beranda lain: cuti → hanya Chat.
  if (user?.isOnLeave) {
    return <BerandaModeCuti userName={namaPengguna} userImage={user.image ?? null} />;
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
      <ScrollView
        testID="beranda-staff-gulir"
        contentContainerStyle={tw`pb-24`}
        refreshControl={<RefreshControl refreshing={isMenyegarkan} onRefresh={() => void segarkan()} />}
      >
        <DashboardHeader
          userName={namaPengguna}
          userImage={user?.image}
          onProfilePress={() => router.push('/(app)/profile')}
        />
        <View style={tw`px-4 pt-1 pb-4`}>
          <Text style={tw`text-sm font-medium text-gray-500`}>Selamat datang,</Text>
          <Text style={tw`text-2xl font-bold text-gray-900`}>{namaPengguna}</Text>
        </View>
        {punyaFitur(user, AppFeature.ABSENSI) ? <KartuAbsenHariIni /> : null}
        {/* Admin/manajer (lingkup TIM/SEMUA) memantau kinerja tim sales, sama seperti Beranda teknisi. */}
        {isPemberiTugas(profileData?.lingkupRencana) ? (
          <View style={tw`px-4`}>
            <BagianKinerjaBeranda isPresurveiAktif />
          </View>
        ) : null}
        <QuickMenu
          features={user?.features ?? []}
          role={user?.role}
          isMitra={false}
          menuIds={MENU_CEPAT_STAFF}
          isSembunyikanTerkunci
        />
      </ScrollView>
    </SafeAreaView>
  );
}
