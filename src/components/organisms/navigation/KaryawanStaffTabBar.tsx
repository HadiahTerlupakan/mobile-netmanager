import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';

import { susunTabKaryawanStaff } from '@/utils/tabKaryawanStaff';
import { TabBarDaftarRute } from './TabBarDaftarRute';

/** Tab bar staff karyawan: whitelist rute dalam urutan `RUTE_TAB_KARYAWAN_STAFF`. */
export function KaryawanStaffTabBar(props: BottomTabBarProps) {
  return <TabBarDaftarRute {...props} susunTab={susunTabKaryawanStaff} />;
}
