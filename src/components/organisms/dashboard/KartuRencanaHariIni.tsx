import { CalendarCheck, ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTemaPersona } from '@/theme';

import { LABEL_JENIS_KEGIATAN } from '@/constants/presurvei';
import type { Rencana } from '@/types/presurvei';
import { JUMLAH_RENCANA_BERIKUTNYA, rekapRencanaHariIni } from '@/utils/presurvei/rencana';

const WARNA_ABU = '#9ca3af';

interface KartuRencanaHariIniProps {
  rencanaHariIni: readonly Rencana[];
  jumlahTerlewat: number;
  onBuka: (id: string) => void;
  onBuat: () => void;
}

/** Rencana kunjungan hari ini di Beranda: selesai vs belum, tiga berikutnya, dan jumlah terlewat. */
export function KartuRencanaHariIni({ rencanaHariIni, jumlahTerlewat, onBuka, onBuat }: KartuRencanaHariIniProps) {
  const { tw } = useTemaPersona();
  const rekap = rekapRencanaHariIni(rencanaHariIni);
  const berikutnya = rekap.tertunda.slice(0, JUMLAH_RENCANA_BERIKUTNYA);
  return (
    <View style={tw`bg-white rounded-2xl p-4 mb-4 border border-gray-100 shadow-sm`}>
      <View style={tw`flex-row items-center justify-between mb-2`}>
        <View style={tw`flex-row items-center`}>
          <CalendarCheck size={18} color="#111827" />
          <Text style={tw`font-bold text-gray-900 ml-2`}>Rencana hari ini</Text>
        </View>
        {jumlahTerlewat > 0 ? (
          <View style={tw`bg-rose-50 rounded-full px-2.5 py-1`}>
            <Text style={tw`text-[11px] font-semibold text-rose-600`}>{`Terlewat: ${jumlahTerlewat}`}</Text>
          </View>
        ) : null}
      </View>
      {rekap.jumlah === 0 ? (
        <View style={tw`flex-row items-center justify-between rounded-xl bg-gray-50 px-3 py-3 mt-1`}>
          <Text style={tw`text-sm text-gray-600`}>Belum ada rencana hari ini</Text>
          <TouchableOpacity accessibilityRole="button" onPress={onBuat}>
            <Text style={tw`text-sm font-semibold text-utama-kuat`}>Buat Rencana</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={tw`text-sm text-gray-600 mb-1`}>
          {`${rekap.selesai} dari ${rekap.jumlah} selesai · ${rekap.tertunda.length} belum dikunjungi`}
        </Text>
      )}
      {berikutnya.map((rencana, indeks) => (
        <TouchableOpacity
          key={rencana.id}
          accessibilityRole="button"
          onPress={() => onBuka(rencana.id)}
          style={tw`flex-row items-center py-3 ${indeks < berikutnya.length - 1 ? 'border-b border-gray-100' : ''}`}
        >
          <View style={tw`flex-1`}>
            <Text style={tw`text-sm font-semibold text-gray-900`} numberOfLines={1}>{rencana.tujuan}</Text>
            <Text style={tw`text-xs text-gray-500 mt-0.5`} numberOfLines={1}>
              {[rencana.jam, LABEL_JENIS_KEGIATAN[rencana.jenis], rencana.namaProspek]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
          <ChevronRight size={18} color={WARNA_ABU} />
        </TouchableOpacity>
      ))}
    </View>
  );
}
