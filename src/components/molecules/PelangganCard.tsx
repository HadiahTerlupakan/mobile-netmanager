import React, { memo } from "react";
import { Text, View } from "react-native";
import tw from "twrnc";

import { BarisAksiPelanggan, type AksiUtamaPelanggan } from "@/components/molecules/BarisAksiPelanggan";
import { GAYA_ANGKA_TABULAR } from "@/theme";
import { formatDate } from "@/utils/date";
import { hariLewatJatuhTempo, keteranganPelanggan, tujuanPetaPelanggan } from "@/utils/kontak";

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
  aksi: AksiUtamaPelanggan;
}

/**
 * Baris ringkas satu pelanggan terisolir: nama & lama menunggak, paket/ID/
 * alamat satu baris, lalu tombol telepon (WhatsApp), peta, dan satu aksi utama.
 */
export const PelangganCard = memo(({ pelanggan, aksi }: PelangganCardProps) => {
  const hariLewat = hariLewatJatuhTempo(pelanggan.jatuhTempo);

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
        {keteranganPelanggan(pelanggan)}
      </Text>
      <BarisAksiPelanggan
        namaPelanggan={pelanggan.nama}
        aksi={aksi}
        noTelp={pelanggan.noTelp}
        tujuanPeta={tujuanPetaPelanggan(pelanggan)}
      />
    </View>
  );
});
PelangganCard.displayName = "PelangganCard";
