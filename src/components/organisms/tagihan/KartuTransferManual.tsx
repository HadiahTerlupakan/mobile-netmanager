import { CheckCircle, Upload } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { InfoRekeningTujuan } from '@/components/organisms/tagihan/InfoRekeningTujuan';
import type { RekeningTransferManual } from '@/types/portalPelanggan';

/** teal-600 */
const WARNA_TERKIRIM = '#0d9488';

interface KartuTransferManualProps {
  rekening: RekeningTransferManual | undefined;
  nominal: string;
  nominalMentah: number;
  isBuktiTerkirim: boolean;
  isMengunggah: boolean;
  isMembatalkan: boolean;
  onSalin: (teks: string, label: string) => void;
  onUnggahBukti: () => void;
  onBatalkan: () => void;
}

type PropsTombolBukti = Pick<KartuTransferManualProps, 'isBuktiTerkirim' | 'isMengunggah' | 'onUnggahBukti'>;

function TombolBukti({ isBuktiTerkirim, isMengunggah, onUnggahBukti }: PropsTombolBukti) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: isMengunggah, busy: isMengunggah }}
      style={tw`flex-row items-center justify-center p-3 rounded-xl mt-3 ${isBuktiTerkirim ? 'border border-teal-600' : 'bg-teal-600'} ${isMengunggah ? 'opacity-70' : ''}`}
      onPress={onUnggahBukti}
      disabled={isMengunggah}
    >
      {isMengunggah ? (
        <ActivityIndicator color={isBuktiTerkirim ? WARNA_TERKIRIM : '#fff'} />
      ) : (
        <>
          <Upload size={18} color={isBuktiTerkirim ? WARNA_TERKIRIM : '#fff'} style={tw`mr-2`} />
          <Text style={tw`font-bold ${isBuktiTerkirim ? 'text-teal-700' : 'text-white'}`}>
            {isBuktiTerkirim ? 'Ganti Bukti Transfer' : 'Unggah Bukti Transfer'}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

function StatusBukti({ isBuktiTerkirim }: Pick<KartuTransferManualProps, 'isBuktiTerkirim'>) {
  if (!isBuktiTerkirim) {
    return <Text style={tw`text-xs text-gray-500 text-center mt-4`}>Silakan unggah bukti transfer setelah melakukan pembayaran.</Text>;
  }
  return (
    <View style={tw`bg-teal-50 border border-teal-200 p-3 rounded-lg mt-2 items-center`}>
      <CheckCircle size={24} color={WARNA_TERKIRIM} style={tw`mb-1`} />
      <Text style={tw`text-teal-800 font-bold text-sm`}>Menunggu Verifikasi Admin</Text>
      <Text style={tw`text-teal-600 text-xs text-center mt-1`}>
        Bukti transfer Anda sedang direview. Proses ini dapat memakan waktu beberapa saat pada jam kerja.
      </Text>
    </View>
  );
}

/**
 * Instruksi transfer bank manual dan bukti transfernya. Bukti yang belum
 * diverifikasi bisa diganti, dan checkout-nya bisa dibatalkan untuk memilih
 * metode lain.
 */
export function KartuTransferManual(props: KartuTransferManualProps) {
  return (
    <View style={tw`bg-gray-50 rounded-xl p-4 border border-gray-200`}>
      <InfoRekeningTujuan rekening={props.rekening} nominal={props.nominal} nominalMentah={props.nominalMentah} onSalin={props.onSalin} />
      <StatusBukti isBuktiTerkirim={props.isBuktiTerkirim} />
      <TombolBukti isBuktiTerkirim={props.isBuktiTerkirim} isMengunggah={props.isMengunggah} onUnggahBukti={props.onUnggahBukti} />
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ disabled: props.isMembatalkan, busy: props.isMembatalkan }}
        disabled={props.isMembatalkan}
        onPress={props.onBatalkan}
        style={tw`mt-3 py-3 rounded-xl items-center border border-gray-300 ${props.isMembatalkan ? 'opacity-70' : ''}`}
      >
        {props.isMembatalkan ? <ActivityIndicator color="#374151" /> : <Text style={tw`text-gray-700 font-bold`}>Batalkan / Ganti Metode</Text>}
      </TouchableOpacity>
    </View>
  );
}
