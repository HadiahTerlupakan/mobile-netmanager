import { Building2, LogOut, Phone, User, type LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { LatarGradien } from '@/components/atoms/LatarGradien';
import { ScreenErrorBoundary } from '@/components/atoms/ScreenErrorBoundary';
import { DESAIN_INVESTOR } from '@/constants/investor';
import { useAuth } from '@/context/AuthContext';
import { useTemaPersona } from '@/theme';

const WARNA_IKON_KELUAR = '#dc2626';
const UKURAN_IKON = 18;

interface DataProfil {
  ikon: LucideIcon;
  label: string;
  nilai?: string | null;
}

function BarisData({ ikon: Ikon, label, nilai, isTerakhir }: DataProfil & { isTerakhir: boolean }) {
  const { tw: twTema, warna } = useTemaPersona();
  return (
    <View style={tw`flex-row items-center py-3.5 ${isTerakhir ? '' : 'border-b border-slate-100'}`}>
      <View style={twTema`w-9 h-9 rounded-lg bg-utama-sangat-muda items-center justify-center mr-3`}>
        <Ikon size={UKURAN_IKON} color={warna.utamaKuat} />
      </View>
      <View style={tw`flex-1`}>
        <Text style={tw`text-xs text-slate-500`}>{label}</Text>
        <Text style={tw`text-sm font-semibold text-slate-900 mt-0.5`}>{nilai}</Text>
      </View>
    </View>
  );
}

/** Kartu identitas investor: inisial, nama, dan perusahaan di atas latar gradien. */
function KartuIdentitas({ nama, perusahaan }: { nama: string; perusahaan?: string | null }) {
  return (
    <View style={tw`rounded-3xl overflow-hidden`}>
      <LatarGradien dari={DESAIN_INVESTOR.gradienAwal} ke={DESAIN_INVESTOR.gradienAkhir} />
      <View style={tw`flex-row items-center p-5`}>
        <View style={tw`w-16 h-16 rounded-full bg-white/15 border border-white/30 items-center justify-center`}>
          <Text style={tw`text-2xl font-bold text-white`}>{nama.charAt(0).toUpperCase() || 'I'}</Text>
        </View>
        <View style={tw`flex-1 ml-4`}>
          <Text style={tw`text-xl font-bold text-white`} numberOfLines={1}>
            {nama}
          </Text>
          <Text style={[tw`text-sm mt-0.5`, { color: DESAIN_INVESTOR.teksLembutDiAtasGelap }]} numberOfLines={1}>
            Investor{perusahaan ? ` · ${perusahaan}` : ''}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** Profil investor: data akun dan tombol keluar. */
export default function ProfilInvestorScreen() {
  const { user, signOut } = useAuth();
  const dataProfil: DataProfil[] = [
    { ikon: User, label: 'Nama pengguna', nilai: user?.username },
    { ikon: Building2, label: 'Perusahaan', nilai: user?.perusahaan },
    { ikon: Phone, label: 'Nomor HP', nilai: user?.noTelp },
  ].filter((baris) => Boolean(baris.nilai));

  const konfirmasiKeluar = () => {
    Alert.alert('Keluar', 'Yakin ingin keluar dari aplikasi?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <ScreenErrorBoundary screenName="ProfilInvestor">
      <SafeAreaView style={[tw`flex-1`, { backgroundColor: DESAIN_INVESTOR.latarLayar }]} edges={['top']}>
        <ScrollView contentContainerStyle={tw`px-4 pb-8`}>
          <Text style={tw`text-2xl font-bold text-slate-900 pt-4 pb-5`}>Profil</Text>
          <KartuIdentitas nama={user?.name ?? ''} perusahaan={user?.perusahaan} />

          {dataProfil.length > 0 ? (
            <View style={tw`bg-white rounded-2xl px-4 mt-5 border border-slate-200/70`}>
              {dataProfil.map((baris, indeks) => (
                <BarisData key={baris.label} {...baris} isTerakhir={indeks === dataProfil.length - 1} />
              ))}
            </View>
          ) : null}

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Keluar"
            onPress={konfirmasiKeluar}
            style={tw`flex-row items-center justify-center bg-white mt-6 py-4 rounded-2xl border border-red-100`}
          >
            <LogOut size={UKURAN_IKON} color={WARNA_IKON_KELUAR} />
            <Text style={tw`text-base font-semibold text-red-600 ml-2`}>Keluar</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </ScreenErrorBoundary>
  );
}
