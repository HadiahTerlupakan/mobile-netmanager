import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import { TombolAksi } from '@/components/molecules/TombolAksi';
import type { ProspekDetail } from '@/types/presurvei';
import { daftarPilihanUbahStatus, isBolehJadikanCanvasing } from '@/utils/presurvei/aturanPresurvei';

/** Alasan aksi status dinonaktifkan saat offline. */
export const TEKS_BUTUH_ONLINE = 'Ubah Status dan Jadikan Canvasing butuh koneksi internet.';

interface AksiProspekProps {
  prospek: ProspekDetail;
  isOnline: boolean;
  isMenyimpan: boolean;
  onCatatFollowUp: () => void;
  onUbahStatus: () => void;
  onJadikanCanvasing: () => void;
}

/**
 * Aksi rincian prospek. Catat Follow-up tetap bisa offline (antrean); Ubah
 * Status dan Jadikan Canvasing butuh online (global constraint) — server
 * adalah satu-satunya sumber status terkini, dan transisi yang diantre
 * offline bisa sudah tidak sah saat terkirim.
 */
export function AksiProspek(props: AksiProspekProps) {
  const { prospek, isOnline, isMenyimpan, onCatatFollowUp, onUbahStatus, onJadikanCanvasing } = props;
  const isAdaPilihan = daftarPilihanUbahStatus(prospek.status).length > 0;
  return (
    <View style={tw`px-4 mb-4`}>
      <TombolAksi label="Catat Follow-up" onPress={onCatatFollowUp} isAktif />
      <TombolAksi label="Ubah Status" varian="kedua" onPress={onUbahStatus} isAktif={isOnline && isAdaPilihan && !isMenyimpan} />
      {isBolehJadikanCanvasing(prospek) ? (
        <TombolAksi label="Jadikan Canvasing" onPress={onJadikanCanvasing} isAktif={isOnline} />
      ) : null}
      {!isOnline ? <Text style={tw`text-xs text-amber-700`}>{TEKS_BUTUH_ONLINE}</Text> : null}
    </View>
  );
}
