import { AlertCircle, Tag, XCircle } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { Skeleton } from '@/components/atoms/Skeleton';
import { PilihanMetodeBayar, type MetodeBayar } from '@/components/organisms/tagihan/PilihanMetodeBayar';
import { formatRupiah } from '@/utils/rupiah';

/** gray-400, amber-700 */
const WARNA_IKON_REDUP = '#9ca3af';
const WARNA_PERINGATAN = '#b45309';

export interface KuponTagihan {
  kode: string;
  setKode: (kode: string) => void;
  diskon: { code: string; amount: number } | null;
  isMengecek: boolean;
  onCek: () => void;
  onHapus: () => void;
}

interface PanelRincianPembayaranProps {
  kupon: KuponTagihan;
  metode: MetodeBayar[] | undefined;
  kodeTerpilih: string;
  onPilihMetode: (kode: string) => void;
  totalBayar: number;
  isGantiMetode: boolean;
  isMembayar: boolean;
  onBayar: () => void;
  onTutup: () => void;
}

function IsianKupon({ kupon }: { kupon: KuponTagihan }) {
  return (
    <>
      <Text style={tw`text-gray-700 text-sm font-medium mb-2`}>Kode Kupon</Text>
      <View style={tw`flex-row gap-2 mb-4`}>
        <View style={tw`flex-1 bg-gray-50 rounded-xl flex-row items-center px-3 border border-gray-200`}>
          <Tag size={18} color={WARNA_IKON_REDUP} />
          <TextInput
            placeholder="MASUKAN KODE"
            placeholderTextColor={WARNA_IKON_REDUP}
            style={tw`flex-1 text-gray-900 text-sm font-bold ml-2 py-3`}
            value={kupon.kode}
            onChangeText={(teks) => kupon.setKode(teks.toUpperCase())}
            editable={!kupon.diskon}
          />
        </View>
        {kupon.diskon ? (
          <TouchableOpacity onPress={kupon.onHapus} style={tw`bg-red-50 px-4 justify-center rounded-xl border border-red-200`}>
            <Text style={tw`text-red-600 font-bold text-sm`}>Hapus</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={kupon.onCek}
            disabled={kupon.isMengecek || !kupon.kode}
            style={tw`bg-teal-50 px-5 justify-center rounded-xl border border-teal-200 ${!kupon.kode ? 'opacity-50' : ''}`}
          >
            <Text style={tw`text-teal-700 font-bold`}>{kupon.isMengecek ? '...' : 'CEK'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {kupon.diskon && (
        <View style={tw`flex-row justify-between items-center mb-4 bg-green-50 p-3 rounded-lg border border-green-200`}>
          <Text style={tw`text-green-800 text-sm`}>Diskon ({kupon.diskon.code})</Text>
          <Text style={tw`text-green-700 text-sm font-bold`}>-{formatRupiah(kupon.diskon.amount)}</Text>
        </View>
      )}
    </>
  );
}

// Duitku tidak bisa menutup VA lebih awal: nomor lama tetap bisa dibayar
// sampai kedaluwarsa. Bila terlanjur dibayar keduanya, server mengkreditkan
// kelebihannya ke saldo pelanggan.
function PeringatanGantiMetode() {
  return (
    <View style={tw`flex-row bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4`}>
      <AlertCircle size={18} color={WARNA_PERINGATAN} />
      <Text style={tw`flex-1 text-amber-800 text-xs ml-2`}>
        Nomor VA/QRIS sebelumnya akan diganti. Bayar hanya yang baru; bila terlanjur membayar keduanya, kelebihannya menjadi saldo
        yang memotong tagihan berikutnya.
      </Text>
    </View>
  );
}

/** Kupon, pilihan metode, total, dan tombol Konfirmasi & Bayar. */
export function PanelRincianPembayaran(props: PanelRincianPembayaranProps) {
  const { metode, kodeTerpilih, isMembayar } = props;
  return (
    <View style={tw`mt-4 bg-white rounded-2xl p-5 border border-gray-200 shadow-sm`}>
      <View style={tw`flex-row justify-between items-center mb-4`}>
        <Text style={tw`text-lg font-bold text-gray-900`}>Rincian Pembayaran</Text>
        <TouchableOpacity accessibilityLabel="Tutup rincian pembayaran" onPress={props.onTutup} style={tw`p-1`}>
          <XCircle size={22} color={WARNA_IKON_REDUP} />
        </TouchableOpacity>
      </View>

      {props.isGantiMetode && <PeringatanGantiMetode />}
      <IsianKupon kupon={props.kupon} />
      <View style={tw`h-px bg-gray-100 mb-4`} />

      <Text style={tw`text-gray-700 text-sm font-medium mb-3`}>Pilih Metode Pembayaran</Text>
      {metode ? (
        <PilihanMetodeBayar metode={metode} kodeTerpilih={kodeTerpilih} onPilih={props.onPilihMetode} />
      ) : (
        <View style={tw`gap-2 mb-4`}>
          <Skeleton height={50} borderRadius={12} />
          <Skeleton height={50} borderRadius={12} />
        </View>
      )}

      <View style={tw`flex-row justify-between items-center mb-4`}>
        <Text style={tw`text-gray-600 font-medium`}>Total Bayar</Text>
        <Text style={tw`text-teal-700 font-black text-xl`}>{formatRupiah(props.totalBayar)}</Text>
      </View>

      <TouchableOpacity
        onPress={props.onBayar}
        disabled={isMembayar || !kodeTerpilih}
        style={tw`bg-teal-600 h-13 rounded-xl flex-row items-center justify-center gap-2 ${!kodeTerpilih ? 'opacity-50' : ''}`}
      >
        {isMembayar ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={tw`text-white font-bold text-base`}>Konfirmasi & Bayar</Text>}
      </TouchableOpacity>
    </View>
  );
}
