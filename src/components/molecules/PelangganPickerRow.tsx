import React, { memo } from "react";
import { Text, TouchableOpacity } from "react-native";
import tw from "twrnc";

import { MobilePelanggan } from "@/services/PelangganService";

interface PelangganPickerRowProps {
  pelanggan: MobilePelanggan;
  onPress: (pelanggan: MobilePelanggan) => void;
}

/** Satu baris hasil pencarian pelanggan di dalam picker. */
export const PelangganPickerRow = memo(({ pelanggan, onPress }: PelangganPickerRowProps) => (
  <TouchableOpacity
    onPress={() => onPress(pelanggan)}
    style={tw`py-3 border-b border-gray-100`}
  >
    <Text style={tw`text-gray-900 font-medium`}>{pelanggan.nama}</Text>
    <Text style={tw`text-gray-500 text-xs mt-1`}>
      {pelanggan.idPelanggan} · {pelanggan.status}
      {pelanggan.siteName ? ` · ${pelanggan.siteName}` : ""}
    </Text>
  </TouchableOpacity>
));
PelangganPickerRow.displayName = "PelangganPickerRow";
