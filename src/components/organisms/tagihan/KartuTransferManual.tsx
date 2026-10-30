import { CheckCircle, Copy, Upload } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import type { RekeningTransferManual } from '@/types/portalPelanggan';

const UKURAN_IKON_SALIN = 16;
/** gray-600, orange-700, teal-600 */
const WARNA_SALIN_REKENING = '#4b5563';
const WARNA_SALIN_NOMINAL = '#c2410c';
const WARNA_TERKIRIM = '#0d9488';

interface KartuTransferManualProps {
  rekening: RekeningTransferManual;
  nominal: string;
  nominalMentah: number;
  isBuktiTerkirim: boolean;
  isMengunggah: boolean;
  onSalin: (teks: string, label: string) => void;
  onUnggahBukti: () => void;
}

function TombolUnggah({ isMengunggah, onUnggahBukti }: Pick<KartuTransferManualProps, 'isMengunggah' | 'onUnggahBukti'>) {
  return (
    <View style={tw`mt-4`}>
      <Text style={tw`text-xs text-gray-500 text-center mb-2`}>Silakan unggah bukti transfer setelah melakukan pembayaran.</Text>
      <TouchableOpacity
        style={tw`bg-teal-600 flex-row items-center justify-center p-3 rounded-xl ${isMengunggah ? 'opacity-70' : ''}`}
        onPress={onUnggahBukti}
        disabled={isMengunggah}
      >
        {isMengunggah ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Upload size={18} color="#fff" style={tw`mr-2`} />
            <Text style={tw`text-white font-bold`}>Unggah Bukti Transfer</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

/** Instruksi transfer bank manual dan unggah bukti transfernya. */
export function KartuTransferManual({ rekening, nominal, nominalMentah, isBuktiTerkirim, isMengunggah, onSalin, onUnggahBukti }: KartuTransferManualProps) {
  return (
    <View style={tw`bg-gray-50 rounded-xl p-4 border border-gray-200`}>
      <Text style={tw`text-gray-600 text-xs mb-1`}>Transfer Bank Manual ({rekening.bankName})</Text>
      <Text style={tw`font-bold text-gray-900 text-lg mb-4`}>{rekening.accountName}</Text>

      <View style={tw`bg-white border border-gray-200 p-3 rounded-lg mb-4`}>
        <Text style={tw`text-xs text-gray-500 mb-1`}>Nomor Rekening</Text>
        <View style={tw`flex-row items-center justify-between`}>
          <Text style={tw`text-xl font-bold tracking-widest text-gray-900`}>{rekening.accountNumber}</Text>
          <TouchableOpacity onPress={() => onSalin(rekening.accountNumber, 'Nomor Rekening')} style={tw`p-2 bg-gray-100 rounded-md`}>
            <Copy size={UKURAN_IKON_SALIN} color={WARNA_SALIN_REKENING} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={tw`bg-orange-50 border border-orange-200 p-3 rounded-lg mb-2`}>
        <Text style={tw`text-xs text-orange-800 mb-1`}>Nominal Transfer (Transfer Tepat!)</Text>
        <View style={tw`flex-row items-center justify-between`}>
          <Text style={tw`text-2xl font-black tracking-tight text-orange-600`}>{nominal}</Text>
          <TouchableOpacity onPress={() => onSalin(nominalMentah.toString(), 'Nominal')} style={tw`p-2 bg-orange-200 rounded-md`}>
            <Copy size={UKURAN_IKON_SALIN} color={WARNA_SALIN_NOMINAL} />
          </TouchableOpacity>
        </View>
      </View>

      {isBuktiTerkirim ? (
        <View style={tw`bg-teal-50 border border-teal-200 p-3 rounded-lg mt-2 items-center`}>
          <CheckCircle size={24} color={WARNA_TERKIRIM} style={tw`mb-1`} />
          <Text style={tw`text-teal-800 font-bold text-sm`}>Menunggu Verifikasi Admin</Text>
          <Text style={tw`text-teal-600 text-xs text-center mt-1`}>
            Bukti transfer Anda sedang direview. Proses ini dapat memakan waktu beberapa saat pada jam kerja.
          </Text>
        </View>
      ) : (
        <TombolUnggah isMengunggah={isMengunggah} onUnggahBukti={onUnggahBukti} />
      )}
    </View>
  );
}
