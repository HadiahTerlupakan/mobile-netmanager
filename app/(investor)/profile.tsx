import { LogOut } from 'lucide-react-native';
import React from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { ScreenErrorBoundary } from '@/components/atoms/ScreenErrorBoundary';
import { useAuth } from '@/context/AuthContext';
import { useTemaPersona } from '@/theme';

const WARNA_IKON_KELUAR = '#dc2626';
const UKURAN_IKON = 20;

function BarisData({ label, nilai }: { label: string; nilai?: string | null }) {
  if (!nilai) return null;
  return (
    <View style={tw`py-3 border-b border-gray-100`}>
      <Text style={tw`text-xs text-gray-500`}>{label}</Text>
      <Text style={tw`text-base text-gray-900 mt-0.5`}>{nilai}</Text>
    </View>
  );
}

/** Avatar inisial dan nama investor dalam warna tema investor. */
function KepalaProfil({ nama }: { nama: string }) {
  const { tw: twTema } = useTemaPersona();
  return (
    <View style={tw`items-center bg-white px-4 py-6 border-b border-gray-100`}>
      <View style={twTema`w-20 h-20 rounded-full bg-utama-kuat items-center justify-center`}>
        <Text style={tw`text-3xl font-bold text-white`}>{nama.charAt(0).toUpperCase() || 'I'}</Text>
      </View>
      <Text style={tw`text-xl font-bold text-gray-900 mt-3`}>{nama}</Text>
      <Text style={twTema`text-sm font-medium text-utama-kuat mt-0.5`}>Investor</Text>
    </View>
  );
}

/** Profil investor: data akun dan tombol keluar. */
export default function ProfilInvestorScreen() {
  const { user, signOut } = useAuth();

  const konfirmasiKeluar = () => {
    Alert.alert('Keluar', 'Yakin ingin keluar dari aplikasi?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <ScreenErrorBoundary screenName="ProfilInvestor">
      <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
        <ScrollView contentContainerStyle={tw`pb-8`}>
          <KepalaProfil nama={user?.name ?? ''} />

          <View style={tw`bg-white px-4 mt-4`}>
            <BarisData label="Nama pengguna" nilai={user?.username} />
            <BarisData label="Perusahaan" nilai={user?.perusahaan} />
            <BarisData label="Nomor HP" nilai={user?.noTelp} />
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Keluar"
            onPress={konfirmasiKeluar}
            style={tw`flex-row items-center justify-center bg-white mx-4 mt-6 py-4 rounded-xl border border-red-100`}
          >
            <LogOut size={UKURAN_IKON} color={WARNA_IKON_KELUAR} />
            <Text style={tw`text-base font-semibold text-red-600 ml-2`}>Keluar</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </ScreenErrorBoundary>
  );
}
