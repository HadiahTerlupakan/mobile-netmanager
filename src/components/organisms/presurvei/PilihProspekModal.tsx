import React, { useState } from 'react';
import { FlatList, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTemaPersona } from '@/theme';
import { QueryErrorState } from '@/components/molecules/QueryErrorState';
import { JUDUL_PROSPEK_KOSONG, LABEL_STATUS_PROSPEK, PESAN_PROSPEK_KOSONG } from '@/constants/presurvei';
import { useCariProspek } from '@/hooks/presurvei/useCariProspek';
import type { ProspekListItem } from '@/types/presurvei';
import { FormTambahProspek } from './FormTambahProspek';
import { LencanaJenisProspek } from './LencanaJenisProspek';
import { TombolTambahProspek } from './TombolTambahProspek';

/** Pesan saat daftar tidak bisa dimuat; kegiatan tetap bisa dicatat tanpa prospek. */
const PESAN_PROSPEK_OFFLINE =
  'Tidak ada koneksi. Memilih prospek butuh internet; kegiatan tetap bisa dicatat tanpa prospek.';
const PESAN_PROSPEK_GALAT = 'Daftar prospek gagal dimuat.';
/** Jarak isi modal dari tepi layar setelah inset sistem. */
const JARAK_TEPI = 16;
/** Perluasan area sentuh tombol Tutup — teksnya kecil untuk jari. */
const PERLUASAN_SENTUH = { top: 12, bottom: 12, left: 12, right: 12 };

interface PilihProspekModalProps {
  onTutup: () => void;
  onPilih: (prospek: ProspekListItem) => void;
}

interface KepalaModalProps {
  judul: string;
  labelTutup: string;
  onTutup: () => void;
}

/** Judul modal dengan tombol tutup/batal di kanan. */
function KepalaModal({ judul, labelTutup, onTutup }: KepalaModalProps) {
  const { tw } = useTemaPersona();
  return (
    <View style={tw`flex-row items-center justify-between mb-3 px-4`}>
      <Text style={tw`text-lg font-bold text-gray-900`}>{judul}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={onTutup}
        hitSlop={PERLUASAN_SENTUH}
        style={tw`px-3 py-1.5 bg-utama-sangat-muda rounded-full`}
      >
        <Text style={tw`text-utama-kuat font-semibold`}>{labelTutup}</Text>
      </TouchableOpacity>
    </View>
  );
}

/** Daftar prospek milik sendiri dengan pencarian; dipasang hanya selama mode daftar. */
function DaftarPilihProspek({ onPilih }: Pick<PilihProspekModalProps, 'onPilih'>) {
  const { tw } = useTemaPersona();
  const { cari, setCari, prospek, keadaan, muatBerikutnya, muatUlang } = useCariProspek();
  const isGagal = keadaan === 'offline' || keadaan === 'galat';
  return (
    <>
      <TextInput
        accessibilityLabel="Cari prospek"
        value={cari}
        onChangeText={setCari}
        placeholder="Cari nama atau nomor HP"
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
              {keadaan === 'memuat' ? 'Memuat…' : `${JUDUL_PROSPEK_KOSONG}. ${PESAN_PROSPEK_KOSONG}`}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Pilih ${item.nama}`}
            onPress={() => onPilih(item)}
            style={tw`bg-white rounded-xl p-3 mb-2 border border-gray-100`}
          >
            <Text style={tw`font-semibold text-gray-900`}>{item.nama}</Text>
            <LencanaJenisProspek prospek={item} />
            <Text style={tw`text-xs text-gray-500`}>{`${item.noTelp} · ${LABEL_STATUS_PROSPEK[item.status]}`}</Text>
          </TouchableOpacity>
        )}
      />
    </>
  );
}

/**
 * Pemilih prospek milik sendiri (form rencana & catat kegiatan). Dirender
 * hanya saat dibuka. "Tambah prospek baru" mengganti isi modal
 * dengan form tambah; prospek yang tersimpan langsung dipilih.
 */
export function PilihProspekModal({ onTutup, onPilih }: PilihProspekModalProps) {
  const { tw } = useTemaPersona();
  const [isTambahTerbuka, setIsTambahTerbuka] = useState(false);
  // Modal layar penuh digambar sampai ke bawah status bar (Android edge-to-edge):
  // tanpa inset, tombol Tutup berada di area status bar dan tidak bisa diketuk.
  const insets = useSafeAreaInsets();
  const kembaliKeDaftar = () => setIsTambahTerbuka(false);

  return (
    <Modal visible animationType="slide" onRequestClose={isTambahTerbuka ? kembaliKeDaftar : onTutup}>
      <View
        testID="isi-pilih-prospek"
        style={[
          tw`flex-1 bg-gray-50`,
          { paddingTop: insets.top + JARAK_TEPI, paddingBottom: insets.bottom + JARAK_TEPI },
        ]}
      >
        {isTambahTerbuka ? (
          <>
            <KepalaModal judul="Tambah Prospek" labelTutup="Batal" onTutup={kembaliKeDaftar} />
            <FormTambahProspek onBerhasil={onPilih} />
          </>
        ) : (
          <>
            <KepalaModal judul="Pilih prospek" labelTutup="Tutup" onTutup={onTutup} />
            <View style={tw`flex-1 px-4`}>
              <TombolTambahProspek label="Tambah prospek baru" onTekan={() => setIsTambahTerbuka(true)} />
              <DaftarPilihProspek onPilih={onPilih} />
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}
