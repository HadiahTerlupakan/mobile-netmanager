import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

interface KartuAngkaProps {
  label: string;
  nilai: string;
  keterangan?: string;
}

/** Kotak satu angka penting dengan label yang jelas. */
export function KartuAngka({ label, nilai, keterangan }: KartuAngkaProps) {
  return (
    <View style={tw`flex-1 bg-white rounded-xl p-4 border border-gray-100`}>
      <Text style={tw`text-xs text-gray-500`}>{label}</Text>
      <Text style={tw`text-lg font-bold text-gray-900 mt-1`}>{nilai}</Text>
      {keterangan ? <Text style={tw`text-xs text-gray-500 mt-0.5`}>{keterangan}</Text> : null}
    </View>
  );
}
