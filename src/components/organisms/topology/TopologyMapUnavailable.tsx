import { AlertTriangle } from "lucide-react-native";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { useTemaPersona } from "@/theme";

import { TOPOLOGY_PALETTE } from "./topologyPalette";

const WARNING_ICON_SIZE = 64;

interface TopologyMapUnavailableProps {
  onBack: () => void;
}

/** Pesan pengganti peta saat MapLibre native tidak tersedia (mis. Expo Go). */
export function TopologyMapUnavailable({ onBack }: TopologyMapUnavailableProps) {
  const { tw } = useTemaPersona();

  return (
    <View style={tw`flex-1 items-center justify-center px-8 bg-gray-50`}>
      <AlertTriangle size={WARNING_ICON_SIZE} color={TOPOLOGY_PALETTE.warning} />
      <Text style={tw`text-xl font-bold text-gray-900 mt-6 text-center`}>
        Fitur Peta Tidak Tersedia
      </Text>
      <Text style={tw`text-gray-600 mt-4 text-center leading-6`}>
        Topology Map membutuhkan development build karena menggunakan MapLibre.
        Saat ini Anda menggunakan Expo Go yang tidak mendukung native module ini.
      </Text>
      <Text style={tw`text-sm text-gray-500 mt-6 text-center`}>
        Jalankan `npx expo run:android` atau `npx expo run:ios` untuk menggunakan fitur ini.
      </Text>
      <TouchableOpacity onPress={onBack} style={tw`mt-8 bg-utama-kuat px-8 py-4 rounded-xl`}>
        <Text style={tw`text-white font-bold`}>Kembali</Text>
      </TouchableOpacity>
    </View>
  );
}
