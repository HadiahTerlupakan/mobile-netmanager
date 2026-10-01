import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { useAuth } from '@/context/AuthContext';
import { isTabBarDisembunyikan, type PenggunaTab, type TabPersona } from '@/utils/tabPersona';
import { TombolTabPersona } from './TombolTabPersona';

const JARAK_BAWAH_MIN = 10;

interface TabBarDaftarRuteProps extends BottomTabBarProps {
  /** Tab yang tampil (whitelist rute, urut) untuk pengguna yang sedang masuk. */
  susunTab: (user: PenggunaTab | null) => TabPersona[];
}

/**
 * Tab bar kustom berbasis daftar rute (whitelist) persona karyawan.
 * Tidak dirender di layar penuh (`tabBarStyle: {display: 'none'}`), sama seperti tab bar bawaan.
 */
export function TabBarDaftarRute({ state, descriptors, navigation, susunTab }: TabBarDaftarRuteProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const ruteFokus = state.routes[state.index];
  if (ruteFokus && isTabBarDisembunyikan(descriptors[ruteFokus.key].options)) return null;
  return (
    <View style={[tw`flex-row bg-white border-t border-gray-200 pt-2`, { paddingBottom: Math.max(insets.bottom, JARAK_BAWAH_MIN) }]}>
      {susunTab(user).map((tab) => (
        <TombolTabPersona key={tab.rute} tab={tab} state={state} descriptors={descriptors} navigation={navigation} />
      ))}
    </View>
  );
}
