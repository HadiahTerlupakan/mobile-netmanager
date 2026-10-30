import { CheckCircle } from 'lucide-react-native';
import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

const UKURAN_IKON = 56;
/** green-600 */
const WARNA_IKON = '#16a34a';

interface LembarPembayaranBerhasilProps {
  nominal: string | null;
  nomorTagihan: string | null;
  onTutup: () => void;
}

/** Konfirmasi pembayaran yang baru diterima; tampil selama `nominal` terisi. */
export function LembarPembayaranBerhasil({ nominal, nomorTagihan, onTutup }: LembarPembayaranBerhasilProps) {
  return (
    <Modal visible={nominal !== null} transparent animationType="slide" onRequestClose={onTutup}>
      <View style={tw`flex-1 justify-end bg-black/40`}>
        <View style={tw`bg-white rounded-t-3xl p-6 items-center`}>
          <CheckCircle size={UKURAN_IKON} color={WARNA_IKON} />
          <Text style={tw`text-xl font-bold text-gray-900 mt-3`}>Pembayaran Berhasil</Text>
          <Text style={tw`text-3xl font-black text-teal-600 mt-2`}>{nominal}</Text>
          <Text style={tw`text-xs text-gray-500 mt-1`}>#{nomorTagihan}</Text>
          <Text style={tw`text-sm text-gray-600 text-center mt-3`}>
            Terima kasih. Layanan internet Anda tetap aktif; bila sempat terisolir, akan pulih dalam beberapa menit.
          </Text>
          <TouchableOpacity onPress={onTutup} style={tw`bg-teal-600 self-stretch mt-5 py-3 rounded-xl items-center`}>
            <Text style={tw`text-white font-bold`}>Selesai</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
