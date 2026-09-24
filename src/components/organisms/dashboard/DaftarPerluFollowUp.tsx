import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { LABEL_STATUS_PROSPEK } from '@/constants/presurvei';
import type { ProspekPerluFollowUp } from '@/types/presurvei';
import { formatDate } from '@/utils/date';

interface DaftarPerluFollowUpProps {
  prospek: ProspekPerluFollowUp[];
  onBuka: (id: string) => void;
}

/** Prospek aktif yang paling lama tidak disentuh (maks. 5, dari server). */
export function DaftarPerluFollowUp({ prospek, onBuka }: DaftarPerluFollowUpProps) {
  return (
    <View style={tw`bg-white rounded-2xl p-4 mb-4 border border-gray-100`}>
      <Text style={tw`font-bold text-gray-900 mb-2`}>Perlu di-follow-up</Text>
      {prospek.length === 0 ? <Text style={tw`text-sm text-gray-500`}>Tidak ada prospek yang menunggu.</Text> : null}
      {prospek.map((item) => (
        <TouchableOpacity
          key={item.id}
          accessibilityRole="button"
          onPress={() => onBuka(item.id)}
          style={tw`py-2 border-b border-gray-100`}
        >
          <Text style={tw`text-sm font-semibold text-gray-900`}>{item.nama}</Text>
          <Text style={tw`text-xs text-gray-500`}>
            {`${LABEL_STATUS_PROSPEK[item.status]} · terakhir ${formatDate(item.sentuhanTerakhir, 'dd MMM')}`}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
