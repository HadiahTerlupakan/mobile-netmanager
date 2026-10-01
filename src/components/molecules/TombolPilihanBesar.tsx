import { Check } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTemaPersona } from '@/theme';

/** Satu tombol pilihan besar. */
export interface OpsiTombolBesar<T extends string> {
  nilai: T;
  label: string;
  /** Penjelasan kecil di bawah label (mis. "Mau pasang internet"). */
  keterangan?: string;
}

interface TombolPilihanBesarProps<T extends string> {
  opsi: readonly OpsiTombolBesar<T>[];
  /** null = belum ada yang dipilih. */
  terpilih: T | null;
  onPilih: (nilai: T) => void;
  /**
   * Susun sebagai kisi dengan jumlah kolom ini (label panjang boleh dua
   * baris). Tanpa nilai: satu baris sama lebar.
   */
  jumlahKolom?: number;
}

const UKURAN_IKON_CENTANG = 16;
const PERSEN_PENUH = 100;
const BARIS_LABEL_KISI = 2;

/**
 * Deretan tombol pilihan tunggal berukuran besar. Yang terpilih berwarna
 * penuh dengan tanda centang, supaya jelas tanpa harus membaca teks.
 */
export function TombolPilihanBesar<T extends string>({ opsi, terpilih, onPilih, jumlahKolom }: TombolPilihanBesarProps<T>) {
  const { tw } = useTemaPersona();
  const isKisi = jumlahKolom !== undefined;
  const gayaSelKisi = isKisi ? [tw`p-1`, { width: `${PERSEN_PENUH / jumlahKolom}%` as const }] : undefined;

  const gambarLabel = (pilihan: OpsiTombolBesar<T>, isTerpilih: boolean) => {
    const label = (
      <Text
        numberOfLines={isKisi ? BARIS_LABEL_KISI : 1}
        adjustsFontSizeToFit={!isKisi}
        style={tw`flex-shrink text-base text-center ${isTerpilih ? 'text-white font-bold' : 'text-gray-800 font-semibold'}`}>
        {pilihan.label}
      </Text>
    );
    if (!pilihan.keterangan) return label;
    return (
      <View style={tw`flex-shrink items-center`}>
        {label}
        <Text style={tw`text-xs text-center mt-0.5 ${isTerpilih ? 'text-utama-muda' : 'text-gray-500'}`}>{pilihan.keterangan}</Text>
      </View>
    );
  };

  const gambarTombol = (pilihan: OpsiTombolBesar<T>) => {
    const isTerpilih = pilihan.nilai === terpilih;
    return (
      <TouchableOpacity
        key={pilihan.nilai}
        accessibilityRole="button"
        accessibilityLabel={pilihan.label}
        accessibilityHint={pilihan.keterangan}
        accessibilityState={{ selected: isTerpilih }}
        onPress={() => onPilih(pilihan.nilai)}
        style={tw`${isKisi ? 'flex-grow' : 'flex-1 mx-1'} min-h-12 px-2 py-3 rounded-xl border-2 flex-row items-center justify-center ${
          isTerpilih ? 'bg-utama-kuat border-utama-kuat' : 'bg-white border-gray-300'
        }`}
      >
        {isTerpilih ? <Check size={UKURAN_IKON_CENTANG} color="white" style={tw`mr-1`} /> : null}
        {gambarLabel(pilihan, isTerpilih)}
      </TouchableOpacity>
    );
  };

  if (!isKisi) return <View style={tw`flex-row -mx-1`}>{opsi.map(gambarTombol)}</View>;
  return (
    <View style={tw`flex-row flex-wrap -m-1`}>
      {opsi.map((pilihan) => (
        <View key={pilihan.nilai} style={gayaSelKisi}>
          {gambarTombol(pilihan)}
        </View>
      ))}
    </View>
  );
}
