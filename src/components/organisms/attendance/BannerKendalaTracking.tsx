import React from 'react';
import { Text, View } from 'react-native';

import type { KendalaTracking } from '@/services/kesiapanTracking';
import { useTemaPersona } from '@/theme';

interface BannerKendalaTrackingProps {
  kendala: KendalaTracking | null;
  sedangBekerja: boolean;
}

/** Pengingat tetap di layar absensi selama tracking lokasi tidak bisa berjalan. */
export function BannerKendalaTracking({ kendala, sedangBekerja }: BannerKendalaTrackingProps) {
  const { tw } = useTemaPersona();
  if (!kendala) return null;
  return (
    <View style={tw`bg-red-50 border border-red-200 rounded-xl p-3 mb-3`}>
      <Text style={tw`text-red-700 text-sm font-semibold`}>
        {sedangBekerja
          ? 'Tracking lokasi mati — kejadian ini tercatat.'
          : 'Tracking lokasi belum aktif — check-in tidak bisa dilakukan.'}
      </Text>
      <Text style={tw`text-red-600 text-xs mt-1`}>
        {kendala === 'gps-mati'
          ? 'Nyalakan GPS (Lokasi) perangkat.'
          : 'Atur izin lokasi aplikasi ke "Izinkan sepanjang waktu".'}
      </Text>
    </View>
  );
}
