import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import tw from 'twrnc';

import { NavigasiBulan } from '@/components/molecules/NavigasiBulan';
import { QueryErrorState } from '@/components/molecules/QueryErrorState';
import { SegmenPilihan } from '@/components/molecules/SegmenPilihan';
import type { LayarPenilaian } from '@/hooks/presurvei/useLayarPenilaian';
import { isAksesDitolak } from '@/utils/httpStatus';
import { teksDihitungSampai } from '@/utils/presurvei/periodePenilaian';

/** Pesan bila server menolak (403): izin penilaian belum diberikan. */
export const TEKS_PENILAIAN_BELUM_AKTIF = 'Penilaian kinerja belum diaktifkan untuk akun Anda. Hubungi admin.';

/** Pesan bila periode tidak memuat penilaian siapa pun dalam lingkup pengguna. */
export const TEKS_PENILAIAN_KOSONG = 'Belum ada data penilaian untuk periode ini.';

interface KepalaLayarPenilaianProps {
  layar: LayarPenilaian;
}

/** Keadaan kueri di bawah pemilih bulan: 403, galat, memuat, kosong, atau catatan perhitungan + tab. */
function StatusPenilaian({ layar }: KepalaLayarPenilaianProps) {
  const { kueri, hasil } = layar;
  if (isAksesDitolak(kueri.error)) return <Text style={tw`text-sm text-gray-500`}>{TEKS_PENILAIAN_BELUM_AKTIF}</Text>;
  if (!hasil && kueri.error) {
    return <QueryErrorState message="Penilaian kinerja gagal dimuat." onRetry={() => void kueri.refetch()} />;
  }
  if (!hasil) return <ActivityIndicator style={tw`my-6`} />;
  if (layar.tampilan === null) return <Text style={tw`text-sm text-gray-500 text-center`}>{TEKS_PENILAIAN_KOSONG}</Text>;
  return (
    <View>
      <Text style={tw`text-xs text-gray-500 text-center mb-3`}>{teksDihitungSampai(hasil.dihitungSampai)}</Text>
      {layar.tab !== null ? (
        <View style={tw`mb-3`}>
          <SegmenPilihan opsi={layar.opsiTab} terpilih={layar.tab} onPilih={layar.pilihTab} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Kepala setiap tab layar penilaian: pemilih bulan, keadaan kueri, catatan
 * "Dihitung sampai", dan segmen tab. Dirender sebagai ListHeaderComponent
 * supaya ikut tergulung bersama daftar.
 */
export function KepalaLayarPenilaian({ layar }: KepalaLayarPenilaianProps) {
  return (
    <View style={tw`px-4 pt-3`}>
      <NavigasiBulan label={layar.pemilih.label} isBolehMaju={layar.pemilih.isBolehMaju} onGeser={layar.pemilih.geser} />
      <StatusPenilaian layar={layar} />
    </View>
  );
}
