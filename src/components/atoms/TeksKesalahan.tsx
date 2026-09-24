import React from 'react';
import { Text } from 'react-native';
import tw from 'twrnc';

interface TeksKesalahanProps {
  pesan?: string;
}

/** Pesan kesalahan inline merah di bawah satu blok formulir; tidak merender apa pun bila kosong. */
export function TeksKesalahan({ pesan }: TeksKesalahanProps) {
  if (!pesan) return null;
  return <Text style={tw`text-red-600 text-xs mt-2`}>{pesan}</Text>;
}
