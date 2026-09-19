import { MapPin, Phone, Wrench } from "lucide-react-native";
import React, { memo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import tw from "twrnc";

import { MobilePelanggan } from "@/services/PelangganService";
import { formatDate } from "@/utils/date";

interface PelangganCardProps {
  pelanggan: MobilePelanggan;
  onRequestWorkOrder: (pelanggan: MobilePelanggan) => void;
}

/** Kartu ringkas satu pelanggan pada daftar isolir. */
export const PelangganCard = memo(({ pelanggan, onRequestWorkOrder }: PelangganCardProps) => (
  <View style={tw`bg-white mx-4 mb-3 p-4 rounded-xl border border-gray-100`}>
    <Text style={tw`text-gray-900 font-bold`}>{pelanggan.nama}</Text>
    <Text style={tw`text-gray-500 text-xs mt-1`}>
      {pelanggan.idPelanggan} · {pelanggan.username}
      {pelanggan.siteName ? ` · ${pelanggan.siteName}` : ""}
    </Text>
    <Text style={tw`text-gray-600 text-xs mt-2`}>{pelanggan.paket ?? "Paket tidak diketahui"}</Text>
    <Text style={tw`text-red-600 text-xs mt-1`}>
      Jatuh tempo {formatDate(pelanggan.jatuhTempo)}
    </Text>
    {pelanggan.alamat ? (
      <View style={tw`flex-row items-center mt-2`}>
        <MapPin size={12} color="#9ca3af" />
        <Text style={tw`text-gray-500 text-xs ml-1 flex-1`}>{pelanggan.alamat}</Text>
      </View>
    ) : null}
    {pelanggan.noTelp ? (
      <View style={tw`flex-row items-center mt-1`}>
        <Phone size={12} color="#9ca3af" />
        <Text style={tw`text-gray-500 text-xs ml-1`}>{pelanggan.noTelp}</Text>
      </View>
    ) : null}
    <TouchableOpacity
      onPress={() => onRequestWorkOrder(pelanggan)}
      style={tw`mt-3 flex-row items-center justify-center bg-blue-600 py-2 rounded-lg`}
    >
      <Wrench size={14} color="#ffffff" />
      <Text style={tw`text-white font-bold text-xs ml-2`}>Ajukan WO</Text>
    </TouchableOpacity>
  </View>
));
PelangganCard.displayName = "PelangganCard";
