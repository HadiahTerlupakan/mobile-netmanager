import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { KepalaSapaan } from '@/components/molecules/KepalaSapaan';
import { BerandaModeCuti } from '@/components/organisms/dashboard/BerandaModeCuti';
import { QuickMenu, type IdMenuCepat } from '@/components/organisms/dashboard/QuickMenu';
import { KartuHariIniStaff } from '@/components/organisms/staff/KartuHariIniStaff';
import { KartuLiburBerikutnya } from '@/components/organisms/staff/KartuLiburBerikutnya';
import { KartuPengajuanSaya } from '@/components/organisms/staff/KartuPengajuanSaya';
import { useAuth } from '@/context/AuthContext';
import { KUNCI_BERANDA_STAFF, useBerandaStaff } from '@/hooks/useBerandaStaff';
import { useSegarkanBeranda } from '@/hooks/useSegarkanBeranda';
import { DESAIN_PREMIUM } from '@/theme';

/**
 * Menu cepat staff: hanya pendukung kepegawaian, dan hanya yang berizin
 * (`isSembunyikanTerkunci`). Slip gaji (`m_salary`) belum punya layar mobile,
 * jadi belum ditawarkan. Pengesahan tampil hanya bila ada surat untuk saya.
 */
const MENU_CEPAT_STAFF: readonly IdMenuCepat[] = ['pengesahan', 'izin', 'lembur', 'holidays', 'chat'];

const RUTE_IZIN = '/(app)/izin';
const RUTE_LEMBUR = '/(app)/lembur';

/**
 * Beranda staff karyawan: kartu Hari ini (tanggal, jam kerja/libur, absen),
 * pengajuan izin & lembur terbaru, libur berikutnya, dan menu kepegawaian.
 * Staff bukan teknisi maupun sales — tidak ada work order, statistik tiket,
 * barang, topologi, isolir, ataupun kinerja tim sales. Dipakai juga Finance
 * & Direktur sementara (lihat `app/(app)/dashboard.tsx`).
 */
export function KaryawanStaffDashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const sekarang = useMemo(() => new Date(), []);
  const beranda = useBerandaStaff(sekarang);
  const { isMenyegarkan, segarkan } = useSegarkanBeranda(KUNCI_BERANDA_STAFF);
  const namaPengguna = user?.name || 'Karyawan';

  // Syarat sama dengan Beranda lain: cuti → hanya Chat.
  if (user?.isOnLeave) {
    return <BerandaModeCuti userName={namaPengguna} userImage={user.image ?? null} />;
  }

  const aksiPengajuan = [
    ...(beranda.fitur.izin ? [{ label: 'Ajukan izin', onTekan: () => router.push(`${RUTE_IZIN}/form`) }] : []),
    ...(beranda.fitur.lembur ? [{ label: 'Ajukan lembur', onTekan: () => router.push(RUTE_LEMBUR) }] : []),
  ];

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
        <View style={tw`px-4`}>
          <KartuHariIniStaff
            sekarang={sekarang}
            jamKerja={beranda.jamKerja}
            libur={beranda.liburHariIni}
            absen={beranda.absen}
            onBukaAbsensi={beranda.fitur.absensi ? () => router.push('/(app)/absensi') : null}
          />
          {beranda.fitur.izin || beranda.fitur.lembur ? (
            <View style={tw`mt-4`}>
              <KartuPengajuanSaya
                baris={beranda.pengajuan}
                jumlahMenunggu={beranda.jumlahMenunggu}
                aksi={aksiPengajuan}
                onBukaBaris={(jenis) => router.push(jenis === 'IZIN' ? RUTE_IZIN : RUTE_LEMBUR)}
              />
            </View>
          ) : null}
          {beranda.liburBerikutnya ? (
            <KartuLiburBerikutnya
              libur={beranda.liburBerikutnya.libur}
              sisaHari={beranda.liburBerikutnya.sisaHari}
              onBuka={() => router.push('/(app)/holidays')}
            />
          ) : null}
        </View>
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
