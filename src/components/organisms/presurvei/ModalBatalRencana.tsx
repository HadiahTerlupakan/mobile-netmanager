import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { IsianTeks } from '@/components/molecules/IsianTeks';
import { TombolAksi } from '@/components/molecules/TombolAksi';
import { ALASAN_BATAL_RENCANA_MAKS } from '@/constants/presurvei';

interface ModalBatalRencanaProps {
  alasan: string;
  kesalahan?: string;
  isMenyimpan: boolean;
  onUbahAlasan: (alasan: string) => void;
  onKonfirmasi: () => void;
  onTutup: () => void;
}

/** Lembar pembatalan rencana dengan alasan wajib. Dirender saat dibuka. */
export function ModalBatalRencana(props: ModalBatalRencanaProps) {
  const { alasan, kesalahan, isMenyimpan, onUbahAlasan, onKonfirmasi, onTutup } = props;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onTutup}>
      <View style={tw`flex-1 justify-end bg-black/40`}>
        <View style={tw`bg-white rounded-t-2xl p-4`}>
          <Text style={tw`text-lg font-bold text-gray-900 mb-3`}>Batalkan Rencana</Text>
          <IsianTeks
            label="Alasan pembatalan"
            nilai={alasan}
            kesalahan={kesalahan}
            multiline
            maxLength={ALASAN_BATAL_RENCANA_MAKS}
            onUbah={onUbahAlasan}
          />
          <TombolAksi label={isMenyimpan ? 'Membatalkan…' : 'Batalkan Rencana'} onPress={onKonfirmasi} isAktif={!isMenyimpan} />
          <TouchableOpacity accessibilityRole="button" onPress={onTutup} style={tw`py-3 items-center`}>
            <Text style={tw`text-gray-500`}>Tutup</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
