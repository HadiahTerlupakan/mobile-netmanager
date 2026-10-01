import { ChevronRight, Users } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useTemaPersona } from '@/theme';

import { AvatarAnggota } from '@/components/organisms/presurvei/AvatarAnggota';
import {
  anggotaPerluPerhatian,
  persenSelesai,
  ringkasTimHariIni,
  type BarisTimHariIni,
} from '@/utils/presurvei/timRencana';

const UKURAN_IKON_JUDUL = 18;
const UKURAN_IKON_BARIS = 18;
const WARNA_JUDUL = '#111827';
const WARNA_ABU = '#9ca3af';

interface KartuTimHariIniProps {
  /** undefined selama memuat, atau gagal tanpa cache. */
  baris: readonly BarisTimHariIni[] | undefined;
  isGagal: boolean;
  onCobaLagi: () => void;
  /** Buka tampilan Tim; `salesId` null = semua anggota. */
  onBuka: (salesId: string | null) => void;
}

/** Bilah progres selesai (hijau) dengan lebar persen 0–100. */
function BilahProgres({ persen, tinggi }: { persen: number; tinggi: 'h-1.5' | 'h-2' }) {
  const { tw } = useTemaPersona();
  return (
    <View style={tw`flex-1 ${tinggi} bg-gray-100 rounded-full overflow-hidden mr-2`}>
      <View style={[tw`${tinggi} bg-emerald-500 rounded-full`, { width: `${persen}%` }]} />
    </View>
  );
}

/** Ringkasan seluruh tim: selesai/total, persen, bilah progres, dan pil total terlewat. */
function RingkasanTimBaris({ baris }: { baris: readonly BarisTimHariIni[] }) {
  const { tw } = useTemaPersona();
  const ringkasan = ringkasTimHariIni(baris);
  return (
    <View style={tw`rounded-xl bg-gray-50 px-3 py-2.5 mt-1 mb-1`}>
      <View style={tw`flex-row items-center justify-between`}>
        <Text style={tw`text-sm font-semibold text-gray-800`}>
          {`Tim: ${ringkasan.selesai}/${ringkasan.total} selesai · ${ringkasan.persen}%`}
        </Text>
        {ringkasan.terlewat > 0 ? (
          <View style={tw`bg-rose-50 rounded-full px-2.5 py-1`}>
            <Text style={tw`text-[11px] font-semibold text-rose-600`}>{`${ringkasan.terlewat} terlewat`}</Text>
          </View>
        ) : null}
      </View>
      <View style={tw`flex-row items-center mt-2`}>
        <BilahProgres persen={ringkasan.persen} tinggi="h-2" />
      </View>
    </View>
  );
}

/** Satu anggota tim: nama, selesai/total hari ini, dan lencana terlewat bila ada. */
function BarisAnggota({ baris, isTerakhir, onBuka }: { baris: BarisTimHariIni; isTerakhir: boolean; onBuka: () => void }) {
  const { tw } = useTemaPersona();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Rencana ${baris.namaSales}`}
      onPress={onBuka}
      style={tw`flex-row items-center py-3 ${isTerakhir ? '' : 'border-b border-gray-100'}`}
    >
      <AvatarAnggota nama={baris.namaSales} />
      <View style={tw`flex-1 mr-2`}>
        <Text style={tw`text-sm font-semibold text-gray-900`} numberOfLines={1}>{baris.namaSales}</Text>
        <View style={tw`flex-row items-center mt-1`}>
          <BilahProgres persen={persenSelesai(baris.selesai, baris.total)} tinggi="h-1.5" />
          <Text style={tw`text-xs text-gray-500`}>{`${baris.selesai}/${baris.total} selesai`}</Text>
        </View>
      </View>
      {baris.terlewat > 0 ? (
        <View style={tw`bg-rose-50 rounded-full px-2.5 py-1 mr-2`}>
          <Text style={tw`text-[11px] font-semibold text-rose-600`}>{`Terlewat: ${baris.terlewat}`}</Text>
        </View>
      ) : null}
      <ChevronRight size={UKURAN_IKON_BARIS} color={WARNA_ABU} />
    </TouchableOpacity>
  );
}

/**
 * Pantauan tim di Beranda pemberi tugas: ringkasan seluruh tim, lalu hanya
 * anggota yang paling perlu perhatian (`anggotaPerluPerhatian`) supaya kartu
 * tetap pendek untuk tim besar. Ketuk baris membuka tampilan Tim anggota itu;
 * "Lihat semua" membuka seluruh tim.
 */
export function KartuTimHariIni({ baris, isGagal, onCobaLagi, onBuka }: KartuTimHariIniProps) {
  const { tw } = useTemaPersona();
  const renderIsi = () => {
    if (baris === undefined) {
      if (!isGagal) return <ActivityIndicator style={tw`my-2`} />;
      return (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Muat ulang rencana tim" onPress={onCobaLagi}>
          <Text style={tw`text-sm text-red-700`}>Rencana tim gagal dimuat. Ketuk untuk coba lagi.</Text>
        </TouchableOpacity>
      );
    }
    const isAdaHariIni = baris.some((item) => item.total > 0);
    const perluPerhatian = anggotaPerluPerhatian(baris);
    return (
      <View>
        {isAdaHariIni ? (
          <RingkasanTimBaris baris={baris} />
        ) : (
          <View style={tw`rounded-xl bg-gray-50 px-3 py-3 mt-1`}>
            <Text style={tw`text-sm text-gray-600`}>Belum ada rencana tim hari ini</Text>
          </View>
        )}
        {perluPerhatian.map((item, indeks) => (
          <BarisAnggota
            key={item.salesId}
            baris={item}
            isTerakhir={indeks === perluPerhatian.length - 1}
            onBuka={() => onBuka(item.salesId)}
          />
        ))}
      </View>
    );
  };

  const labelLihatSemua = baris && baris.length > 0 ? `Lihat semua (${baris.length} anggota)` : 'Lihat tim';
  return (
    <View style={tw`bg-white rounded-2xl p-4 mb-4 border border-gray-100 shadow-sm`}>
      <View style={tw`flex-row items-center mb-2`}>
        <Users size={UKURAN_IKON_JUDUL} color={WARNA_JUDUL} />
        <Text style={tw`font-bold text-gray-900 ml-2`}>Tim hari ini</Text>
      </View>
      {renderIsi()}
      <TouchableOpacity accessibilityRole="button" onPress={() => onBuka(null)} style={tw`pt-3 items-center`}>
        <Text style={tw`text-sm font-semibold text-utama-kuat`}>{labelLihatSemua}</Text>
      </TouchableOpacity>
    </View>
  );
}
