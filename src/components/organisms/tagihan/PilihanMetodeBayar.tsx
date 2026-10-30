import { CreditCard, Landmark, QrCode, Store, Wallet, type LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

const UKURAN_IKON = 20;
/** teal-600 */
const WARNA_IKON_TERPILIH = '#0d9488';
/** gray-500 */
const WARNA_IKON = '#6b7280';

/** Ikon per `type` katalog metode gateway; transfer manual memakai ikon kartu. */
const IKON_JENIS: Record<string, LucideIcon> = {
  VA: Landmark,
  QRIS: QrCode,
  EWALLET: Wallet,
  RETAIL: Store,
};

export interface MetodeBayar {
  id: string;
  name: string;
  type: string;
  code: string;
  group: string;
}

interface PilihanMetodeBayarProps {
  metode: MetodeBayar[];
  kodeTerpilih: string;
  onPilih: (kode: string) => void;
}

function kelompokkan(metode: MetodeBayar[]): [string, MetodeBayar[]][] {
  const grup = new Map<string, MetodeBayar[]>();
  for (const item of metode) {
    grup.set(item.group, [...(grup.get(item.group) ?? []), item]);
  }
  return [...grup.entries()];
}

function BarisMetode({ metode, isTerpilih, onPilih }: { metode: MetodeBayar; isTerpilih: boolean; onPilih: (kode: string) => void }) {
  const Ikon = IKON_JENIS[metode.type] ?? CreditCard;
  return (
    <TouchableOpacity
      accessibilityRole="radio"
      accessibilityLabel={metode.name}
      accessibilityState={{ selected: isTerpilih }}
      onPress={() => onPilih(metode.code)}
      style={tw`rounded-xl p-3.5 flex-row items-center border-2 ${isTerpilih ? 'border-teal-500 bg-teal-50' : 'border-gray-100 bg-white'}`}
    >
      <Ikon size={UKURAN_IKON} color={isTerpilih ? WARNA_IKON_TERPILIH : WARNA_IKON} />
      <Text style={tw`flex-1 ml-3 font-bold text-sm ${isTerpilih ? 'text-teal-900' : 'text-gray-900'}`}>{metode.name}</Text>
      <View style={tw`w-5 h-5 rounded-full border-2 items-center justify-center ${isTerpilih ? 'border-teal-600 bg-teal-600' : 'border-gray-300'}`}>
        {isTerpilih && <View style={tw`w-2 h-2 rounded-full bg-white`} />}
      </View>
    </TouchableOpacity>
  );
}

/** Daftar metode pembayaran per grup (Virtual Account, E-Wallet & QRIS, ...). */
export function PilihanMetodeBayar({ metode, kodeTerpilih, onPilih }: PilihanMetodeBayarProps) {
  return (
    <View style={tw`gap-4 mb-5`}>
      {kelompokkan(metode).map(([grup, anggota]) => (
        <View key={grup} style={tw`gap-2`}>
          <Text style={tw`text-xs font-bold text-gray-500 uppercase`}>{grup}</Text>
          {anggota.map((item) => (
            <BarisMetode key={item.id} metode={item} isTerpilih={item.code === kodeTerpilih} onPilih={onPilih} />
          ))}
        </View>
      ))}
    </View>
  );
}
