import { ChevronRight, Wrench } from 'lucide-react-native';
import React, { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { LencanaStatus } from '@/components/molecules/LencanaStatus';
import { labelKategoriKeluhan, statusKeluhan } from '@/constants/keluhan';
import { statusWorkOrder } from '@/constants/workOrder';
import type { KeluhanRingkas } from '@/types/keluhan';
import { formatTimeAgo } from '@/utils/date';
import { formatHariJadwal } from '@/utils/keluhan/langkahKeluhan';

const UKURAN_IKON_WO = 12;
const UKURAN_IKON_BUKA = 16;
/** sky-700, senada teks baris WO. */
const WARNA_IKON_WO = '#0369a1';
/** slate-400 */
const WARNA_IKON_BUKA = '#94a3b8';

interface KartuKeluhanProps {
  keluhan: KeluhanRingkas;
  /** Tampilkan nama sales (kepala / head of sales). */
  isTampilkanSales: boolean;
  onTekan: (keluhan: KeluhanRingkas) => void;
}

/** Ringkasan WO yang menangani keluhan: nomor, status, teknisi, jadwal. */
function BarisWo({ wo }: { wo: NonNullable<KeluhanRingkas['wo']> }) {
  const bagian = [
    statusWorkOrder(wo.status).label,
    wo.namaTeknisi,
    wo.jadwal ? formatHariJadwal(wo.jadwal) : null,
  ].filter(Boolean);
  return (
    <View style={tw`flex-row items-center mt-2 bg-sky-50 rounded-lg px-2.5 py-1.5`}>
      <Wrench size={UKURAN_IKON_WO} color={WARNA_IKON_WO} />
      <Text style={tw`text-[11px] text-sky-800 ml-1.5 flex-1`} numberOfLines={1}>
        {`${wo.nomor} · ${bagian.join(' · ')}`}
      </Text>
    </View>
  );
}

/** Satu keluhan di daftar: pelanggan, judul, status, dan WO penanganannya. */
export const KartuKeluhan = memo(({ keluhan, isTampilkanSales, onTekan }: KartuKeluhanProps) => {
  const keterangan = [
    labelKategoriKeluhan(keluhan.kategori),
    keluhan.nomor,
    isTampilkanSales && keluhan.namaSales ? keluhan.namaSales : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Keluhan ${keluhan.pelanggan.nama}: ${keluhan.subjek}`}
      onPress={() => onTekan(keluhan)}
      style={tw`bg-white mx-4 mb-2 px-4 py-3 rounded-2xl border border-slate-200/70`}
    >
      <View style={tw`flex-row items-center`}>
        <Text style={tw`flex-1 text-[15px] font-bold text-slate-900 mr-2`} numberOfLines={1}>
          {keluhan.pelanggan.nama}
        </Text>
        <LencanaStatus status={statusKeluhan(keluhan.status)} />
      </View>
      <View style={tw`flex-row items-center mt-1`}>
        <Text style={tw`flex-1 text-sm text-slate-700`} numberOfLines={1}>
          {keluhan.subjek}
        </Text>
        <ChevronRight size={UKURAN_IKON_BUKA} color={WARNA_IKON_BUKA} />
      </View>
      <Text style={tw`text-xs text-slate-400 mt-0.5`} numberOfLines={1}>
        {`${keterangan} · ${formatTimeAgo(keluhan.diperbaruiPada)}`}
      </Text>
      {keluhan.wo ? <BarisWo wo={keluhan.wo} /> : null}
    </TouchableOpacity>
  );
});
KartuKeluhan.displayName = 'KartuKeluhan';
