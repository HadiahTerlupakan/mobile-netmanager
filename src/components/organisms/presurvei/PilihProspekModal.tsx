import React from 'react';
import { FlatList, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { QueryErrorState } from '@/components/molecules/QueryErrorState';
import { LABEL_STATUS_PROSPEK } from '@/constants/presurvei';
import { useCariProspek } from '@/hooks/presurvei/useCariProspek';
import type { ProspekListItem } from '@/types/presurvei';

/** Pesan saat daftar tidak bisa dimuat; kegiatan tetap bisa dicatat tanpa prospek. */
const PESAN_PROSPEK_OFFLINE =
  'Tidak ada koneksi. Memilih prospek butuh internet; kegiatan tetap bisa dicatat tanpa prospek.';
const PESAN_PROSPEK_GALAT = 'Daftar prospek gagal dimuat.';

interface PilihProspekModalProps {
  onTutup: () => void;
  onPilih: (prospek: ProspekListItem) => void;
}

/** Pemilih prospek milik sendiri untuk kegiatan follow-up. Dirender hanya saat dibuka. */
export function PilihProspekModal({ onTutup, onPilih }: PilihProspekModalProps) {
  const { cari, setCari, prospek, keadaan, muatBerikutnya, muatUlang } = useCariProspek();
  const isGagal = keadaan === 'offline' || keadaan === 'galat';

  return (
    <Modal visible animationType="slide" onRequestClose={onTutup}>
      <View style={tw`flex-1 bg-gray-50 p-4`}>
        <View style={tw`flex-row items-center justify-between mb-3`}>
          <Text style={tw`text-lg font-bold text-gray-900`}>Pilih Prospek</Text>
          <TouchableOpacity accessibilityRole="button" onPress={onTutup}>
            <Text style={tw`text-blue-600 font-semibold`}>Tutup</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          accessibilityLabel="Cari prospek"
          value={cari}
          onChangeText={setCari}
          placeholder="Nama atau nomor HP"
          style={tw`bg-white border border-gray-300 rounded-xl px-3 py-2 mb-3`}
        />
        <FlatList
          data={prospek}
          keyExtractor={(item) => item.id}
          onEndReached={muatBerikutnya}
          contentContainerStyle={tw`flex-grow`}
          ListEmptyComponent={
            isGagal ? (
              <QueryErrorState
                message={keadaan === 'offline' ? PESAN_PROSPEK_OFFLINE : PESAN_PROSPEK_GALAT}
                onRetry={muatUlang}
              />
            ) : (
              <Text style={tw`text-center text-gray-500 mt-6`}>
                {keadaan === 'memuat' ? 'Memuat…' : 'Prospek tidak ditemukan.'}
              </Text>
            )
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => onPilih(item)}
              style={tw`bg-white rounded-xl p-3 mb-2 border border-gray-100`}
            >
              <Text style={tw`font-semibold text-gray-900`}>{item.nama}</Text>
              <Text style={tw`text-xs text-gray-500`}>{`${item.noTelp} · ${LABEL_STATUS_PROSPEK[item.status]}`}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}
