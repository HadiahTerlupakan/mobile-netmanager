import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import { LencanaStatus } from '@/components/molecules/LencanaStatus';
import { tampilanStatusPenandaTangan } from '@/constants/pengesahan';
import type { PenandaTanganPengesahan } from '@/types/pengesahan';
import { formatDate } from '@/utils/date';

const FORMAT_WAKTU_TANDA_TANGAN = 'dd MMM yyyy, HH:mm';

interface BarisPenandaTanganProps {
  penandaTangan: PenandaTanganPengesahan;
  urutan: number;
}

/** Satu penanda tangan: urutan, nama (+ penanda "Anda"), jabatan / waktu tanda tangan, status. */
export function BarisPenandaTangan({ penandaTangan, urutan }: BarisPenandaTanganProps) {
  const keterangan = penandaTangan.signedAt
    ? `Ditandatangani ${formatDate(penandaTangan.signedAt, FORMAT_WAKTU_TANDA_TANGAN)}`
    : penandaTangan.role;
  return (
    <View style={tw`flex-row items-center py-2.5 border-t border-slate-100`}>
      <Text style={tw`w-6 text-xs font-semibold text-slate-400`}>{`${urutan}.`}</Text>
      <View style={tw`flex-1 mr-2`}>
        <View style={tw`flex-row items-center`}>
          <Text style={tw`text-sm font-semibold text-slate-900 flex-shrink`} numberOfLines={1}>
            {penandaTangan.name}
          </Text>
          {penandaTangan.isMe ? <Text style={tw`ml-1.5 text-[10px] font-bold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded`}>Anda</Text> : null}
        </View>
        {keterangan ? <Text style={tw`text-xs text-slate-500 mt-0.5`} numberOfLines={1}>{keterangan}</Text> : null}
      </View>
      <LencanaStatus status={tampilanStatusPenandaTangan(penandaTangan.status)} />
    </View>
  );
}
