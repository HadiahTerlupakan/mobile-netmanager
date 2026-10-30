import React from 'react';
import { Switch, Text, View } from 'react-native';
import { type Control, Controller, type FieldValues, type Path } from 'react-hook-form';
import tw from 'twrnc';

/** teal-600 / gray-300 */
const WARNA_TRACK = { true: '#0d9488', false: '#d1d5db' };

interface SakelarPreferensiProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  keterangan: string;
}

/** Satu baris preferensi notifikasi dengan sakelar on/off. */
export function SakelarPreferensi<T extends FieldValues>({ name, control, label, keterangan }: SakelarPreferensiProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange } }) => (
        <View style={tw`flex-row items-center py-3`}>
          <View style={tw`flex-1 mr-3`}>
            <Text style={tw`text-gray-800 font-medium`}>{label}</Text>
            <Text style={tw`text-xs text-gray-500 mt-0.5`}>{keterangan}</Text>
          </View>
          <Switch accessibilityLabel={label} value={Boolean(value)} onValueChange={onChange} trackColor={WARNA_TRACK} />
        </View>
      )}
    />
  );
}
