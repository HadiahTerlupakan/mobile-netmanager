import { FileText } from "lucide-react-native";
import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import tw from "twrnc";

import { useTemaPersona } from "@/theme";

const UKURAN_IKON_DOKUMEN = 16;

interface AksiPengesahanProps {
  isBolehTandaTangan: boolean;
  /** Surat yang dibatalkan/kedaluwarsa tidak lagi menyajikan dokumen. */
  isBolehLihatDokumen: boolean;
  isMembukaDokumen: boolean;
  /** Surat sudah sah dan berkas final tersedia. */
  isDokumenSah: boolean;
  onLihatDokumen: () => void;
  onTandaTangan: () => void;
  onTolak: () => void;
}

/** Bilah aksi bawah detail surat: lihat dokumen, lalu tanda tangani / tolak bila giliran saya. */
export function AksiPengesahan(props: AksiPengesahanProps) {
  const { warna } = useTemaPersona();
  if (!props.isBolehLihatDokumen && !props.isBolehTandaTangan) return null;
  return (
    <View style={tw`p-4 bg-white border-t border-gray-100`}>
      {props.isBolehLihatDokumen ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: props.isMembukaDokumen }}
          disabled={props.isMembukaDokumen}
          onPress={props.onLihatDokumen}
          style={tw`flex-row items-center justify-center rounded-xl py-3 border border-slate-200`}
        >
          {props.isMembukaDokumen ? (
            <ActivityIndicator size="small" color={warna.utamaKuat} />
          ) : (
            <FileText size={UKURAN_IKON_DOKUMEN} color={warna.utamaKuat} />
          )}
          <Text style={tw`ml-2 font-semibold text-slate-800`}>
            {props.isDokumenSah ? "Lihat dokumen sah" : "Lihat dokumen"}
          </Text>
        </TouchableOpacity>
      ) : null}
      {props.isBolehTandaTangan ? (
        <View style={tw`flex-row ${props.isBolehLihatDokumen ? "mt-3" : ""}`}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={props.onTolak}
            style={tw`flex-1 mr-2 rounded-xl py-3 items-center bg-red-50`}
          >
            <Text style={tw`font-bold text-red-700`}>Tolak</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={props.onTandaTangan}
            style={[
              tw`flex-1 rounded-xl py-3 items-center`,
              { backgroundColor: warna.utamaKuat },
            ]}
          >
            <Text style={tw`font-bold text-white`}>Tanda tangani</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}
