import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { CheckCircle, Clock, Router as RouterIcon } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { formatRupiah } from '@/utils/rupiah';

dayjs.locale('id');

/** teal-100 */
const WARNA_IKON = '#ccfbf1';

interface KartuRingkasanTagihanProps {
  jumlahTagihan: number;
  total: string;
  jatuhTempoTerdekat: string | null;
  /** Ada tagihan yang lewat jatuh tempo; disebut "Terlambat" seperti di Riwayat. */
  isTerlambat: boolean;
  /** Rupiah yang memotong tagihan berikutnya; 0 tidak ditampilkan. */
  saldoKredit: number;
  isTampilkanTombolBayar: boolean;
  onBayar: () => void;
}

/** Total tagihan yang belum dibayar, jatuh tempo terdekat, dan tombol Bayar Sekarang. */
export function KartuRingkasanTagihan(props: KartuRingkasanTagihanProps) {
  const { jumlahTagihan, total, jatuhTempoTerdekat, isTerlambat, saldoKredit, isTampilkanTombolBayar, onBayar } = props;
  const tanggalJatuhTempo = dayjs(jatuhTempoTerdekat).format('D MMM YYYY');
  return (
    <View style={tw`shadow-md rounded-2xl bg-white`}>
      <View style={tw`bg-teal-600 rounded-2xl p-6 overflow-hidden`}>
        <View style={tw`absolute -right-16 -top-16 w-48 h-48 bg-white/10 rounded-full`} />
        <View style={tw`absolute -left-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full`} />

        <View style={tw`flex-row justify-between items-start mb-6`}>
          <View>
            <Text style={tw`text-teal-50 text-sm font-medium mb-1`}>
              {jumlahTagihan > 1 ? `Total ${jumlahTagihan} Tagihan Belum Dibayar` : 'Total Tagihan'}
            </Text>
            <Text style={tw`text-3xl font-black text-white tracking-tight`}>{total}</Text>
            {jatuhTempoTerdekat ? (
              <View style={tw`flex-row items-center mt-2.5 bg-teal-700/50 self-start px-2.5 py-1 rounded-md`}>
                <Clock size={14} color={WARNA_IKON} style={tw`mr-1.5`} />
                <Text style={tw`text-teal-50 text-xs font-medium`}>
                  {isTerlambat ? `Terlambat · jatuh tempo ${tanggalJatuhTempo}` : `Jatuh tempo ${tanggalJatuhTempo}`}
                </Text>
              </View>
            ) : (
              <View style={tw`flex-row items-center mt-2`}>
                <CheckCircle size={14} color={WARNA_IKON} style={tw`mr-1`} />
                <Text style={tw`text-teal-100 text-xs`}>Tidak ada tagihan tertunggak</Text>
              </View>
            )}
          </View>
          <View style={tw`bg-white/20 p-2.5 rounded-xl`}>
            <RouterIcon size={24} color="white" />
          </View>
        </View>

        {saldoKredit > 0 && (
          <View style={tw`bg-white/15 rounded-lg px-3 py-2 mb-3`}>
            <Text style={tw`text-white text-xs font-bold`}>{`Saldo kredit ${formatRupiah(saldoKredit)}`}</Text>
            <Text style={tw`text-teal-50 text-xs mt-0.5`}>Dipotong otomatis dari tagihan berikutnya.</Text>
          </View>
        )}

        <View style={tw`flex-row items-center gap-2 mb-4`}>
          <CheckCircle size={16} color={WARNA_IKON} />
          <Text style={tw`text-teal-50 text-xs`}>Pembayaran aman & terenkripsi</Text>
        </View>

        {isTampilkanTombolBayar && (
          <TouchableOpacity onPress={onBayar} style={tw`bg-white/20 border border-white/30 h-12 rounded-xl flex-row items-center justify-center`}>
            <Text style={tw`text-white font-bold text-base`}>Bayar Sekarang</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
