import { Check, Users } from 'lucide-react-native';
import React, { useState } from 'react';
import { FlatList, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

import type { SalesRencana } from '@/types/presurvei';
import { labelAnggotaTim, saringAnggotaTim, type ProgresHarian } from '@/utils/presurvei/timRencana';
import { AvatarAnggota } from './AvatarAnggota';

/** Jarak isi modal dari tepi layar setelah inset sistem. */
const JARAK_TEPI = 16;
/** Perluasan area sentuh tombol Tutup — teksnya kecil untuk jari. */
const PERLUASAN_SENTUH = { top: 12, bottom: 12, left: 12, right: 12 };
const UKURAN_IKON = 16;
const WARNA_TERPILIH = '#2563eb';
const WARNA_IKON_SEMUA = '#4b5563';

interface PilihAnggotaTimModalProps {
  judul: string;
  daftar: readonly SalesRencana[];
  /** null = "Semua anggota" (hanya bermakna bila `isBolehSemua`). */
  terpilih: string | null;
  penggunaId: string | null;
  /** Tampilkan opsi "Semua anggota" di atas daftar (filter tampilan Tim). */
  isBolehSemua: boolean;
  /** Progres selesai/total per anggota bila tersedia. */
  progres?: ReadonlyMap<string, ProgresHarian>;
  onPilih: (salesId: string | null) => void;
  onTutup: () => void;
}

interface BarisPilihanProps {
  label: string;
  keterangan: string | null;
  isTerpilih: boolean;
  avatar: React.ReactNode;
  onPress: () => void;
}

/** Satu baris pilihan bertinggi sentuh besar: avatar, nama, keterangan, tanda terpilih. */
function BarisPilihan({ label, keterangan, isTerpilih, avatar, onPress }: BarisPilihanProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isTerpilih }}
      onPress={onPress}
      style={tw`flex-row items-center bg-white rounded-xl px-3 py-3 mb-2 border ${
        isTerpilih ? 'border-blue-500' : 'border-gray-100'
      }`}
    >
      {avatar}
      <Text style={tw`flex-1 font-semibold text-gray-900`} numberOfLines={1}>{label}</Text>
      {keterangan !== null ? <Text style={tw`text-xs text-gray-500 ml-2`}>{keterangan}</Text> : null}
      {isTerpilih ? <View style={tw`ml-2`}><Check size={UKURAN_IKON} color={WARNA_TERPILIH} /></View> : null}
    </TouchableOpacity>
  );
}

/** Keterangan progres "x/y" anggota; tanpa data → null. */
const keteranganProgres = (progres: ProgresHarian | undefined): string | null =>
  progres ? `${progres.selesai}/${progres.total}` : null;

/**
 * Pemilih anggota tim layar penuh dengan pencarian nama; skalanya untuk tim
 * puluhan sales. Dirender hanya saat dibuka.
 */
export function PilihAnggotaTimModal(props: PilihAnggotaTimModalProps) {
  const { judul, daftar, terpilih, penggunaId, isBolehSemua, progres, onPilih, onTutup } = props;
  const [kataKunci, setKataKunci] = useState('');
  // Modal layar penuh digambar sampai ke bawah status bar (Android edge-to-edge):
  // tanpa inset, tombol Tutup berada di area status bar dan tidak bisa diketuk.
  const insets = useSafeAreaInsets();
  const hasil = saringAnggotaTim(daftar, kataKunci);
  const pilih = (salesId: string | null) => {
    onPilih(salesId);
    onTutup();
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onTutup}>
      <View
        testID="isi-pilih-anggota-tim"
        style={[
          tw`flex-1 bg-gray-50 px-4`,
          { paddingTop: insets.top + JARAK_TEPI, paddingBottom: insets.bottom + JARAK_TEPI },
        ]}
      >
        <View style={tw`flex-row items-center justify-between mb-3`}>
          <Text style={tw`text-lg font-bold text-gray-900`}>{judul}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={onTutup}
            hitSlop={PERLUASAN_SENTUH}
            style={tw`px-3 py-1.5 bg-blue-50 rounded-full`}
          >
            <Text style={tw`text-blue-600 font-semibold`}>Tutup</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          accessibilityLabel="Cari anggota"
          value={kataKunci}
          onChangeText={setKataKunci}
          placeholder="Cari nama anggota"
          style={tw`bg-white border border-gray-300 rounded-xl px-3 py-2 mb-3`}
        />
        <FlatList
          data={hasil}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={tw`flex-grow`}
          ListHeaderComponent={
            isBolehSemua ? (
              <BarisPilihan
                label="Semua anggota"
                keterangan={null}
                isTerpilih={terpilih === null}
                avatar={
                  <View style={tw`w-9 h-9 rounded-full bg-gray-100 items-center justify-center mr-3`}>
                    <Users size={UKURAN_IKON} color={WARNA_IKON_SEMUA} />
                  </View>
                }
                onPress={() => pilih(null)}
              />
            ) : null
          }
          ListEmptyComponent={<Text style={tw`text-center text-gray-500 mt-6`}>Anggota tidak ditemukan.</Text>}
          renderItem={({ item }) => (
            <BarisPilihan
              label={labelAnggotaTim(item, penggunaId)}
              keterangan={keteranganProgres(progres?.get(item.id))}
              isTerpilih={terpilih === item.id}
              avatar={<AvatarAnggota nama={item.nama} />}
              onPress={() => pilih(item.id)}
            />
          )}
        />
      </View>
    </Modal>
  );
}
