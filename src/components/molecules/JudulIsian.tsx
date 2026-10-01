import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

interface JudulIsianProps {
  judul: string;
  /** true → "(wajib diisi)" merah; false → "(boleh dikosongkan)" abu-abu. */
  isWajib: boolean;
  /** Kalimat bantuan singkat di bawah judul. */
  petunjuk?: string;
}

/** Judul satu kartu isian beserta tanda wajib/boleh kosong dan petunjuk singkat. */
export function JudulIsian({ judul, isWajib, petunjuk }: JudulIsianProps) {
  return (
    <>
      <Text style={tw`font-bold text-gray-900 text-base`}>
        {`${judul} `}
        {isWajib ? (
          <Text style={tw`text-red-600`}>(wajib diisi)</Text>
        ) : (
          <Text style={tw`text-gray-500 font-normal`}>(boleh dikosongkan)</Text>
        )}
      </Text>
      {petunjuk ? <Text style={tw`text-xs text-gray-500 mb-2`}>{petunjuk}</Text> : <View style={tw`h-2`} />}
    </>
  );
}
