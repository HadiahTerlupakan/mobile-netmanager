import React from 'react';
import { Linking, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { KartuFormulir } from '@/components/atoms/KartuFormulir';
import { TeksKesalahan } from '@/components/atoms/TeksKesalahan';
import { PetaTitik } from './PetaTitik';
import {
  TEKS_STATUS_LOKASI,
  teksAkurasi,
  type StatusLokasi,
  type TitikGps,
} from '@/utils/presurvei/lokasiGps';

interface BlokLokasiGpsProps {
  status: StatusLokasi;
  titik: TitikGps | null;
  kesalahan?: string;
  onCobaLagi: () => void;
}

/**
 * Lokasi GPS kegiatan: hanya ditampilkan, tidak bisa diketik atau dipilih
 * manual. Izin lokasi ditolak (`izin_ditolak`) ditangani terpisah dari
 * kegagalan GPS biasa (`gagal`): sales diarahkan membuka pengaturan izin
 * lewat `Linking.openSettings()`, bukan disuruh "coba lagi" (carry Task 10 —
 * `useLokasiKegiatan.ts:45-56`, `lokasiGps.ts:31-39`).
 */
export function BlokLokasiGps({ status, titik, kesalahan, onCobaLagi }: BlokLokasiGpsProps) {
  return (
    <KartuFormulir>
      <Text style={tw`font-bold text-gray-900 mb-1`}>Lokasi GPS</Text>
      <Text style={tw`text-xs text-gray-500 mb-2`}>Diambil otomatis dari GPS dan tidak bisa diubah.</Text>
      {titik !== null ? (
        <View>
          <PetaTitik titik={titik} />
          <Text style={tw`text-xs text-gray-600 mt-2`}>{teksAkurasi(titik.akurasiMeter)}</Text>
        </View>
      ) : (
        <View style={tw`flex-row items-center`}>
          <Text style={tw`text-sm text-gray-600 flex-1`}>{TEKS_STATUS_LOKASI[status]}</Text>
          {status === 'gagal' ? (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={onCobaLagi}
              style={tw`ml-3 px-3 py-2 rounded-lg bg-blue-600`}
            >
              <Text style={tw`text-white font-semibold text-sm`}>Coba lagi</Text>
            </TouchableOpacity>
          ) : null}
          {status === 'izin_ditolak' ? (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => void Linking.openSettings()}
              style={tw`ml-3 px-3 py-2 rounded-lg bg-blue-600`}
            >
              <Text style={tw`text-white font-semibold text-sm`}>Buka Pengaturan</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
      <TeksKesalahan pesan={kesalahan} />
    </KartuFormulir>
  );
}
