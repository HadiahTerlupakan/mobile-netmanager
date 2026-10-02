import { useRouter } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { KepalaSapaan } from '@/components/molecules/KepalaSapaan';
import { BerandaModeCuti } from '@/components/organisms/dashboard/BerandaModeCuti';
import { KartuAbsenHariIni } from '@/components/organisms/dashboard/KartuAbsenHariIni';
import { QuickMenu, type IdMenuCepat } from '@/components/organisms/dashboard/QuickMenu';
import { AppFeature } from '@/constants/features';
import { useAuth } from '@/context/AuthContext';
import { useSegarkanBeranda } from '@/hooks/useSegarkanBeranda';
import { queryKeys } from '@/lib/queryClient';
import { DESAIN_PREMIUM } from '@/theme';
import { punyaFitur } from '@/utils/persona';

/**
 * Menu cepat staff: hanya pendukung kepegawaian, dan hanya yang berizin
 * (`isSembunyikanTerkunci`). Slip gaji (`m_salary`) belum punya layar mobile,
 * jadi belum ditawarkan.
 */
const MENU_CEPAT_STAFF: readonly IdMenuCepat[] = ['izin', 'lembur', 'holidays', 'chat'];

/** Kueri yang disegarkan saat Beranda staff ditarik: absen. */
const KUNCI_BERANDA_STAFF = [queryKeys.attendance.all] as const;

/**
 * Beranda staff karyawan: absen hari ini dan menu kepegawaian. Staff bukan
 * teknisi maupun sales — tidak ada work order, statistik tiket, barang,
 * topologi, isolir, ataupun kinerja tim sales (walau role-nya berizin
 * memantau rencana; pemantauan lewat layar Penilaian).
 * Dipakai juga Finance & Direktur sementara (lihat `app/(app)/dashboard.tsx`).
 */
export function KaryawanStaffDashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { isMenyegarkan, segarkan } = useSegarkanBeranda(KUNCI_BERANDA_STAFF);
  const namaPengguna = user?.name || 'Karyawan';

  // Syarat sama dengan Beranda lain: cuti → hanya Chat.
  if (user?.isOnLeave) {
    return <BerandaModeCuti userName={namaPengguna} userImage={user.image ?? null} />;
  }

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: DESAIN_PREMIUM.latarLayar }]} edges={['top']}>
      <ScrollView
        testID="beranda-staff-gulir"
        contentContainerStyle={tw`pb-24`}
        refreshControl={<RefreshControl refreshing={isMenyegarkan} onRefresh={() => void segarkan()} />}
      >
        <KepalaSapaan
          nama={namaPengguna}
          gambar={user?.image}
          onTekanProfil={() => router.push('/(app)/profile')}
          isLonceng
        />
        {punyaFitur(user, AppFeature.ABSENSI) ? <KartuAbsenHariIni /> : null}
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
