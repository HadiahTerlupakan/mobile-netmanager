/**
 * Peringatan bahwa tracking lokasi kerja tidak bisa berjalan. Ditampilkan oleh
 * PeringatanTrackingProvider lewat utils/peringatanTracking.
 */

import { MapPinOff } from 'lucide-react-native';
import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

import type { KendalaTracking } from '@/services/kesiapanTracking';
import { useTemaPersona } from '@/theme';
import type { HasilPeringatan, PermintaanPeringatan } from '@/utils/peringatanTracking';

const LANGKAH_IZIN = 'Buka Pengaturan → Izin → Lokasi → pilih "Izinkan sepanjang waktu" (iPhone: "Selalu").';

const ISI_KENDALA: Record<KendalaTracking, { judul: string; isi: string; langkah: string }> = {
  'izin-latar': {
    judul: 'Izin Lokasi Belum Sepanjang Waktu',
    isi: 'Tracking lokasi kerja membutuhkan izin lokasi sepanjang waktu. Lokasi hanya diambil dari check-in sampai check-out.',
    langkah: LANGKAH_IZIN,
  },
  'izin-lokasi': {
    judul: 'Izin Lokasi Ditolak',
    isi: 'Aplikasi tidak diizinkan membaca lokasi, sehingga kehadiran dan perjalanan kerja tidak bisa dicatat.',
    langkah: LANGKAH_IZIN,
  },
  'gps-mati': {
    judul: 'GPS Tidak Aktif',
    isi: 'Lokasi (GPS) perangkat sedang mati, sehingga posisi kerja tidak bisa dicatat.',
    langkah: 'Buka Pengaturan → nyalakan Lokasi.',
  },
};

const CATATAN_KONTEKS = {
  'check-in': 'Check-in tidak bisa dilakukan sebelum ini diaktifkan.',
  sesi: 'Anda sedang dalam jam kerja. Selama tracking mati, kejadian ini tercatat.',
} as const;

interface PeringatanTrackingModalProps {
  permintaan: PermintaanPeringatan | null;
  onPilih: (hasil: HasilPeringatan) => void;
}

export function PeringatanTrackingModal({ permintaan, onPilih }: PeringatanTrackingModalProps) {
  const { tw, warna } = useTemaPersona();
  if (!permintaan) return null;
  const isi = ISI_KENDALA[permintaan.kendala];
  const diSesiKerja = permintaan.konteks === 'sesi';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => onPilih('tutup')}>
      <View style={tw`flex-1 bg-black/50 justify-center items-center p-4`}>
        <View style={tw`bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full shadow-xl p-6`}>
          <View style={tw`items-center mb-4`}>
            <View style={tw`bg-red-50 dark:bg-red-900/30 p-4 rounded-full`}>
              <MapPinOff size={40} color={warna.utama} />
            </View>
          </View>
          <Text style={tw`text-xl font-bold text-center text-gray-800 dark:text-white mb-2`}>{isi.judul}</Text>
          <Text style={tw`text-sm text-gray-600 dark:text-gray-300 mb-3 leading-5`}>{isi.isi}</Text>
          <View style={tw`bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 mb-3`}>
            <Text style={tw`text-xs text-gray-700 dark:text-gray-300 leading-4`}>{isi.langkah}</Text>
          </View>
          <Text style={tw`text-xs font-semibold text-red-700 dark:text-red-300 mb-4`}>
            {CATATAN_KONTEKS[permintaan.konteks]}
          </Text>
          <View style={tw`flex-row gap-3`}>
            <TouchableOpacity
              style={tw`flex-1 bg-gray-200 dark:bg-gray-700 py-3 rounded-xl`}
              onPress={() => onPilih(diSesiKerja ? 'checkout' : 'tutup')}
            >
              <Text style={tw`text-center font-semibold text-gray-700 dark:text-gray-300`}>
                {diSesiKerja ? 'Check-out' : 'Nanti'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={tw`flex-1 bg-utama-kuat py-3 rounded-xl`} onPress={() => onPilih('pengaturan')}>
              <Text style={tw`text-center font-semibold text-white`}>Buka Pengaturan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default PeringatanTrackingModal;
