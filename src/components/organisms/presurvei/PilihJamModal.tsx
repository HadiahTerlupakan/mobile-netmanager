import { Check } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTemaPersona } from '@/theme';
import { daftarKelompokJam, tulisJamTampil } from '@/utils/presurvei/pilihanWaktuRencana';

/** Jarak isi modal dari tepi layar setelah inset sistem. */
const JARAK_TEPI = 16;
const PERLUASAN_SENTUH = { top: 12, bottom: 12, left: 12, right: 12 };
const UKURAN_IKON = 14;

interface PilihJamModalProps {
  terlihat: boolean;
  /** Jam terpilih "HH:mm" ('' = belum ada). */
  terpilih: string;
  onPilih: (jam: string) => void;
  onTutup: () => void;
}

/**
 * Pemilih jam berupa tombol-tombol jam yang tinggal diketuk, dikelompokkan
 * per bagian hari. Menggantikan jam analog sistem yang membingungkan.
 */
export function PilihJamModal({ terlihat, terpilih, onPilih, onTutup }: PilihJamModalProps) {
  const { tw } = useTemaPersona();
  // Modal layar penuh digambar sampai ke bawah status bar; inset menjaga tombol Batal tetap bisa diketuk.
  const insets = useSafeAreaInsets();
  const kelompok = useMemo(() => daftarKelompokJam(), []);

  const pilih = (jam: string) => {
    onPilih(jam);
    onTutup();
  };

  return (
    <Modal visible={terlihat} animationType="slide" onRequestClose={onTutup}>
      <View style={[tw`flex-1 bg-gray-50 px-4`, { paddingTop: insets.top + JARAK_TEPI, paddingBottom: insets.bottom + JARAK_TEPI }]}>
        <View style={tw`flex-row items-center mb-1`}>
          <Text style={tw`flex-1 text-lg font-bold text-gray-900`}>Pilih jam kunjungan</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Batal" hitSlop={PERLUASAN_SENTUH} onPress={onTutup}>
            <Text style={tw`text-utama-kuat font-semibold`}>Batal</Text>
          </TouchableOpacity>
        </View>
        <Text style={tw`text-sm text-gray-500 mb-3`}>Ketuk salah satu jam di bawah.</Text>
        <ScrollView>
          {kelompok.map(({ judul, daftarJam }) => (
            <View key={judul} style={tw`mb-4`}>
              <Text style={tw`font-bold text-gray-700 mb-2`}>{judul}</Text>
              <View style={tw`flex-row flex-wrap -m-1`}>
                {daftarJam.map((jam) => {
                  const isTerpilih = jam === terpilih;
                  const label = tulisJamTampil(jam);
                  return (
                    <TouchableOpacity
                      key={jam}
                      accessibilityRole="button"
                      accessibilityLabel={`Jam ${label}`}
                      accessibilityState={{ selected: isTerpilih }}
                      onPress={() => pilih(jam)}
                      style={tw`w-1/4 p-1`}
                    >
                      <View
                        style={tw`flex-row items-center justify-center py-3 rounded-xl border-2 ${
                          isTerpilih ? 'bg-utama-kuat border-utama-kuat' : 'bg-white border-gray-200'
                        }`}
                      >
                        {isTerpilih ? <Check size={UKURAN_IKON} color="white" style={tw`mr-1`} /> : null}
                        <Text style={tw`text-base font-semibold ${isTerpilih ? 'text-white' : 'text-gray-900'}`}>{label}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}
