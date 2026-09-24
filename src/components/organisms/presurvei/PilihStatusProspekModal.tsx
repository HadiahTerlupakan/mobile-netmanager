import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { LABEL_STATUS_PROSPEK } from '@/constants/presurvei';
import type { AksiUbahStatus, PilihanUbahStatus } from '@/utils/presurvei/aturanPresurvei';

interface PilihStatusProspekModalProps {
  pilihan: PilihanUbahStatus[];
  onPilih: (aksi: AksiUbahStatus) => void;
  onTutup: () => void;
}

/** Lembar Ubah Status: hanya transisi sah (`daftarPilihanUbahStatus`). Dirender saat dibuka. */
export function PilihStatusProspekModal({ pilihan, onPilih, onTutup }: PilihStatusProspekModalProps) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onTutup}>
      <View style={tw`flex-1 justify-end bg-black/40`}>
        <View style={tw`bg-white rounded-t-2xl p-4`}>
          <Text style={tw`text-lg font-bold text-gray-900 mb-3`}>Ubah Status</Text>
          {pilihan.map(({ tujuan, aksi }) => (
            <TouchableOpacity key={tujuan} accessibilityRole="button" onPress={() => onPilih(aksi)} style={tw`py-3 border-b border-gray-100`}>
              <Text style={tw`text-gray-900`}>{LABEL_STATUS_PROSPEK[tujuan]}</Text>
              {aksi.jenis === 'buka-konversi' ? <Text style={tw`text-xs text-gray-500`}>Lanjut ke form Jadikan Canvasing</Text> : null}
            </TouchableOpacity>
          ))}
          <TouchableOpacity accessibilityRole="button" onPress={onTutup} style={tw`py-3 items-center`}>
            <Text style={tw`text-gray-500`}>Batal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
