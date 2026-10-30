import { Star } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { LABEL_PENILAIAN } from '@/constants/tiketPelanggan';
import type { MuatanTutupTiket } from '@/types/portalPelanggan';

const UKURAN_BINTANG = 32;
/** yellow-400 / gray-300 */
const WARNA_BINTANG_AKTIF = '#facc15';
const WARNA_BINTANG_KOSONG = '#d1d5db';

interface ModalTutupTiketProps {
  isTerlihat: boolean;
  isMenutup: boolean;
  onBatal: () => void;
  onTutup: (muatan: MuatanTutupTiket) => void;
}

/** Rating & feedback dikirim hanya bila diisi: keduanya opsional di server. */
function susunMuatanTutup(penilaian: number, masukan: string): MuatanTutupTiket {
  const feedback = masukan.trim();
  return { ...(penilaian > 0 ? { rating: penilaian } : {}), ...(feedback ? { feedback } : {}) };
}

/** Konfirmasi tutup tiket dengan penilaian bintang dan masukan opsional. */
export function ModalTutupTiket({ isTerlihat, isMenutup, onBatal, onTutup }: ModalTutupTiketProps) {
  const [penilaian, setPenilaian] = useState(0);
  const [masukan, setMasukan] = useState('');
  return (
    <Modal visible={isTerlihat} transparent animationType="fade" onRequestClose={onBatal}>
      <View style={tw`flex-1 bg-black/50 items-center justify-center p-4`}>
        <View style={tw`bg-white rounded-2xl w-full p-5`}>
          <Text style={tw`text-lg font-bold text-gray-900 mb-2`}>Tutup Tiket?</Text>
          <Text style={tw`text-sm text-gray-500 mb-4`}>
            Apakah masalah Anda sudah teratasi? Setelah ditutup, tiket tidak dapat dibuka kembali.
          </Text>
          <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>Bagaimana penilaian Anda terhadap layanan kami?</Text>
          <View style={tw`flex-row justify-center`}>
            {LABEL_PENILAIAN.map((label, indeks) => (
              <TouchableOpacity key={label} accessibilityRole="button" accessibilityLabel={`${indeks + 1} bintang`} onPress={() => setPenilaian(indeks + 1)} style={tw`p-1`}>
                <Star size={UKURAN_BINTANG} color={penilaian > indeks ? WARNA_BINTANG_AKTIF : WARNA_BINTANG_KOSONG} fill={penilaian > indeks ? WARNA_BINTANG_AKTIF : 'none'} />
              </TouchableOpacity>
            ))}
          </View>
          {penilaian > 0 ? <Text style={tw`text-center text-sm text-gray-500 mt-1`}>{LABEL_PENILAIAN[penilaian - 1]}</Text> : null}
          <TextInput
            accessibilityLabel="Masukan penutupan"
            value={masukan}
            onChangeText={setMasukan}
            placeholder="Tulis feedback atau komentar (opsional)..."
            multiline
            textAlignVertical="top"
            style={tw`mt-4 h-24 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900`}
          />
          <View style={tw`flex-row mt-4`}>
            <TouchableOpacity accessibilityRole="button" onPress={onBatal} style={tw`flex-1 mr-2 py-3 rounded-xl border border-gray-300 items-center`}>
              <Text style={tw`font-bold text-gray-700`}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ disabled: isMenutup }}
              disabled={isMenutup}
              onPress={() => onTutup(susunMuatanTutup(penilaian, masukan))}
              style={tw`flex-1 ml-2 py-3 rounded-xl bg-teal-600 items-center ${isMenutup ? 'opacity-70' : ''}`}
            >
              {isMenutup ? <ActivityIndicator color="white" /> : <Text style={tw`font-bold text-white`}>Ya, Tutup</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
