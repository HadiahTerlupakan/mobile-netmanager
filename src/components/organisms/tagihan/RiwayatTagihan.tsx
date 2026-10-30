import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { AlertCircle, CheckCircle, Receipt, Router as RouterIcon, type LucideIcon } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import type { TagihanPelanggan } from '@/types/portalPelanggan';
import { formatRupiah } from '@/utils/rupiah';
import { isTagihanDibatalkan, isTagihanTerutang, labelStatusTagihan } from '@/utils/statusTagihanPelanggan';

dayjs.locale('id');

type Saringan = 'ALL' | 'UNPAID' | 'PAID' | 'CANCELLED';

const SARINGAN: { kunci: Saringan; label: string; cocok: (status: string) => boolean }[] = [
  { kunci: 'ALL', label: 'Semua', cocok: () => true },
  { kunci: 'UNPAID', label: 'Belum Bayar', cocok: isTagihanTerutang },
  { kunci: 'PAID', label: 'Lunas', cocok: (status) => status === 'PAID' },
  { kunci: 'CANCELLED', label: labelStatusTagihan('CANCELLED'), cocok: isTagihanDibatalkan },
];

const TAMPILAN_STATUS: Record<string, { warna: string; latar: string; ikon: LucideIcon }> = {
  PAID: { warna: 'text-green-600', latar: 'bg-green-100', ikon: CheckCircle },
  SENT: { warna: 'text-orange-600', latar: 'bg-orange-100', ikon: RouterIcon },
  OVERDUE: { warna: 'text-red-600', latar: 'bg-red-100', ikon: AlertCircle },
};
const TAMPILAN_LAIN = { warna: 'text-gray-600', latar: 'bg-gray-100', ikon: Receipt };

function BarisTagihan({ tagihan }: { tagihan: TagihanPelanggan }) {
  const { warna, latar, ikon: Ikon } = TAMPILAN_STATUS[tagihan.status] ?? TAMPILAN_LAIN;
  return (
    <View style={tw`bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex-row items-center gap-3`}>
      <View style={tw`w-10 h-10 rounded-full ${latar} items-center justify-center`}>
        <Ikon size={20} style={tw`${warna}`} />
      </View>
      <View style={tw`flex-1`}>
        <Text style={tw`font-bold text-gray-900 text-sm`}>{tagihan.items[0]?.description || 'Tagihan Internet'}</Text>
        <Text style={tw`text-xs text-gray-500 mt-0.5`}>
          #{tagihan.invoiceNumber} • {dayjs(tagihan.issueDate).format('D MMM YYYY')}
        </Text>
      </View>
      <View style={tw`items-end`}>
        <Text style={tw`font-bold text-gray-900 text-sm`}>{formatRupiah(tagihan.totalAmount)}</Text>
        <Text style={tw`text-[10px] font-bold ${warna} mt-0.5`}>{labelStatusTagihan(tagihan.status)}</Text>
      </View>
    </View>
  );
}

/** Daftar riwayat tagihan dengan chip saringan status. */
export function RiwayatTagihan({ daftar }: { daftar: TagihanPelanggan[] }) {
  const [saringan, setSaringan] = useState<Saringan>('ALL');
  const cocok = SARINGAN.find((item) => item.kunci === saringan)!.cocok;
  const tersaring = daftar.filter((tagihan) => cocok(tagihan.status));

  return (
    <View style={tw`px-4 pb-4`}>
      <Text style={tw`text-lg font-bold text-gray-900 mb-3 mt-2`}>Riwayat Tagihan</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`gap-2 mb-4`}>
        {SARINGAN.map(({ kunci, label }) => (
          <TouchableOpacity
            key={kunci}
            onPress={() => setSaringan(kunci)}
            style={tw`px-4 py-1.5 rounded-full ${saringan === kunci ? 'bg-gray-900' : 'bg-white border border-gray-200'}`}
          >
            <Text style={tw`text-xs font-bold ${saringan === kunci ? 'text-white' : 'text-gray-600'}`}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={tw`gap-3`}>
        {tersaring.map((tagihan) => (
          <BarisTagihan key={tagihan.id} tagihan={tagihan} />
        ))}
        {tersaring.length === 0 && (
          <View style={tw`py-8 items-center`}>
            <Text style={tw`text-gray-400 text-sm`}>Tidak ada data tagihan</Text>
          </View>
        )}
      </View>
    </View>
  );
}
