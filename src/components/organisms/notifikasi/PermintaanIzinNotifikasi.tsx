/**
 * Penjelasan singkat sebelum dialog izin notifikasi milik sistem muncul.
 *
 * Dialog `POST_NOTIFICATIONS` Android hanya berisi satu baris tanpa konteks,
 * dan penolakannya permanen sampai pengguna membuka Pengaturan sendiri. Satu
 * layar penjelasan sebelum itu adalah selisih antara teknisi yang tahu ada work
 * order baru dan teknisi yang baru tahu saat membuka aplikasi.
 */

import { Bell, Clock, ClipboardList, MessageCircle } from 'lucide-react-native';
import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

import { useTemaPersona } from '@/theme';

interface PermintaanIzinNotifikasiProps {
  visible: boolean;
  onSetuju: () => void;
  onTolak: () => void;
}

/** Hal-hal yang benar-benar dikirim lewat push — bukan janji pemasaran. */
const ALASAN = [
  { Ikon: ClipboardList, teks: 'Work order baru yang ditugaskan ke Anda' },
  { Ikon: MessageCircle, teks: 'Balasan diskusi dan keluhan pelanggan' },
  { Ikon: Clock, teks: 'Pengingat absensi dan persetujuan izin' },
] as const;

export function PermintaanIzinNotifikasi({
  visible,
  onSetuju,
  onTolak,
}: PermintaanIzinNotifikasiProps) {
  const { tw, warna } = useTemaPersona();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onTolak}>
      <View style={tw`flex-1 bg-black/50 justify-center items-center p-4`}>
        <View style={tw`bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full shadow-xl p-6`}>
          <View style={tw`items-center mb-4`}>
            <View style={tw`bg-utama-muda dark:bg-utama-pekat/30 p-4 rounded-full`}>
              <Bell size={40} color={warna.utama} />
            </View>
          </View>

          <Text style={tw`text-xl font-bold text-center text-gray-800 dark:text-white mb-2`}>
            Aktifkan Notifikasi
          </Text>

          <Text style={tw`text-sm text-gray-600 dark:text-gray-300 mb-4 leading-5`}>
            RADPRO mengirim pemberitahuan agar Anda tidak perlu membuka aplikasi
            untuk mengetahui hal berikut:
          </Text>

          <View style={tw`mb-4`}>
            {ALASAN.map(({ Ikon, teks }) => (
              <View key={teks} style={tw`flex-row items-start mb-3`}>
                <Ikon size={18} color={warna.utama} style={tw`mt-0.5`} />
                <Text style={tw`text-sm text-gray-600 dark:text-gray-300 flex-1 ml-3`}>
                  {teks}
                </Text>
              </View>
            ))}
          </View>

          <Text style={tw`text-xs text-gray-500 dark:text-gray-400 mb-5 leading-4`}>
            Anda dapat mematikannya kapan saja melalui Pengaturan perangkat.
          </Text>

          <View style={tw`flex-row gap-3`}>
            <TouchableOpacity
              style={tw`flex-1 bg-gray-200 dark:bg-gray-700 py-3 rounded-xl`}
              onPress={onTolak}
            >
              <Text style={tw`text-center font-semibold text-gray-700 dark:text-gray-300`}>
                Nanti saja
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={tw`flex-1 bg-utama-kuat py-3 rounded-xl`}
              onPress={onSetuju}
            >
              <Text style={tw`text-center font-semibold text-white`}>Aktifkan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default PermintaanIzinNotifikasi;
