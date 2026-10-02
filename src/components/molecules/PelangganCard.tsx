import { MapPin, Phone, type LucideIcon } from "lucide-react-native";
import React, { memo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import tw from "twrnc";

import { DESAIN_PREMIUM, GAYA_ANGKA_TABULAR, useTemaPersona } from "@/theme";
import { formatDate } from "@/utils/date";
import { bukaAlamatDiPeta, hariLewatJatuhTempo, hubungiKontak } from "@/utils/kontak";

const UKURAN_IKON = 16;

/** Data minimal kartu: cocok untuk daftar isolir maupun daftar tunggakan sales. */
export interface DataKartuPelanggan {
  nama: string;
  idPelanggan: string;
  username?: string | null;
  siteName: string | null;
  paket: string | null;
  jatuhTempo: string;
  noTelp: string | null;
  alamat: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface PelangganCardProps {
  pelanggan: DataKartuPelanggan;
  /** Tombol utama kartu, mis. "Ajukan WO" (teknisi) atau "Ingatkan" (sales). */
  aksi: { label: string; ikon: LucideIcon; onTekan: () => void; isNonaktif?: boolean };
}

/** Tombol ikon bulat kecil (telepon, peta). */
function TombolIkon({ ikon: Ikon, label, onTekan }: { ikon: LucideIcon; label: string; onTekan: () => void }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onTekan}
      style={tw`w-9 h-9 rounded-full bg-slate-100 items-center justify-center ml-2`}
    >
      <Ikon size={UKURAN_IKON} color={DESAIN_PREMIUM.ikonNetral} />
    </TouchableOpacity>
  );
}

/**
 * Baris ringkas satu pelanggan terisolir: nama & lama menunggak, paket/ID/
 * alamat satu baris, lalu tombol telepon (WhatsApp), peta, dan satu aksi utama.
 */
export const PelangganCard = memo(({ pelanggan, aksi }: PelangganCardProps) => {
  const { tw: twTema, warna } = useTemaPersona();
  const IkonAksi = aksi.ikon;
  const hariLewat = hariLewatJatuhTempo(pelanggan.jatuhTempo);
  const keterangan = [pelanggan.paket, pelanggan.idPelanggan, pelanggan.alamat ?? pelanggan.siteName]
    .filter(Boolean)
    .join(" · ");
  const lokasi =
    pelanggan.alamat ??
    (pelanggan.latitude !== null && pelanggan.longitude !== null ? `${pelanggan.latitude},${pelanggan.longitude}` : null);

  return (
    <View style={tw`bg-white mx-4 mb-2 px-4 py-3 rounded-2xl border border-slate-200/70`}>
      <View style={tw`flex-row items-center`}>
        <Text style={tw`flex-1 text-[15px] font-bold text-slate-900 mr-2`} numberOfLines={1}>
          {pelanggan.nama}
        </Text>
        <View style={tw`rounded-md px-2 py-0.5 bg-rose-50`}>
          <Text style={[tw`text-[11px] font-semibold text-rose-600`, GAYA_ANGKA_TABULAR]}>
            {hariLewat > 0 ? `Lewat ${hariLewat} hari` : `Tempo ${formatDate(pelanggan.jatuhTempo, "d MMM")}`}
          </Text>
        </View>
      </View>
      <Text style={tw`text-xs text-slate-500 mt-1`} numberOfLines={1}>
        {keterangan}
      </Text>

      <View style={tw`flex-row items-center mt-2.5`}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`${aksi.label} untuk ${pelanggan.nama}`}
          onPress={aksi.onTekan}
          disabled={aksi.isNonaktif}
          style={twTema`flex-1 flex-row items-center justify-center bg-utama-sangat-muda py-2 rounded-full ${aksi.isNonaktif ? "opacity-50" : ""}`}
        >
          <IkonAksi size={14} color={warna.utamaKuat} />
          <Text style={twTema`font-semibold text-utama-kuat text-xs ml-1.5`}>{aksi.label}</Text>
        </TouchableOpacity>
        {pelanggan.noTelp ? (
          <TombolIkon ikon={Phone} label={`Hubungi ${pelanggan.noTelp}`} onTekan={() => hubungiKontak(pelanggan.noTelp as string)} />
        ) : null}
        {lokasi ? <TombolIkon ikon={MapPin} label={`Buka peta ${pelanggan.nama}`} onTekan={() => bukaAlamatDiPeta(lokasi)} /> : null}
      </View>
    </View>
  );
});
PelangganCard.displayName = "PelangganCard";
