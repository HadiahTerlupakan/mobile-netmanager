import React from 'react';
import { Text, TextInput, TextInputProps, View } from 'react-native';
import tw from 'twrnc';

/** Warna placeholder isian; sama dengan pola input lain di aplikasi. */
const WARNA_PLACEHOLDER_ISIAN = '#9ca3af';

interface IsianTeksProps extends Pick<TextInputProps, 'keyboardType' | 'multiline' | 'maxLength'> {
  label: string;
  nilai: string;
  onUbah: (isian: string) => void;
  kesalahan?: string;
  placeholder?: string;
  /** Tinggi minimal isian dalam baris (untuk multiline); teks mulai dari atas. */
  jumlahBaris?: number;
  /** Tampilkan "12/500" di bawah isian (butuh `maxLength`). */
  isTampilPenghitung?: boolean;
  /** Label tidak digambar (judul sudah ada di kartu); tetap dipakai pembaca layar. */
  isLabelTersembunyi?: boolean;
}

/** Tinggi satu baris teks isian, dalam piksel. */
const TINGGI_BARIS = 22;

/** Isian teks berlabel dengan pesan kesalahan; label juga menjadi label aksesibilitas. */
export function IsianTeks({
  label,
  nilai,
  onUbah,
  kesalahan,
  placeholder,
  jumlahBaris,
  isTampilPenghitung,
  isLabelTersembunyi,
  ...sisa
}: IsianTeksProps) {
  const gayaTinggi = jumlahBaris ? { minHeight: jumlahBaris * TINGGI_BARIS, textAlignVertical: 'top' as const } : null;
  return (
    <View style={tw`mb-3`}>
      {isLabelTersembunyi ? null : <Text style={tw`text-sm font-medium text-gray-700 mb-1`}>{label}</Text>}
      <TextInput
        accessibilityLabel={label}
        value={nilai}
        onChangeText={onUbah}
        placeholder={placeholder}
        placeholderTextColor={WARNA_PLACEHOLDER_ISIAN}
        style={[tw`bg-white border ${kesalahan ? 'border-red-500' : 'border-gray-300'} rounded-xl px-3 py-2 text-gray-900`, gayaTinggi]}
        {...sisa}
      />
      {kesalahan ? <Text style={tw`text-red-600 text-xs mt-1`}>{kesalahan}</Text> : null}
      {isTampilPenghitung && sisa.maxLength ? (
        <Text style={tw`text-xs text-gray-400 mt-1 text-right`}>{`${nilai.length}/${sisa.maxLength}`}</Text>
      ) : null}
    </View>
  );
}
