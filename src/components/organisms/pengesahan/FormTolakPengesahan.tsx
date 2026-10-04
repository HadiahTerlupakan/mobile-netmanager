import React from 'react';
import { Controller } from 'react-hook-form';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { KartuFormulir } from '@/components/atoms/KartuFormulir';
import { IsianTeks } from '@/components/molecules/IsianTeks';
import { JudulIsian } from '@/components/molecules/JudulIsian';
import { ALASAN_TOLAK_MAKS } from '@/constants/pengesahan';
import { useFormTolakPengesahan } from '@/hooks/pengesahan/useFormTolakPengesahan';

const JUMLAH_BARIS_ALASAN = 5;

interface FormTolakPengesahanProps {
  id: string;
  onSelesai: () => void;
}

/** Form alasan menolak surat beserta tombol kirim. */
export function FormTolakPengesahan({ id, onSelesai }: FormTolakPengesahanProps) {
  const { control, kesalahan, kirim, isMengirim } = useFormTolakPengesahan(id, onSelesai);
  return (
    <View style={tw`p-4`}>
      <KartuFormulir>
        <JudulIsian judul="Alasan menolak" isWajib petunjuk="Alasan dikirim ke pembuat surat, mis. data di surat keliru." />
        <Controller
          control={control}
          name="alasan"
          render={({ field }) => (
            <IsianTeks
              label="Alasan menolak"
              isLabelTersembunyi
              nilai={field.value}
              onUbah={field.onChange}
              kesalahan={kesalahan.alasan?.message}
              placeholder="Tulis alasan menolak"
              multiline
              jumlahBaris={JUMLAH_BARIS_ALASAN}
              maxLength={ALASAN_TOLAK_MAKS}
              isTampilPenghitung
            />
          )}
        />
      </KartuFormulir>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ disabled: isMengirim }}
        disabled={isMengirim}
        onPress={() => void kirim()}
        style={tw`rounded-xl py-3 items-center ${isMengirim ? 'bg-gray-400' : 'bg-red-600'}`}
      >
        <Text style={tw`text-white font-bold`}>{isMengirim ? 'Mengirim…' : 'Kirim penolakan'}</Text>
      </TouchableOpacity>
    </View>
  );
}
