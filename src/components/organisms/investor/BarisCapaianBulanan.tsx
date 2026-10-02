import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import { GAYA_ANGKA_TABULAR, useTemaPersona } from '@/theme';
import type { CapaianBulananProyek } from '@/types/investor';
import { formatRupiah } from '@/utils/investor';

function BarisNominal({ label, nilai, isTebal = false }: { label: string; nilai: string; isTebal?: boolean }) {
  return (
    <View style={tw`flex-row justify-between py-1`}>
      <Text style={tw`text-sm ${isTebal ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>{label}</Text>
      <Text style={[tw`text-sm ${isTebal ? 'font-bold text-slate-900' : 'text-slate-900'}`, GAYA_ANGKA_TABULAR]}>{nilai}</Text>
    </View>
  );
}

/**
 * Laporan satu bulan proyek bergaya rekening: pendapatan & biaya proyek di
 * atas, bagian investor (bagi hasil + modal kembali) di bawah garis.
 */
export function BarisCapaianBulanan({ judul, capaian }: { judul: string; capaian: CapaianBulananProyek }) {
  const { tw: twTema } = useTemaPersona();
  const totalSaya = capaian.myProfitShare + capaian.myCapitalReturn;
  return (
    <View style={tw`bg-white rounded-2xl p-4 border border-slate-200/70 mb-3`}>
      <View style={tw`flex-row items-center justify-between mb-2`}>
        <Text style={tw`text-sm font-bold text-slate-900`}>{judul}</Text>
        <View style={twTema`rounded-full px-2.5 py-1 bg-utama-sangat-muda`}>
          <Text style={[twTema`text-xs font-bold text-utama-kuat`, GAYA_ANGKA_TABULAR]}>+{formatRupiah(totalSaya)}</Text>
        </View>
      </View>
      <BarisNominal label="Pendapatan proyek" nilai={formatRupiah(capaian.achievedRevenue)} />
      <BarisNominal label="Biaya operasional" nilai={`− ${formatRupiah(capaian.opexUsed)}`} />
      <View style={tw`border-t border-dashed border-slate-200 my-2`} />
      <BarisNominal label="Bagi hasil saya" nilai={formatRupiah(capaian.myProfitShare)} />
      <BarisNominal label="Modal kembali" nilai={formatRupiah(capaian.myCapitalReturn)} />
      <BarisNominal label="Total untuk saya" nilai={formatRupiah(totalSaya)} isTebal />
    </View>
  );
}
