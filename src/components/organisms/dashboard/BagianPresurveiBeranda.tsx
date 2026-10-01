import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import tw from 'twrnc';

import { QueryErrorState } from '@/components/molecules/QueryErrorState';
import { RUTE_BUAT_RENCANA, ruteRincianProspek, ruteRincianRencana } from '@/constants/rutePresurvei';
import { useLingkupRencana } from '@/hooks/presurvei/useLingkupRencana';
import { useKegiatanMenungguKirim } from '@/hooks/queries/usePresurveiKegiatan';
import { useDaftarRencana } from '@/hooks/queries/usePresurveiRencana';
import { useRingkasanPresurvei } from '@/hooks/queries/useRingkasanPresurvei';
import { keadaanRingkasan, rekapKegiatanHariIni } from '@/utils/presurvei/berandaSales';
import { FILTER_RENCANA_TERLEWAT, filterRencanaHarian } from '@/utils/presurvei/rencana';
import { filterMilikSendiri } from '@/utils/presurvei/timRencana';
import { BagianKinerjaBeranda } from './BagianKinerjaBeranda';
import { BagianTimHariIni } from './BagianTimHariIni';
import { DaftarPerluFollowUp } from './DaftarPerluFollowUp';
import { KartuKegiatanHariIni } from './KartuKegiatanHariIni';
import { KartuRencanaHariIni } from './KartuRencanaHariIni';
import { KartuTargetBulanIni } from './KartuTargetBulanIni';

/** Pesan saat presurvei belum aktif (tanpa izin, atau server menolak 403). */
export const TEKS_PRESURVEI_BELUM_AKTIF = 'Presurvei belum diaktifkan untuk akun Anda. Hubungi admin.';

interface BagianPresurveiBerandaProps {
  isPresurveiAktif: boolean;
}

/**
 * Ringkasan presurvei di Beranda sales: rencana hari ini (milik sendiri),
 * tim hari ini (khusus pemberi tugas), kinerja bulan ini (kartu tim bagi
 * kepala sales, kartu pribadi bagi sales), kegiatan hari ini, target, perlu
 * follow-up. Query rencana berbagi cache dengan sub-tab Rencana (Saya).
 * 403 tampil sebagai "belum aktif" tanpa toast global — toast diredam oleh
 * `meta.silentToastStatuses` di `useRingkasanPresurvei` (Review Focus #4).
 */
export function BagianPresurveiBeranda({ isPresurveiAktif }: BagianPresurveiBerandaProps) {
  const router = useRouter();
  const ringkasan = useRingkasanPresurvei(isPresurveiAktif);
  const antrean = useKegiatanMenungguKirim();
  const lingkup = useLingkupRencana();
  const rencanaHariIni = useDaftarRencana(filterMilikSendiri(filterRencanaHarian(new Date()), lingkup), isPresurveiAktif);
  const rencanaTerlewat = useDaftarRencana(filterMilikSendiri(FILTER_RENCANA_TERLEWAT, lingkup), isPresurveiAktif);
  const keadaan = keadaanRingkasan({ isPresurveiAktif, hasData: ringkasan.data !== undefined, error: ringkasan.error });

  if (keadaan === 'belum-aktif') return <Text style={tw`text-sm text-gray-500 mb-4`}>{TEKS_PRESURVEI_BELUM_AKTIF}</Text>;
  if (keadaan === 'memuat') return <ActivityIndicator style={tw`my-4`} />;
  if (keadaan === 'galat' || ringkasan.data === undefined) {
    return <QueryErrorState message="Ringkasan presurvei gagal dimuat." onRetry={() => void ringkasan.refetch()} />;
  }
  return (
    <View>
      <KartuRencanaHariIni
        rencanaHariIni={rencanaHariIni.data?.data ?? []}
        jumlahTerlewat={rencanaTerlewat.data?.meta.total ?? 0}
        onBuka={(id) => router.push(ruteRincianRencana(id))}
        onBuat={() => router.push(RUTE_BUAT_RENCANA)}
      />
      {lingkup.isPemberiTugas ? <BagianTimHariIni /> : null}
      <BagianKinerjaBeranda isPresurveiAktif={isPresurveiAktif} />
      <KartuKegiatanHariIni
        rekap={rekapKegiatanHariIni(ringkasan.data.kegiatanHariIni)}
        jumlahMenunggu={antrean.data?.filter((kegiatan) => kegiatan.status !== 'FAILED').length ?? 0}
      />
      <KartuTargetBulanIni target={ringkasan.data.target} />
      <DaftarPerluFollowUp prospek={ringkasan.data.perluFollowUp} onBuka={(id) => router.push(ruteRincianProspek(id))} />
    </View>
  );
}
