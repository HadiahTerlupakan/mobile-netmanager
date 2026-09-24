import React from 'react';
import { View } from 'react-native';
import tw from 'twrnc';

interface KartuFormulirProps {
  children: React.ReactNode;
}

/** Kartu putih bersudut membulat pembungkus satu blok formulir. */
export function KartuFormulir({ children }: KartuFormulirProps) {
  return <View style={tw`bg-white rounded-2xl p-4 mb-4 border border-gray-100`}>{children}</View>;
}
