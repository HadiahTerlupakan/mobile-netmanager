import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { CheckCircle, Receipt, Router, XCircle, type LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import type { TagihanPelanggan } from '@/types/portalPelanggan';
import { formatRupiah } from '@/utils/rupiah';
import { isTagihanDibatalkan, isTagihanTerutang, labelStatusTagihan, statusTampilTagihan } from '@/utils/statusTagihanPelanggan';
import { keteranganPembayaranRiwayat } from '@/utils/tagihan/keteranganPembayaranRiwayat';

dayjs.locale('id');

const UKURAN_IKON = 20;
const STATUS_DIBAYAR_SEBAGIAN = 'PARTIAL_PAID';

interface GayaStatus {
  ikon: LucideIcon;
  warnaIkon: string;
  latar: string;
  teksLencana: string;
}

const GAYA_LUNAS: GayaStatus = { ikon: CheckCircle, warnaIkon: 'text-teal-600', latar: 'bg-teal-100', teksLencana: 'text-teal-700' };
const GAYA_TERUTANG: GayaStatus = { ikon: Router, warnaIkon: 'text-orange-500', latar: 'bg-orange-100', teksLencana: 'text-orange-700' };
const GAYA_BATAL: GayaStatus = { ikon: XCircle, warnaIkon: 'text-red-500', latar: 'bg-red-100', teksLencana: 'text-red-700' };
const GAYA_LAIN: GayaStatus = { ikon: Receipt, warnaIkon: 'text-gray-500', latar: 'bg-gray-100', teksLencana: 'text-gray-700' };

function gayaStatus(status: string): GayaStatus {
  if (status === 'PAID') return GAYA_LUNAS;
  if (isTagihanTerutang(status)) return GAYA_TERUTANG;
  return isTagihanDibatalkan(status) ? GAYA_BATAL : GAYA_LAIN;
}

/** Sisa tagihan yang dibayar sebagian, atau kapan dan dengan apa tagihan dibayar. */
function keteranganTambahan(tagihan: TagihanPelanggan, status: string): string | null {
  if (status === STATUS_DIBAYAR_SEBAGIAN) return `Sisa ${formatRupiah(tagihan.remainingAmount)}`;
  return status === 'PAID' ? keteranganPembayaranRiwayat(tagihan.lastPayment) : null;
}

interface BarisRiwayatTagihanProps {
  tagihan: TagihanPelanggan;
}

/** Satu tagihan di Riwayat; hanya untuk dibaca, jadi tidak tampil sebagai tombol. */
export function BarisRiwayatTagihan({ tagihan }: BarisRiwayatTagihanProps) {
  const status = statusTampilTagihan(tagihan);
  const gaya = gayaStatus(status);
  const Ikon = gaya.ikon;
  const keterangan = keteranganTambahan(tagihan, status);
  return (
    <View style={tw`bg-white px-4 py-4 flex-row items-center border-b border-gray-100`}>
      <View style={tw`w-10 h-10 rounded-lg ${gaya.latar} items-center justify-center mr-3`}>
        <Ikon size={UKURAN_IKON} style={tw`${gaya.warnaIkon}`} />
      </View>
      <View style={tw`flex-1`}>
        <Text style={tw`text-sm font-bold text-gray-900 mb-0.5`}>{tagihan.items[0]?.description || 'Tagihan Layanan'}</Text>
        <Text style={tw`text-xs text-gray-500`}>{`#${tagihan.invoiceNumber} • ${dayjs(tagihan.issueDate).format('D MMM HH:mm')}`}</Text>
        {keterangan && <Text style={tw`text-xs text-gray-600 mt-0.5`}>{keterangan}</Text>}
      </View>
      <View style={tw`items-end`}>
        <Text style={tw`text-sm font-bold text-gray-900 mb-1`}>{formatRupiah(tagihan.totalAmount)}</Text>
        <View style={tw`px-2 py-0.5 rounded ${gaya.latar}`}>
          <Text style={tw`text-[10px] font-bold ${gaya.teksLencana}`}>{labelStatusTagihan(status)}</Text>
        </View>
      </View>
    </View>
  );
}
