import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import { LABEL_STATUS_PROSPEK } from '@/constants/presurvei';
import type { ProspekDetail } from '@/types/presurvei';

interface KartuRincianProspekProps {
  prospek: ProspekDetail;
}

/** Kontak dan status prospek. */
export function KartuRincianProspek({ prospek }: KartuRincianProspekProps) {
  return (
    <View style={tw`bg-white rounded-2xl p-4 m-4 border border-gray-100`}>
      <Text style={tw`text-lg font-bold text-gray-900`}>{prospek.nama}</Text>
      <Text style={tw`text-sm text-blue-700 mb-2`}>{LABEL_STATUS_PROSPEK[prospek.status]}</Text>
      <Text style={tw`text-sm text-gray-700`}>{prospek.noTelp}</Text>
      <Text style={tw`text-sm text-gray-700`}>{prospek.alamat}</Text>
      {prospek.paketDiminati !== null ? <Text style={tw`text-sm text-gray-500 mt-1`}>{`Paket: ${prospek.paketDiminati}`}</Text> : null}
      {prospek.catatan !== null ? <Text style={tw`text-sm text-gray-500 mt-1`}>{prospek.catatan}</Text> : null}
    </View>
  );
}
