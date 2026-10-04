import { ChevronRight } from 'lucide-react-native';
import React, { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { KemajuanTandaTangan } from '@/components/molecules/KemajuanTandaTangan';
import { LencanaStatus } from '@/components/molecules/LencanaStatus';
import { tampilanStatusPenandaTangan, tampilanStatusSurat } from '@/constants/pengesahan';
import type { PengesahanSaya } from '@/types/pengesahan';
import { labelBatasBerlaku } from '@/utils/pengesahan/tampilanPengesahan';

const UKURAN_IKON_BUKA = 16;
/** slate-400 */
const WARNA_IKON_BUKA = '#94a3b8';

interface KartuPengesahanProps {
  surat: PengesahanSaya;
  onTekan: (surat: PengesahanSaya) => void;
}

/** Satu surat di daftar: nomor, judul, status saya, kemajuan tanda tangan, batas berlaku. */
export const KartuPengesahan = memo(({ surat, onTekan }: KartuPengesahanProps) => {
  const batasBerlaku = labelBatasBerlaku(surat.expiresAt);
  // Selama surat masih berjalan yang penting status saya; selain itu status suratnya.
  const status = surat.status === 'SENT' ? tampilanStatusPenandaTangan(surat.mySignerStatus) : tampilanStatusSurat(surat.status);
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Surat ${surat.number}: ${surat.title}`}
      onPress={() => onTekan(surat)}
      style={tw`bg-white mx-4 mb-2 px-4 py-3 rounded-2xl border border-slate-200/70`}
    >
      <View style={tw`flex-row items-center`}>
        <Text style={tw`flex-1 text-xs text-slate-400 mr-2`} numberOfLines={1}>{surat.number}</Text>
        <LencanaStatus status={status} />
      </View>
      <View style={tw`flex-row items-center mt-1`}>
        <Text style={tw`flex-1 text-[15px] font-bold text-slate-900`} numberOfLines={2}>{surat.title}</Text>
        <ChevronRight size={UKURAN_IKON_BUKA} color={WARNA_IKON_BUKA} />
      </View>
      <View style={tw`mt-2.5`}>
        <KemajuanTandaTangan jumlahSelesai={surat.signedCount} jumlahPenandaTangan={surat.signerCount} keterangan={batasBerlaku} />
      </View>
    </TouchableOpacity>
  );
});
KartuPengesahan.displayName = 'KartuPengesahan';
