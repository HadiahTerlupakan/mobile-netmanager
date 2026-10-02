import { Tabs } from 'expo-router';
import { Briefcase, Home, User, Wallet } from 'lucide-react-native';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTemaPersona } from '@/theme';

const WARNA_TAB_PASIF = '#9ca3af';
const UKURAN_IKON = 24;
const TINGGI_TAB = 60;
const JARAK_BAWAH_MIN = 10;

/** Tab bar akun investor: Beranda · Proyek · Uang · Profil. Rincian proyek layar penuh tanpa tab. */
export default function InvestorLayout() {
  const insets = useSafeAreaInsets();
  const { tw, warna } = useTemaPersona();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          ...tw`bg-white border-t border-gray-200`,
          height: TINGGI_TAB + insets.bottom,
          paddingBottom: Math.max(insets.bottom, JARAK_BAWAH_MIN),
          paddingTop: JARAK_BAWAH_MIN,
        },
        tabBarActiveTintColor: warna.utamaKuat,
        tabBarInactiveTintColor: WARNA_TAB_PASIF,
        tabBarLabelStyle: tw`text-xs font-medium mb-1`,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Beranda', tabBarIcon: ({ color }) => <Home size={UKURAN_IKON} color={color} /> }}
      />
      <Tabs.Screen
        name="proyek/index"
        options={{ title: 'Proyek', tabBarIcon: ({ color }) => <Briefcase size={UKURAN_IKON} color={color} /> }}
      />
      <Tabs.Screen
        name="keuangan"
        options={{ title: 'Uang', tabBarIcon: ({ color }) => <Wallet size={UKURAN_IKON} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profil', tabBarIcon: ({ color }) => <User size={UKURAN_IKON} color={color} /> }}
      />
      <Tabs.Screen name="proyek/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  );
}
