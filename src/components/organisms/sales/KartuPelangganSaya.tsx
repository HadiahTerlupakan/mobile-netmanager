import { MessageSquareWarning, Wrench, type LucideIcon } from 'lucide-react-native';
import React, { memo } from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import { BarisAksiPelanggan } from '@/components/molecules/BarisAksiPelanggan';
import { LencanaStatus } from '@/components/molecules/LencanaStatus';
import { statusPelanggan } from '@/constants/pelanggan';
import { statusWorkOrder } from '@/constants/workOrder';
import type { PelangganSaya } from '@/types/pelangganSaya';
import { keteranganPelanggan, tujuanPetaPelanggan } from '@/utils/kontak';

const UKURAN_IKON_PENANDA = 12;

interface WarnaPenanda {
  latar: string;
  teks: string;
  /** Warna ikon (hex), setara kelas teks. */
  ikon: string;
}

/** sky-700 */
const WARNA_PENANDA_WO: WarnaPenanda = { latar: 'bg-sky-50', teks: 'text-sky-700', ikon: '#0369a1' };
/** amber-700 */
const WARNA_PENANDA_KELUHAN: WarnaPenanda = { latar: 'bg-amber-50', teks: 'text-amber-700', ikon: '#b45309' };

interface KartuPelangganSayaProps {
  pelanggan: PelangganSaya;
  /** Tampilkan nama sales penanggung jawab (kepala / head of sales). */
  isTampilkanSales: boolean;
  onLaporKeluhan: (pelanggan: PelangganSaya) => void;
}

/** Penanda kecil berikon: WO berjalan atau keluhan terbuka. */
function Penanda({ ikon: Ikon, teks, warna }: { ikon: LucideIcon; teks: string; warna: WarnaPenanda }) {
  return (
    <View style={tw`flex-row items-center rounded-md px-2 py-0.5 mr-1.5 mt-2 ${warna.latar}`}>
      <Ikon size={UKURAN_IKON_PENANDA} color={warna.ikon} />
      <Text style={tw`text-[11px] font-semibold ml-1 ${warna.teks}`}>{teks}</Text>
    </View>
  );
}

/**
 * Satu pelanggan milik sales: status langganan, WO yang sedang berjalan dan
 * keluhan terbuka, lalu aksi "Lapor keluhan", telepon (WhatsApp), dan peta.
 */
export const KartuPelangganSaya = memo(({ pelanggan, isTampilkanSales, onLaporKeluhan }: KartuPelangganSayaProps) => {
  const wo = pelanggan.woTerbuka;
  const hasKeluhanTerbuka = pelanggan.jumlahKeluhanTerbuka > 0;

  return (
    <View style={tw`bg-white mx-4 mb-2 px-4 py-3 rounded-2xl border border-slate-200/70`}>
      <View style={tw`flex-row items-center`}>
        <Text style={tw`flex-1 text-[15px] font-bold text-slate-900 mr-2`} numberOfLines={1}>
          {pelanggan.nama}
        </Text>
        <LencanaStatus status={statusPelanggan(pelanggan.status)} />
      </View>
      <Text style={tw`text-xs text-slate-500 mt-1`} numberOfLines={1}>
        {keteranganPelanggan(pelanggan)}
      </Text>
      {isTampilkanSales && pelanggan.namaSales ? (
        <Text style={tw`text-xs text-slate-400 mt-0.5`} numberOfLines={1}>{`Sales: ${pelanggan.namaSales}`}</Text>
      ) : null}

      {wo || hasKeluhanTerbuka ? (
        <View style={tw`flex-row flex-wrap`}>
          {wo ? <Penanda ikon={Wrench} teks={`${wo.nomor} · ${statusWorkOrder(wo.status).label}`} warna={WARNA_PENANDA_WO} /> : null}
          {hasKeluhanTerbuka ? (
            <Penanda ikon={MessageSquareWarning} teks={`${pelanggan.jumlahKeluhanTerbuka} keluhan terbuka`} warna={WARNA_PENANDA_KELUHAN} />
          ) : null}
        </View>
      ) : null}

      <BarisAksiPelanggan
        namaPelanggan={pelanggan.nama}
        aksi={{ label: 'Lapor keluhan', ikon: MessageSquareWarning, onTekan: () => onLaporKeluhan(pelanggan) }}
        noTelp={pelanggan.noTelp}
        tujuanPeta={tujuanPetaPelanggan(pelanggan)}
      />
    </View>
  );
});
KartuPelangganSaya.displayName = 'KartuPelangganSaya';
