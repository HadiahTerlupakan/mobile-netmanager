import { Image } from 'expo-image';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import NotificationBell from '@/components/molecules/NotificationBell';
import { useTemaPersona } from '@/theme';
import { urlGambarTenant } from '@/utils/urlGambarTenant';
import { sumberGambarUpload } from '@/utils/sumberGambarUpload';

const JAM_SIANG = 11;
const JAM_SORE = 15;
const JAM_MALAM = 18;
const WARNA_LONCENG = '#334155';

/** Sapaan menurut jam perangkat. */
export function sapaanMenurutJam(jam: number): string {
  if (jam < JAM_SIANG) return 'Selamat pagi';
  if (jam < JAM_SORE) return 'Selamat siang';
  if (jam < JAM_MALAM) return 'Selamat sore';
  return 'Selamat malam';
}

interface KepalaSapaanProps {
  nama: string;
  gambar?: string | null;
  onTekanProfil: () => void;
  /** Tampilkan lonceng notifikasi karyawan. */
  isLonceng?: boolean;
}

/** Kepala Beranda premium: sapaan & nama di kiri, lonceng dan avatar di kanan. */
export function KepalaSapaan({ nama, gambar, onTekanProfil, isLonceng = false }: KepalaSapaanProps) {
  const { tw: twTema } = useTemaPersona();
  const urlFoto = urlGambarTenant(gambar);
  return (
    <View style={tw`flex-row items-center px-4 pt-4 pb-5`}>
      <View style={tw`flex-1`}>
        <Text style={tw`text-sm text-slate-500`}>{`${sapaanMenurutJam(new Date().getHours())},`}</Text>
        <Text style={tw`text-2xl font-bold text-slate-900`} numberOfLines={1}>
          {nama}
        </Text>
      </View>
      {isLonceng ? (
        <View style={tw`mr-3`}>
          <NotificationBell color={WARNA_LONCENG} />
        </View>
      ) : null}
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Buka profil" onPress={onTekanProfil}>
        {urlFoto ? (
          <Image source={sumberGambarUpload(urlFoto)} style={tw`w-11 h-11 rounded-full`} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={twTema`w-11 h-11 rounded-full bg-utama-kuat items-center justify-center`}>
            <Text style={tw`text-base font-bold text-white`}>{nama.charAt(0).toUpperCase() || 'K'}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}
