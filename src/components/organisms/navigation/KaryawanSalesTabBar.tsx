import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';

import { susunTabKaryawanSales } from '@/utils/tabKaryawanSales';
import { TabBarDaftarRute } from './TabBarDaftarRute';

/** Tab bar sales karyawan: whitelist rute dalam urutan `RUTE_TAB_KARYAWAN_SALES`. */
export function KaryawanSalesTabBar(props: BottomTabBarProps) {
  return <TabBarDaftarRute {...props} susunTab={susunTabKaryawanSales} />;
}
