import { MapPin, Phone, Wifi, WifiOff, Wrench } from "lucide-react-native";
import React, { memo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import tw from "twrnc";

import { MobilePelanggan } from "@/services/PelangganService";
import { DESAIN_PREMIUM, useTemaPersona } from "@/theme";
import { formatDate } from "@/utils/date";
import { bukaAlamatDiPeta, hariLewatJatuhTempo, hubungiKontak } from "@/utils/kontak";

const UKURAN_IKON = 14;
const WARNA_ISOLIR = "#e11d48";

interface PelangganCardProps {
  pelanggan: MobilePelanggan;
  onRequestWorkOrder: (pelanggan: MobilePelanggan) => void;
}

function BarisKontak({ ikon: Ikon, teks, warna, onTekan }: { ikon: typeof Phone; teks: string; warna?: string; onTekan: () => void }) {
  return (
    <TouchableOpacity accessibilityRole="link" accessibilityLabel={teks} onPress={onTekan} style={tw`flex-row items-center mt-1.5`}>
      <Ikon size={UKURAN_IKON} color={warna ?? DESAIN_PREMIUM.ikonNetral} />
      <Text style={[tw`text-sm ml-2 flex-1`, warna ? { color: warna } : tw`text-slate-600`]} numberOfLines={1}>
        {teks}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Kartu pelanggan terisolir: identitas, paket, berapa hari lewat jatuh
 * tempo, kontak (ketuk = WhatsApp), alamat (ketuk = peta), dan Ajukan WO.
 */
export const PelangganCard = memo(({ pelanggan, onRequestWorkOrder }: PelangganCardProps) => {
  const { tw: twTema, warna } = useTemaPersona();
  const hariLewat = hariLewatJatuhTempo(pelanggan.jatuhTempo);
  const identitas = [pelanggan.idPelanggan, pelanggan.username, pelanggan.siteName].filter(Boolean).join(" · ");
  const lokasi =
    pelanggan.alamat ?? (pelanggan.latitude !== null && pelanggan.longitude !== null ? `${pelanggan.latitude},${pelanggan.longitude}` : null);

  return (
    <View style={tw`bg-white mx-4 mb-3 p-4 rounded-2xl border border-slate-200/70`}>
      <View style={tw`flex-row items-start`}>
        <View style={tw`w-10 h-10 rounded-xl bg-rose-50 items-center justify-center mr-3`}>
          <WifiOff size={18} color={WARNA_ISOLIR} />
        </View>
        <View style={tw`flex-1`}>
          <Text style={tw`text-base font-bold text-slate-900`} numberOfLines={1}>
            {pelanggan.nama}
          </Text>
          <Text style={tw`text-xs text-slate-500 mt-0.5`} numberOfLines={1}>
            {identitas}
          </Text>
        </View>
      </View>

      <View style={tw`flex-row flex-wrap mt-3`}>
        <View style={tw`flex-row items-center rounded-md px-2 py-0.5 bg-slate-100 mr-2 mb-1`}>
          <Wifi size={11} color={DESAIN_PREMIUM.ikonNetral} />
          <Text style={tw`text-[11px] font-semibold text-slate-600 ml-1`}>{pelanggan.paket ?? "Paket tidak diketahui"}</Text>
        </View>
        <View style={tw`rounded-md px-2 py-0.5 bg-rose-50 mb-1`}>
          <Text style={tw`text-[11px] font-semibold text-rose-600`}>
            {hariLewat > 0
              ? `Lewat ${hariLewat} hari · jatuh tempo ${formatDate(pelanggan.jatuhTempo, "d MMM")}`
              : `Jatuh tempo ${formatDate(pelanggan.jatuhTempo)}`}
          </Text>
        </View>
      </View>

      <View style={tw`mt-1`}>
        {pelanggan.noTelp ? (
          <BarisKontak ikon={Phone} teks={pelanggan.noTelp} warna={warna.utamaKuat} onTekan={() => hubungiKontak(pelanggan.noTelp as string)} />
        ) : null}
        {lokasi ? <BarisKontak ikon={MapPin} teks={pelanggan.alamat ?? "Lihat lokasi di peta"} onTekan={() => bukaAlamatDiPeta(lokasi)} /> : null}
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Ajukan work order untuk ${pelanggan.nama}`}
        onPress={() => onRequestWorkOrder(pelanggan)}
        style={twTema`mt-4 flex-row items-center justify-center bg-utama-sangat-muda py-3 rounded-xl`}
      >
        <Wrench size={UKURAN_IKON} color={warna.utamaKuat} />
        <Text style={twTema`font-bold text-utama-kuat text-sm ml-2`}>Ajukan work order</Text>
      </TouchableOpacity>
    </View>
  );
});
PelangganCard.displayName = "PelangganCard";
