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
}

/** Isian teks berlabel dengan pesan kesalahan; label juga menjadi label aksesibilitas. */
export function IsianTeks({ label, nilai, onUbah, kesalahan, placeholder, ...sisa }: IsianTeksProps) {
  return (
    <View style={tw`mb-3`}>
      <Text style={tw`text-sm font-medium text-gray-700 mb-1`}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={nilai}
        onChangeText={onUbah}
        placeholder={placeholder}
        placeholderTextColor={WARNA_PLACEHOLDER_ISIAN}
        style={tw`bg-white border ${kesalahan ? 'border-red-500' : 'border-gray-300'} rounded-xl px-3 py-2 text-gray-900`}
        {...sisa}
      />
      {kesalahan ? <Text style={tw`text-red-600 text-xs mt-1`}>{kesalahan}</Text> : null}
    </View>
  );
}
