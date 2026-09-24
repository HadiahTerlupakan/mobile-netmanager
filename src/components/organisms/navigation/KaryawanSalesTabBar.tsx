import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { useAuth } from '@/context/AuthContext';
import { isTabBarDisembunyikan, susunTabKaryawanSales } from '@/utils/tabKaryawanSales';
import { TombolTabSales } from './TombolTabSales';

const JARAK_BAWAH_MIN = 10;

/**
 * Tab bar sales karyawan: whitelist rute dalam urutan `RUTE_TAB_KARYAWAN_SALES`.
 * Tidak dirender di layar penuh (`tabBarStyle: {display: 'none'}`), sama seperti tab bar bawaan.
 */
export function KaryawanSalesTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const ruteFokus = state.routes[state.index];
  if (ruteFokus && isTabBarDisembunyikan(descriptors[ruteFokus.key].options)) return null;
  return (
    <View style={[tw`flex-row bg-white border-t border-gray-200 pt-2`, { paddingBottom: Math.max(insets.bottom, JARAK_BAWAH_MIN) }]}>
      {susunTabKaryawanSales(user).map((tab) => (
        <TombolTabSales key={tab.rute} tab={tab} state={state} descriptors={descriptors} navigation={navigation} />
      ))}
    </View>
  );
}
