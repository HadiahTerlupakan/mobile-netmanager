import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { LABEL_STATUS_PROSPEK } from '@/constants/presurvei';
import type { ProspekListItem } from '@/types/presurvei';

interface KartuProspekProps {
  prospek: ProspekListItem;
  onBuka: (id: string) => void;
}

/** Satu prospek di daftar. */
export function KartuProspek({ prospek, onBuka }: KartuProspekProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={() => onBuka(prospek.id)}
      style={tw`bg-white rounded-xl p-3 mb-2 border border-gray-100`}
    >
      <View style={tw`flex-row justify-between`}>
        <Text style={tw`font-semibold text-gray-900 flex-1`}>{prospek.nama}</Text>
        <Text style={tw`text-xs text-blue-700`}>{LABEL_STATUS_PROSPEK[prospek.status]}</Text>
      </View>
      <Text style={tw`text-xs text-gray-500`}>{prospek.noTelp}</Text>
      <Text style={tw`text-xs text-gray-500`} numberOfLines={1}>{prospek.alamat}</Text>
    </TouchableOpacity>
  );
}
