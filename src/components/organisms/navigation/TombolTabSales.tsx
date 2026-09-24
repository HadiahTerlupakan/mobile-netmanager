import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';

import type { TabSales } from '@/utils/tabKaryawanSales';

const WARNA_AKTIF = '#2563eb';
const WARNA_PASIF = '#9ca3af';
const UKURAN_IKON = 24;

type NavigasiTab = BottomTabBarProps['navigation'];
type RuteTab = BottomTabBarProps['state']['routes'][number];

interface TombolTabSalesProps extends Pick<BottomTabBarProps, 'state' | 'descriptors' | 'navigation'> {
  tab: TabSales;
}

/**
 * Pancarkan `tabPress` agar listener layout (`handleTabPress`) bisa mencegah
 * tab terkunci atau mode cuti; pindah hanya bila tidak dicegah.
 */
function tekanTab(navigation: NavigasiTab, route: RuteTab, isFokus: boolean) {
  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
  if (!isFokus && !event.defaultPrevented) navigation.navigate(route.name, route.params);
}

/** Satu tombol tab sales; ikon diambil dari opsi `Tabs.Screen` di layout. */
export function TombolTabSales({ tab, state, descriptors, navigation }: TombolTabSalesProps) {
  const indeks = state.routes.findIndex((route) => route.name === tab.rute);
  if (indeks < 0) return null;
  const route = state.routes[indeks];
  const { options } = descriptors[route.key];
  const isFokus = state.index === indeks;
  const isSorot = isFokus && !tab.isTerkunci;
  const label = typeof options.title === 'string' ? options.title : route.name;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isFokus }}
      onPress={() => tekanTab(navigation, route, isFokus)}
      style={tw`flex-1 items-center`}
    >
      {options.tabBarIcon?.({ focused: isFokus, color: isSorot ? WARNA_AKTIF : WARNA_PASIF, size: UKURAN_IKON })}
      <Text style={tw`text-xs font-medium mt-1 ${isSorot ? 'text-blue-600' : 'text-gray-400'}`}>{label}</Text>
    </TouchableOpacity>
  );
}
