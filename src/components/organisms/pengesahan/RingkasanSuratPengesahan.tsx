import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import { LencanaStatus } from '@/components/molecules/LencanaStatus';
import { tampilanStatusSurat } from '@/constants/pengesahan';
import type { DetailPengesahanSaya } from '@/types/pengesahan';
import { labelBatasBerlaku, pesanKeadaanSurat } from '@/utils/pengesahan/tampilanPengesahan';

interface RingkasanSuratPengesahanProps {
  surat: DetailPengesahanSaya;
}

/** Kepala detail surat: nomor, status, judul, keterangan, nama berkas, batas berlaku, dan keadaan bagi saya. */
export function RingkasanSuratPengesahan({ surat }: RingkasanSuratPengesahanProps) {
  const batasBerlaku = labelBatasBerlaku(surat.expiresAt);
  const keadaan = pesanKeadaanSurat(surat);
  return (
    <View style={tw`bg-white rounded-2xl p-4 mb-3 border border-slate-200/70`}>
      <View style={tw`flex-row items-center`}>
        <Text style={tw`flex-1 text-xs text-slate-400 mr-2`} numberOfLines={1}>{surat.number}</Text>
        <LencanaStatus status={tampilanStatusSurat(surat.status)} />
      </View>
      <Text style={tw`text-lg font-bold text-slate-900 mt-2`}>{surat.title}</Text>
      {surat.description ? <Text style={tw`text-sm text-slate-600 mt-1`}>{surat.description}</Text> : null}
      <Text style={tw`text-xs text-slate-400 mt-2`} numberOfLines={1}>
        {[surat.sourceFileName, batasBerlaku].filter(Boolean).join(' · ')}
      </Text>
      {keadaan ? (
        <View style={tw`mt-3 bg-slate-50 rounded-xl px-3 py-2`}>
          <Text style={tw`text-xs text-slate-700`}>{keadaan}</Text>
        </View>
      ) : null}
    </View>
  );
}
