/**
 * Riwayat pengajuan work order milik pengguna sendiri.
 *
 * Sebelum ini Request WO adalah jalur buntu: teknisi mengirim pengajuan lalu
 * tidak punya satu pun tempat untuk melihat apakah disetujui, ditolak, atau
 * belum disentuh — pengajuan tidak muncul di tab Tersedia, Aktif, maupun
 * Riwayat, dan endpoint-nya memang hanya punya POST.
 *
 * Diletakkan di layar Request WO, bukan sebagai tab keempat, mengikuti pola
 * yang sudah dipakai Izin & Cuti, Lembur, dan Canvasing: riwayat tinggal di
 * layar fiturnya sendiri.
 */

import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import tw from 'twrnc';

import { useApiQuery } from '@/hooks/queries';
import {
  labelNasibPengajuan,
  nasibPengajuan,
  type NasibPengajuan,
} from '@/utils/statusPengajuanWo';

interface PengajuanItem {
  id: string;
  workOrderNumber: string;
  title: string;
  status: string;
  rejectionReason?: string | null;
  createdAt: string;
}

const GAYA_NASIB: Record<NasibPengajuan, string> = {
  menunggu: 'bg-amber-50 text-amber-700',
  disetujui: 'bg-green-50 text-green-700',
  ditolak: 'bg-red-50 text-red-700',
  dibatalkan: 'bg-gray-100 text-gray-600',
};

function tanggalSingkat(iso: string): string {
  const tanggal = new Date(iso);
  if (Number.isNaN(tanggal.getTime())) return '';
  return tanggal.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function RiwayatPengajuanWo() {
  const { data, isPending } = useApiQuery<PengajuanItem[]>({
    queryKey: ['work_order_requests_mine'],
    endpoint: '/api/mobile/work-orders/request',
    select: (res: any) => res?.data ?? [],
  });

  if (isPending) {
    return (
      <View style={tw`py-6 items-center`}>
        <ActivityIndicator color="#0284c7" />
      </View>
    );
  }

  const pengajuan = data ?? [];

  if (pengajuan.length === 0) {
    return (
      <Text style={tw`text-center text-sm text-slate-400 py-6`}>
        Belum ada pengajuan.
      </Text>
    );
  }

  return (
    <View style={tw`gap-3`}>
      {pengajuan.map((item) => {
        const nasib = nasibPengajuan(item);
        return (
          <View
            key={item.id}
            style={tw`bg-white border border-slate-200 rounded-xl p-3`}
          >
            <View style={tw`flex-row items-start justify-between gap-2`}>
              <View style={tw`flex-1`}>
                <Text style={tw`text-xs text-slate-400 font-mono`}>
                  {item.workOrderNumber}
                </Text>
                <Text style={tw`font-semibold text-slate-900`}>
                  {item.title}
                </Text>
              </View>
              <View style={tw`px-2 py-1 rounded-md ${GAYA_NASIB[nasib]}`}>
                <Text style={tw`text-[10px] font-bold ${GAYA_NASIB[nasib]}`}>
                  {labelNasibPengajuan(nasib)}
                </Text>
              </View>
            </View>

            {/* Alasan penolakan adalah satu-satunya hal yang bisa ditindaklanjuti
                pengaju; menyembunyikannya membuat penolakan terasa sewenang-wenang. */}
            {nasib === 'ditolak' && !!item.rejectionReason && (
              <Text style={tw`text-xs text-red-600 mt-2`}>
                {item.rejectionReason}
              </Text>
            )}

            <Text style={tw`text-xs text-slate-400 mt-2`}>
              Diajukan {tanggalSingkat(item.createdAt)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default RiwayatPengajuanWo;
