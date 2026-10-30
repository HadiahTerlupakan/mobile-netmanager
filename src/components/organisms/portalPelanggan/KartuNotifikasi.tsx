import { Bell, MessageSquare } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import type { NotifikasiPelanggan } from '@/types/portalPelanggan';
import { formatTimeAgo } from '@/utils/date';

const UKURAN_IKON = 18;
/** teal-600 / gray-500 */
const WARNA_IKON_TIKET = '#0d9488';
const WARNA_IKON_UMUM = '#6b7280';
const TIPE_BALASAN_TIKET = 'TICKET_REPLY';

interface KartuNotifikasiProps {
  notifikasi: NotifikasiPelanggan;
  /** Hanya untuk notifikasi yang punya tujuan, yaitu balasan tiket. */
  onBukaTiket: (idTiket: string) => void;
}

/** Satu notifikasi: balasan tiket membuka tiketnya, notifikasi lain hanya dibaca. */
export function KartuNotifikasi({ notifikasi, onBukaTiket }: KartuNotifikasiProps) {
  const isBalasanTiket = notifikasi.type === TIPE_BALASAN_TIKET && Boolean(notifikasi.ticketId);
  const Ikon = isBalasanTiket ? MessageSquare : Bell;
  return (
    <TouchableOpacity
      accessibilityRole={isBalasanTiket ? 'button' : 'text'}
      accessibilityLabel={notifikasi.message}
      disabled={!isBalasanTiket}
      onPress={() => notifikasi.ticketId && onBukaTiket(notifikasi.ticketId)}
      style={tw`flex-row bg-white p-4 rounded-xl border border-gray-100 mb-3`}
    >
      <View style={tw`w-9 h-9 rounded-full items-center justify-center ${isBalasanTiket ? 'bg-teal-50' : 'bg-gray-100'}`}>
        <Ikon size={UKURAN_IKON} color={isBalasanTiket ? WARNA_IKON_TIKET : WARNA_IKON_UMUM} />
      </View>
      <View style={tw`flex-1 ml-3`}>
        <View style={tw`flex-row items-center`}>
          <Text style={tw`flex-1 font-bold text-gray-900`} numberOfLines={1}>{notifikasi.title}</Text>
          {!notifikasi.isRead ? <View style={tw`w-2 h-2 rounded-full bg-red-500 ml-2`} /> : null}
        </View>
        <Text style={tw`text-sm text-gray-700 mt-0.5`}>{notifikasi.message}</Text>
        {notifikasi.preview && notifikasi.preview !== notifikasi.message ? (
          <Text style={tw`text-xs text-gray-500 mt-1`} numberOfLines={2}>{`${notifikasi.sender}: ${notifikasi.preview}`}</Text>
        ) : null}
        <Text style={tw`text-xs text-gray-400 mt-1`}>{formatTimeAgo(notifikasi.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}
