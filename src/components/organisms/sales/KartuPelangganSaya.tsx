import { MapPin, MessageSquareWarning, Phone, Wrench } from 'lucide-react-native';
import React, { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { LencanaStatus } from '@/components/molecules/LencanaStatus';
import { TombolIkonBulat } from '@/components/molecules/TombolIkonBulat';
import { statusPelanggan } from '@/constants/pelanggan';
import { statusWorkOrder } from '@/constants/workOrder';
import { useTemaPersona } from '@/theme';
import type { PelangganSaya } from '@/types/pelangganSaya';
import { bukaAlamatDiPeta, hubungiKontak } from '@/utils/kontak';

interface KartuPelangganSayaProps {
  pelanggan: PelangganSaya;
  /** Tampilkan nama sales penanggung jawab (kepala / head of sales). */
  isTampilkanSales: boolean;
  onLaporKeluhan: (pelanggan: PelangganSaya) => void;
}

/** Penanda kecil berikon: WO berjalan atau keluhan terbuka. */
function Penanda({ ikon: Ikon, teks, warna }: { ikon: typeof Wrench; teks: string; warna: { latar: string; teks: string; ikon: string } }) {
  return (
    <View style={tw`flex-row items-center rounded-md px-2 py-0.5 mr-1.5 mt-2 ${warna.latar}`}>
      <Ikon size={12} color={warna.ikon} />
      <Text style={tw`text-[11px] font-semibold ml-1 ${warna.teks}`}>{teks}</Text>
    </View>
  );
}

const WARNA_WO = { latar: 'bg-sky-50', teks: 'text-sky-700', ikon: '#0369a1' };
const WARNA_KELUHAN = { latar: 'bg-amber-50', teks: 'text-amber-700', ikon: '#b45309' };

/**
 * Satu pelanggan milik sales: status langganan, WO yang sedang berjalan dan
 * keluhan terbuka, lalu aksi "Lapor keluhan", telepon (WhatsApp), dan peta.
 */
export const KartuPelangganSaya = memo(({ pelanggan, isTampilkanSales, onLaporKeluhan }: KartuPelangganSayaProps) => {
  const { tw: twTema, warna } = useTemaPersona();
  const keterangan = [pelanggan.paket, pelanggan.idPelanggan, pelanggan.alamat ?? pelanggan.siteName]
    .filter(Boolean)
    .join(' · ');
  const lokasi =
    pelanggan.alamat ??
    (pelanggan.latitude !== null && pelanggan.longitude !== null ? `${pelanggan.latitude},${pelanggan.longitude}` : null);
  const wo = pelanggan.woTerbuka;

  return (
    <View style={tw`bg-white mx-4 mb-2 px-4 py-3 rounded-2xl border border-slate-200/70`}>
      <View style={tw`flex-row items-center`}>
        <Text style={tw`flex-1 text-[15px] font-bold text-slate-900 mr-2`} numberOfLines={1}>
          {pelanggan.nama}
        </Text>
        <LencanaStatus status={statusPelanggan(pelanggan.status)} />
      </View>
      <Text style={tw`text-xs text-slate-500 mt-1`} numberOfLines={1}>
        {keterangan}
      </Text>
      {isTampilkanSales && pelanggan.namaSales ? (
        <Text style={tw`text-xs text-slate-400 mt-0.5`} numberOfLines={1}>{`Sales: ${pelanggan.namaSales}`}</Text>
      ) : null}

      {wo || pelanggan.jumlahKeluhanTerbuka > 0 ? (
        <View style={tw`flex-row flex-wrap`}>
          {wo ? <Penanda ikon={Wrench} teks={`${wo.nomor} · ${statusWorkOrder(wo.status).label}`} warna={WARNA_WO} /> : null}
          {pelanggan.jumlahKeluhanTerbuka > 0 ? (
            <Penanda ikon={MessageSquareWarning} teks={`${pelanggan.jumlahKeluhanTerbuka} keluhan terbuka`} warna={WARNA_KELUHAN} />
          ) : null}
        </View>
      ) : null}

      <View style={tw`flex-row items-center mt-2.5`}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Lapor keluhan ${pelanggan.nama}`}
          onPress={() => onLaporKeluhan(pelanggan)}
          style={twTema`flex-1 flex-row items-center justify-center bg-utama-sangat-muda py-2 rounded-full`}
        >
          <MessageSquareWarning size={14} color={warna.utamaKuat} />
          <Text style={twTema`font-semibold text-utama-kuat text-xs ml-1.5`}>Lapor keluhan</Text>
        </TouchableOpacity>
        {pelanggan.noTelp ? (
          <TombolIkonBulat ikon={Phone} label={`Hubungi ${pelanggan.noTelp}`} onTekan={() => hubungiKontak(pelanggan.noTelp as string)} />
        ) : null}
        {lokasi ? <TombolIkonBulat ikon={MapPin} label={`Buka peta ${pelanggan.nama}`} onTekan={() => bukaAlamatDiPeta(lokasi)} /> : null}
      </View>
    </View>
  );
});
KartuPelangganSaya.displayName = 'KartuPelangganSaya';
