import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { LABEL_JENIS_KEGIATAN, type RencanaStatusTampil } from '@/constants/presurvei';
import type { Rencana } from '@/types/presurvei';
import { formatDate } from '@/utils/date';
import { hurufAwalNama } from '@/utils/presurvei/timRencana';
import { IKON_JENIS_RENCANA } from './ikonJenisRencana';
import { LencanaStatusRencana } from './LencanaStatusRencana';

const UKURAN_IKON_JENIS = 14;
const WARNA_IKON_JENIS = '#6b7280';
const NAMA_SALES_KOSONG = 'Sales';
/** Teks kolom waktu untuk rencana tanpa jam. */
const TEKS_TANPA_JAM = 'Bebas';

/** Warna garis kolom waktu per status, senada dengan pil status. */
const WARNA_GARIS_STATUS: Record<RencanaStatusTampil, string> = {
  DIRENCANAKAN: 'bg-blue-500',
  TERLEWAT: 'bg-rose-500',
  SELESAI: 'bg-emerald-500',
  BATAL: 'bg-gray-300',
};

interface KartuRencanaProps {
  rencana: Rencana;
  isMenungguKirim: boolean;
  /** Tampilkan tanggal (daftar terlewat berisi banyak tanggal). */
  isTampilTanggal?: boolean;
  /** Tampilkan nama sales (tampilan Tim pemberi tugas, belum dipusatkan ke satu sales). */
  isTampilSales?: boolean;
  onBuka: (id: string) => void;
}

/** Kolom waktu kiri: jam (atau "Bebas") dan tanggal bila diminta, dengan garis warna status. */
function KolomWaktu({ rencana, isTampilTanggal }: { rencana: Rencana; isTampilTanggal: boolean }) {
  return (
    <View style={tw`flex-row mr-3`}>
      <View style={tw`w-1 rounded-full mr-2 ${WARNA_GARIS_STATUS[rencana.statusTampil]}`} />
      <View style={tw`w-12`}>
        <Text style={tw`text-sm font-bold ${rencana.jam ? 'text-gray-900' : 'text-gray-400'}`}>
          {rencana.jam ?? TEKS_TANPA_JAM}
        </Text>
        {isTampilTanggal ? (
          <Text style={tw`text-[11px] text-gray-500 mt-0.5`}>{formatDate(rencana.tanggal, 'dd MMM')}</Text>
        ) : null}
      </View>
    </View>
  );
}

/** Nama sales berawatar inisial untuk tampilan Tim. */
function BarisSales({ nama }: { nama: string | null }) {
  return (
    <View style={tw`flex-row items-center mb-1.5`}>
      <View style={tw`w-5 h-5 rounded-full bg-blue-50 items-center justify-center mr-1.5`}>
        <Text style={tw`text-[10px] font-bold text-blue-600`}>{hurufAwalNama(nama)}</Text>
      </View>
      <Text style={tw`text-xs font-semibold text-gray-700 flex-1`} numberOfLines={1}>
        {nama ?? NAMA_SALES_KOSONG}
      </Text>
    </View>
  );
}

/** Satu rencana di agenda: waktu, (sales,) tujuan, jenis, prospek, alamat, status, dan pemberi tugas. */
export function KartuRencana(props: KartuRencanaProps) {
  const { rencana, isMenungguKirim, isTampilTanggal = false, isTampilSales = false, onBuka } = props;
  const Ikon = IKON_JENIS_RENCANA[rencana.jenis];
  const jenis = LABEL_JENIS_KEGIATAN[rencana.jenis];
  const isRedup = rencana.statusTampil === 'BATAL';
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Rencana ${jenis}: ${rencana.tujuan}`}
      onPress={() => onBuka(rencana.id)}
      style={tw`flex-row bg-white rounded-2xl p-3 mb-2 border border-gray-100 shadow-sm ${isRedup ? 'opacity-60' : ''}`}
    >
      <KolomWaktu rencana={rencana} isTampilTanggal={isTampilTanggal} />
      <View style={tw`flex-1`}>
        {isTampilSales ? <BarisSales nama={rencana.namaSales} /> : null}
        <View style={tw`flex-row items-start justify-between`}>
          <Text style={tw`flex-1 mr-2 font-semibold text-gray-900`} numberOfLines={2}>{rencana.tujuan}</Text>
          <LencanaStatusRencana status={rencana.statusTampil} isMenungguKirim={isMenungguKirim} />
        </View>
        <View style={tw`flex-row items-center mt-1`}>
          <Ikon size={UKURAN_IKON_JENIS} color={WARNA_IKON_JENIS} />
          <Text style={tw`text-xs text-gray-500 ml-1 flex-1`} numberOfLines={1}>
            {[jenis, rencana.namaProspek].filter(Boolean).join(' · ')}
          </Text>
        </View>
        {rencana.alamat !== null ? (
          <Text style={tw`text-xs text-gray-500 mt-0.5`} numberOfLines={1}>{rencana.alamat}</Text>
        ) : null}
        {rencana.sumber === 'PENUGASAN' ? (
          <Text style={tw`text-xs text-violet-700 mt-1`}>{`Dari: ${rencana.namaPembuat ?? 'Atasan'}`}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
