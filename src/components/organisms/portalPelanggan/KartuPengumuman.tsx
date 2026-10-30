import { Megaphone, Pin } from 'lucide-react-native';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import type { Pengumuman } from '@/types/portalPelanggan';
import { formatDate } from '@/utils/date';

const UKURAN_IKON = 18;
const UKURAN_IKON_SEMAT = 12;
const BARIS_RINGKAS = 3;
/** orange-600 / gray-400 */
const WARNA_IKON = '#ea580c';
const WARNA_SEMAT = '#9ca3af';

interface KartuPengumumanProps {
  pengumuman: Pengumuman;
  isBaru: boolean;
  /** Dipanggil saat kartu dibuka; pemanggil yang menandai dibaca. */
  onBuka: (id: string) => void;
}

/** Pengumuman ringkas tiga baris; ketuk untuk membaca seluruhnya. */
export function KartuPengumuman({ pengumuman, isBaru, onBuka }: KartuPengumumanProps) {
  const [isTerbuka, setIsTerbuka] = useState(false);
  const buka = () => {
    setIsTerbuka((sebelumnya) => !sebelumnya);
    if (!isTerbuka) onBuka(pengumuman.id);
  };
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Pengumuman ${pengumuman.title}`}
      accessibilityState={{ expanded: isTerbuka }}
      onPress={buka}
      style={tw`bg-white p-4 rounded-xl border mb-3 ${isBaru ? 'border-orange-200' : 'border-gray-100'}`}
    >
      <View style={tw`flex-row items-center`}>
        <Megaphone size={UKURAN_IKON} color={WARNA_IKON} />
        <Text style={tw`flex-1 ml-2 font-bold text-gray-900`} numberOfLines={isTerbuka ? undefined : 1}>{pengumuman.title}</Text>
        {pengumuman.isPinned ? <Pin size={UKURAN_IKON_SEMAT} color={WARNA_SEMAT} /> : null}
        {isBaru ? (
          <View style={tw`ml-2 bg-orange-100 px-2 py-0.5 rounded-full`}>
            <Text style={tw`text-[10px] font-bold text-orange-700`}>Baru</Text>
          </View>
        ) : null}
      </View>
      <Text style={tw`text-sm text-gray-600 mt-2`} numberOfLines={isTerbuka ? undefined : BARIS_RINGKAS}>{pengumuman.content}</Text>
      <Text style={tw`text-xs text-gray-400 mt-2`}>{formatDate(pengumuman.createdAt)}</Text>
    </TouchableOpacity>
  );
}
