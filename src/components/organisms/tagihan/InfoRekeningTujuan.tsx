import { Copy } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import type { RekeningTransferManual } from '@/types/portalPelanggan';

const UKURAN_IKON_SALIN = 16;
/** gray-600, orange-700 */
const WARNA_SALIN_REKENING = '#4b5563';
const WARNA_SALIN_NOMINAL = '#c2410c';

interface InfoRekeningTujuanProps {
  /** Belum termuat bila daftar metode bayar belum (atau gagal) dimuat. */
  rekening: RekeningTransferManual | undefined;
  nominal: string;
  nominalMentah: number;
  onSalin: (teks: string, label: string) => void;
}

/** Rekening tujuan dan nominal transfer manual, masing-masing bisa disalin. */
export function InfoRekeningTujuan({ rekening, nominal, nominalMentah, onSalin }: InfoRekeningTujuanProps) {
  return (
    <>
      {rekening ? (
        <>
          <Text style={tw`text-gray-600 text-xs mb-1`}>Transfer Bank Manual ({rekening.bankName})</Text>
          <Text style={tw`font-bold text-gray-900 text-lg mb-4`}>{rekening.accountName}</Text>
          <View style={tw`bg-white border border-gray-200 p-3 rounded-lg mb-4`}>
            <Text style={tw`text-xs text-gray-500 mb-1`}>Nomor Rekening</Text>
            <View style={tw`flex-row items-center justify-between`}>
              <Text style={tw`text-xl font-bold tracking-widest text-gray-900`}>{rekening.accountNumber}</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Salin Nomor Rekening"
                onPress={() => onSalin(rekening.accountNumber, 'Nomor Rekening')}
                style={tw`p-2 bg-gray-100 rounded-md`}
              >
                <Copy size={UKURAN_IKON_SALIN} color={WARNA_SALIN_REKENING} />
              </TouchableOpacity>
            </View>
          </View>
        </>
      ) : (
        <Text style={tw`text-gray-600 text-sm mb-4`}>Rekening tujuan belum termuat. Tarik layar ke bawah untuk memuat ulang.</Text>
      )}

      <View style={tw`bg-orange-50 border border-orange-200 p-3 rounded-lg mb-2`}>
        <Text style={tw`text-xs text-orange-800 mb-1`}>Nominal Transfer (Transfer Tepat!)</Text>
        <View style={tw`flex-row items-center justify-between`}>
          <Text style={tw`text-2xl font-black tracking-tight text-orange-600`}>{nominal}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Salin Nominal Transfer"
            onPress={() => onSalin(nominalMentah.toString(), 'Nominal')}
            style={tw`p-2 bg-orange-200 rounded-md`}
          >
            <Copy size={UKURAN_IKON_SALIN} color={WARNA_SALIN_NOMINAL} />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}
