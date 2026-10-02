import { useRouter } from 'expo-router';
import { CheckCircle2, ChevronRight, WifiOff } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { KartuBagian, LencanaJudul } from '@/components/molecules/KartuBagian';
import { useTunggakanPelanggan } from '@/hooks/queries/useTunggakanPelanggan';
import { DESAIN_PREMIUM } from '@/theme';

const RUTE_TUNGGAKAN = '/(app)/pelanggan/tunggakan';
/** Beranda hanya pratinjau; daftar lengkap lewat menu Tunggakan. */
const JUMLAH_PRATINJAU = 2;

/**
 * Beranda sales/kepala sales: pelanggan isolir yang perlu ditindaklanjuti
 * pembayarannya (terlama dulu) dan tautan ke layar Tunggakan. Disembunyikan
 * bila server menolak/gagal (mis. tanpa izin presurvei).
 */
export function KartuTunggakanBeranda({ isAktif }: { isAktif: boolean }) {
  const router = useRouter();
  const { data } = useTunggakanPelanggan(isAktif);
  if (!data) return null;

  const pelanggan = data.kelompok.flatMap((kelompok) => kelompok.pelanggan);
  const terlama = [...pelanggan].sort((a, b) => b.hariLewat - a.hariLewat).slice(0, JUMLAH_PRATINJAU);

  return (
    <KartuBagian
      judul="Tunggakan pelanggan"
      ikon={WifiOff}
      kanan={data.total > 0 ? <LencanaJudul teks={`${data.total} isolir`} nada="bahaya" /> : null}
    >
      {data.total === 0 ? (
        <View style={tw`flex-row items-center rounded-xl bg-emerald-50 px-3 py-3`}>
          <CheckCircle2 size={18} color="#059669" />
          <Text style={tw`text-sm text-emerald-700 ml-2`}>Tidak ada pelanggan yang menunggak.</Text>
        </View>
      ) : (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Buka tunggakan pelanggan" onPress={() => router.push(RUTE_TUNGGAKAN)}>
          {terlama.map((item, indeks) => (
            <View key={item.id} style={tw`flex-row items-center py-2.5 ${indeks < terlama.length - 1 ? 'border-b border-slate-100' : ''}`}>
              <View style={tw`flex-1 mr-2`}>
                <Text style={tw`text-sm font-semibold text-slate-900`} numberOfLines={1}>{item.nama}</Text>
                <Text style={tw`text-xs text-slate-500 mt-0.5`} numberOfLines={1}>{item.paket ?? item.idPelanggan}</Text>
              </View>
              <Text style={tw`text-xs font-semibold text-rose-600`}>{`Lewat ${item.hariLewat} hari`}</Text>
            </View>
          ))}
          <View style={tw`flex-row items-center justify-center pt-3`}>
            <Text style={tw`text-sm font-semibold text-slate-700 mr-1`}>Lihat semua & ingatkan</Text>
            <ChevronRight size={16} color={DESAIN_PREMIUM.ikonNetral} />
          </View>
        </TouchableOpacity>
      )}
    </KartuBagian>
  );
}
