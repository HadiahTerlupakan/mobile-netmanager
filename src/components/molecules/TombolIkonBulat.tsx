import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import tw from 'twrnc';

import { DESAIN_PREMIUM } from '@/theme';

const UKURAN_IKON = 16;

/** Tombol ikon bulat kecil di kartu (telepon, peta). */
export function TombolIkonBulat({ ikon: Ikon, label, onTekan }: { ikon: LucideIcon; label: string; onTekan: () => void }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onTekan}
      style={tw`w-9 h-9 rounded-full bg-slate-100 items-center justify-center ml-2`}
    >
      <Ikon size={UKURAN_IKON} color={DESAIN_PREMIUM.ikonNetral} />
    </TouchableOpacity>
  );
}
