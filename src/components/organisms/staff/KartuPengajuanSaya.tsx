import { CalendarDays, Clock, FileText, type LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { KartuBagian, LencanaJudul } from '@/components/molecules/KartuBagian';
import { LencanaStatus } from '@/components/molecules/LencanaStatus';
import { useTemaPersona } from '@/theme';
import type { BarisPengajuan } from '@/utils/berandaStaff';
import { formatDate } from '@/utils/date';

const UKURAN_IKON = 16;
const FORMAT_TANGGAL = 'd MMM yyyy';

interface AksiPengajuan {
  label: string;
  onTekan: () => void;
}

interface KartuPengajuanSayaProps {
  baris: readonly BarisPengajuan[];
  jumlahMenunggu: number;
  /** Tombol pengajuan baru (hanya yang berizin), mis. "Ajukan izin". */
  aksi: readonly AksiPengajuan[];
  onBukaBaris: (jenis: BarisPengajuan['jenis']) => void;
}

const IKON_JENIS: Readonly<Record<BarisPengajuan['jenis'], LucideIcon>> = {
  IZIN: CalendarDays,
  LEMBUR: Clock,
};

function teksTanggal(baris: BarisPengajuan): string {
  const mulai = formatDate(baris.tanggalMulai, FORMAT_TANGGAL);
  return baris.tanggalSelesai ? `${mulai} – ${formatDate(baris.tanggalSelesai, FORMAT_TANGGAL)}` : mulai;
}

/** Izin/cuti & lembur terbaru beserta statusnya, plus tombol pengajuan baru. */
export function KartuPengajuanSaya({ baris, jumlahMenunggu, aksi, onBukaBaris }: KartuPengajuanSayaProps) {
  const { tw: twTema, warna } = useTemaPersona();
  return (
    <KartuBagian
      judul="Pengajuan saya"
      ikon={FileText}
      kanan={jumlahMenunggu > 0 ? <LencanaJudul teks={`${jumlahMenunggu} menunggu`} nada="peringatan" /> : null}
    >
      {baris.length === 0 ? (
        <View style={tw`rounded-xl bg-slate-50 px-3 py-3`}>
          <Text style={tw`text-sm text-slate-600`}>Belum ada pengajuan izin atau lembur.</Text>
        </View>
      ) : (
        baris.map((item, indeks) => {
          const Ikon = IKON_JENIS[item.jenis];
          return (
            <TouchableOpacity
              key={`${item.jenis}-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${item.judul} ${item.status.label}`}
              onPress={() => onBukaBaris(item.jenis)}
              style={tw`flex-row items-center py-3 ${indeks < baris.length - 1 ? 'border-b border-slate-100' : ''}`}
            >
              <View style={twTema`w-9 h-9 rounded-lg bg-utama-sangat-muda items-center justify-center mr-3`}>
                <Ikon size={UKURAN_IKON} color={warna.utamaKuat} />
              </View>
              <View style={tw`flex-1 mr-2`}>
                <Text style={tw`text-sm font-semibold text-slate-900`}>{item.judul}</Text>
                <Text style={tw`text-xs text-slate-500 mt-0.5`}>{teksTanggal(item)}</Text>
              </View>
              <LencanaStatus status={item.status} />
            </TouchableOpacity>
          );
        })
      )}
      {aksi.length > 0 ? (
        <View style={tw`flex-row gap-2 mt-3`}>
          {aksi.map((tombol) => (
            <TouchableOpacity
              key={tombol.label}
              accessibilityRole="button"
              accessibilityLabel={tombol.label}
              onPress={tombol.onTekan}
              style={twTema`flex-1 items-center rounded-xl py-2.5 bg-utama-sangat-muda`}
            >
              <Text style={twTema`text-sm font-semibold text-utama-kuat`}>{tombol.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </KartuBagian>
  );
}
