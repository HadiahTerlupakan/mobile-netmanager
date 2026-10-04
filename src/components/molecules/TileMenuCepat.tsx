import { Lock } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import type { MenuItem } from '@/constants/menuCepat';

const UKURAN_IKON_MENU = 20;
const UKURAN_IKON_GEMBOK = 10;
const WARNA_IKON_TERKUNCI = '#9ca3af';
/** Angka lencana di atas ini ditulis "99+". */
const LENCANA_MAKS = 99;

interface TileMenuCepatProps {
  item: MenuItem;
  isAktif: boolean;
  /** Angka di pojok ikon, mis. surat menunggu tanda tangan; 0 = tanpa lencana. */
  jumlahLencana: number;
  onTekan: () => void;
}

/** Lencana angka merah di pojok kanan atas ikon tile. */
function LencanaAngka({ jumlah }: { jumlah: number }) {
  return (
    <View style={tw`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 items-center justify-center`}>
      <Text style={tw`text-[10px] font-bold text-white`}>{jumlah > LENCANA_MAKS ? `${LENCANA_MAKS}+` : String(jumlah)}</Text>
    </View>
  );
}

/** Satu tile menu cepat: ikon (gembok bila terkunci, lencana bila ada angka), judul, subjudul. */
export function TileMenuCepat({ item, isAktif, jumlahLencana, onTekan }: TileMenuCepatProps) {
  const Ikon = item.icon;
  const isLencana = isAktif && jumlahLencana > 0;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={isLencana ? `${item.title}, ${jumlahLencana} menunggu` : item.title}
      accessibilityHint={isAktif ? undefined : 'Terkunci, butuh izin akses'}
      onPress={onTekan}
      style={tw`w-[31%] mb-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm items-center ${isAktif ? '' : 'opacity-50'}`}
    >
      <View style={tw`h-10 w-10 rounded-lg ${isAktif ? item.color : 'bg-gray-100'} items-center justify-center mb-2 relative`}>
        <Ikon size={UKURAN_IKON_MENU} color={isAktif ? item.iconColor : WARNA_IKON_TERKUNCI} />
        {isAktif ? null : (
          <View style={tw`absolute -bottom-1 -right-1 bg-gray-400 rounded-full p-0.5`}>
            <Lock size={UKURAN_IKON_GEMBOK} color="white" />
          </View>
        )}
        {isLencana ? <LencanaAngka jumlah={jumlahLencana} /> : null}
      </View>
      <Text style={tw`font-bold ${isAktif ? 'text-gray-900' : 'text-gray-400'} text-xs text-center`} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={tw`text-[10px] ${isAktif ? 'text-gray-500' : 'text-gray-300'} text-center`} numberOfLines={1}>
        {item.subtitle}
      </Text>
    </TouchableOpacity>
  );
}
