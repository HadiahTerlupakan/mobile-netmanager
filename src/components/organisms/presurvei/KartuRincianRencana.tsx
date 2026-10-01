import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import { LABEL_JENIS_KEGIATAN } from '@/constants/presurvei';
import type { Rencana } from '@/types/presurvei';
import { formatDate } from '@/utils/date';
import { labelWaktuRencana } from '@/utils/presurvei/rencana';
import { LencanaStatusRencana } from './LencanaStatusRencana';

interface KartuRincianRencanaProps {
  rencana: Rencana;
  isMenungguKirim: boolean;
  /** Tampilkan sales pemilik rencana (pemberi tugas melihat rencana tim). */
  isTampilSales?: boolean;
}

/** Isi rencana: tujuan, (sales,) jenis, tanggal, prospek, alamat, asal, dan alasan batal bila dibatalkan. */
export function KartuRincianRencana({ rencana, isMenungguKirim, isTampilSales = false }: KartuRincianRencanaProps) {
  return (
    <View style={tw`bg-white rounded-2xl p-4 m-4 border border-gray-100`}>
      <View style={tw`flex-row items-center justify-between mb-2`}>
        <Text style={tw`text-sm text-gray-500`}>
          {`${LABEL_JENIS_KEGIATAN[rencana.jenis]} · ${labelWaktuRencana(rencana, (t) => formatDate(t, 'dd MMM yyyy'))}`}
        </Text>
        <LencanaStatusRencana status={rencana.statusTampil} isMenungguKirim={isMenungguKirim} />
      </View>
      <Text style={tw`text-lg font-bold text-gray-900`}>{rencana.tujuan}</Text>
      {isTampilSales && rencana.namaSales !== null ? (
        <Text style={tw`text-sm font-semibold text-gray-900 mt-1`}>{`Sales: ${rencana.namaSales}`}</Text>
      ) : null}
      {rencana.namaProspek !== null ? <Text style={tw`text-sm text-gray-700 mt-1`}>{`Prospek: ${rencana.namaProspek}`}</Text> : null}
      {rencana.alamat !== null ? <Text style={tw`text-sm text-gray-700`}>{rencana.alamat}</Text> : null}
      {rencana.sumber === 'PENUGASAN' ? (
        <Text style={tw`text-sm text-violet-700 mt-2`}>{`Ditugaskan oleh ${rencana.namaPembuat ?? 'atasan Anda'}`}</Text>
      ) : null}
      {rencana.statusTampil === 'BATAL' && rencana.alasanBatal !== null ? (
        <Text style={tw`text-sm text-gray-500 mt-2`}>{`Alasan batal: ${rencana.alasanBatal}`}</Text>
      ) : null}
    </View>
  );
}
