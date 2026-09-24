import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import tw from 'twrnc';

import { QueryErrorState } from '@/components/molecules/QueryErrorState';
import { ruteRincianProspek } from '@/constants/rutePresurvei';
import { useKegiatanMenungguKirim } from '@/hooks/queries/usePresurveiKegiatan';
import { useRingkasanPresurvei } from '@/hooks/queries/useRingkasanPresurvei';
import { keadaanRingkasan, rekapKegiatanHariIni } from '@/utils/presurvei/berandaSales';
import { DaftarPerluFollowUp } from './DaftarPerluFollowUp';
import { KartuKegiatanHariIni } from './KartuKegiatanHariIni';
import { KartuTargetBulanIni } from './KartuTargetBulanIni';

/** Pesan saat presurvei belum aktif (tanpa izin, atau server menolak 403). */
export const TEKS_PRESURVEI_BELUM_AKTIF = 'Presurvei belum diaktifkan untuk akun Anda. Hubungi admin.';

interface BagianPresurveiBerandaProps {
  isPresurveiAktif: boolean;
}

/**
 * Ringkasan presurvei di Beranda sales: hari ini, target, perlu follow-up.
 * 403 tampil sebagai "belum aktif" tanpa toast global — toast diredam oleh
 * `meta.silentToastStatuses` di `useRingkasanPresurvei` (Review Focus #4).
 */
export function BagianPresurveiBeranda({ isPresurveiAktif }: BagianPresurveiBerandaProps) {
  const router = useRouter();
  const ringkasan = useRingkasanPresurvei(isPresurveiAktif);
  const antrean = useKegiatanMenungguKirim();
  const keadaan = keadaanRingkasan({ isPresurveiAktif, hasData: ringkasan.data !== undefined, error: ringkasan.error });

  if (keadaan === 'belum-aktif') return <Text style={tw`text-sm text-gray-500 mb-4`}>{TEKS_PRESURVEI_BELUM_AKTIF}</Text>;
  if (keadaan === 'memuat') return <ActivityIndicator style={tw`my-4`} />;
  if (keadaan === 'galat' || ringkasan.data === undefined) {
    return <QueryErrorState message="Ringkasan presurvei gagal dimuat." onRetry={() => void ringkasan.refetch()} />;
  }
  return (
    <View>
      <KartuKegiatanHariIni
        rekap={rekapKegiatanHariIni(ringkasan.data.kegiatanHariIni)}
        jumlahMenunggu={antrean.data?.filter((kegiatan) => kegiatan.status !== 'FAILED').length ?? 0}
      />
      <KartuTargetBulanIni target={ringkasan.data.target} />
      <DaftarPerluFollowUp prospek={ringkasan.data.perluFollowUp} onBuka={(id) => router.push(ruteRincianProspek(id))} />
    </View>
  );
}
