import { CalendarHeart, Clock, LogIn, LogOut } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { KartuHeroGradien } from '@/components/molecules/KartuHeroGradien';
import { DESAIN_PREMIUM, GAYA_ANGKA_TABULAR, useTemaPersona } from '@/theme';
import type { AttendanceUiStatus } from '@/utils/attendanceStatus';
import { labelAksiAbsen, type HariLibur } from '@/utils/berandaStaff';
import { formatDate } from '@/utils/date';

const UKURAN_IKON = 14;
const JAM_KOSONG = '--:--';

interface KartuHariIniStaffProps {
  sekarang: Date;
  /** "09:00 – 17:00"; null bila jam kerja belum diatur. */
  jamKerja: string | null;
  libur: HariLibur | null;
  absen: { status: AttendanceUiStatus; checkInTime: string | null; checkOutTime: string | null } | null;
  /** null = pengguna tidak punya fitur absensi (baris absen & tombol disembunyikan). */
  onBukaAbsensi: (() => void) | null;
}

function JamAbsen({ ikon: Ikon, label, jam }: { ikon: typeof LogIn; label: string; jam: string | null }) {
  const { warna } = useTemaPersona();
  return (
    <View style={tw`flex-1`} accessible accessibilityLabel={`${label}: ${jam ?? 'belum'}`}>
      <View style={tw`flex-row items-center`}>
        <Ikon size={UKURAN_IKON} color={warna.utamaGaris} />
        <Text style={[tw`text-xs ml-1.5`, { color: warna.utamaGaris }]}>{label}</Text>
      </View>
      <Text style={[tw`text-2xl font-bold mt-0.5 ${jam ? 'text-white' : 'text-white/40'}`, GAYA_ANGKA_TABULAR]}>
        {jam ?? JAM_KOSONG}
      </Text>
    </View>
  );
}

/**
 * Kartu sorotan Beranda staff: tanggal hari ini, jam kerja atau libur, jam
 * masuk/pulang, dan satu tombol absen yang menyesuaikan status.
 */
export function KartuHariIniStaff({ sekarang, jamKerja, libur, absen, onBukaAbsensi }: KartuHariIniStaffProps) {
  const { warna } = useTemaPersona();
  return (
    <KartuHeroGradien>
      <Text style={[tw`text-xs font-semibold uppercase tracking-wider`, { color: warna.utamaGaris }]}>Hari ini</Text>
      <Text style={tw`text-xl font-bold text-white mt-1`}>{formatDate(sekarang, 'EEEE, d MMMM yyyy')}</Text>
      {libur ? (
        <View style={tw`flex-row items-center mt-2`}>
          <CalendarHeart size={UKURAN_IKON} color={DESAIN_PREMIUM.aksenEmas} />
          <Text style={[tw`text-sm font-semibold ml-1.5`, { color: DESAIN_PREMIUM.aksenEmas }]}>{`Libur: ${libur.name}`}</Text>
        </View>
      ) : jamKerja ? (
        <View style={tw`flex-row items-center mt-2`}>
          <Clock size={UKURAN_IKON} color={warna.utamaGaris} />
          <Text style={[tw`text-sm ml-1.5`, { color: warna.utamaGaris }]}>{`Jam kerja ${jamKerja}`}</Text>
        </View>
      ) : null}

      {onBukaAbsensi ? (
        <>
          <View style={[tw`flex-row mt-5 pt-4 border-t`, { borderColor: DESAIN_PREMIUM.garisDiAtasGelap }]}>
            <JamAbsen ikon={LogIn} label="Masuk" jam={absen?.checkInTime ?? null} />
            <JamAbsen ikon={LogOut} label="Pulang" jam={absen?.checkOutTime ?? null} />
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={labelAksiAbsen(absen?.status)}
            onPress={onBukaAbsensi}
            activeOpacity={0.85}
            style={tw`items-center bg-white rounded-xl py-3.5 mt-5`}
          >
            <Text style={[tw`font-bold`, { color: warna.utamaKuat }]}>{labelAksiAbsen(absen?.status)}</Text>
          </TouchableOpacity>
        </>
      ) : null}
    </KartuHeroGradien>
  );
}
