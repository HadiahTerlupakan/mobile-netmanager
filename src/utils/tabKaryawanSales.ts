import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';

import { AppFeature } from '@/constants/features';
import type { User } from '@/context/AuthContext';
import { bolehCanvasing, punyaFitur } from './persona';

/** Urutan tab sales karyawan. Work Order dan Barang sengaja tidak ada. */
export const RUTE_TAB_KARYAWAN_SALES = [
  'dashboard',
  'presurvei/index',
  'marketing/canvasing/index',
  'absensi',
  'profile',
] as const;

export type RuteTabSales = (typeof RUTE_TAB_KARYAWAN_SALES)[number];

/** Satu tab yang tampil; terkunci berarti tampil abu-abu dan ditolak saat ditekan. */
export interface TabSales {
  rute: RuteTabSales;
  isTerkunci: boolean;
}

type PenggunaTab = Pick<User, 'role' | 'features' | 'isSales'>;

/**
 * Keterkuncian tiap tab, atau null bila tab disembunyikan. Presurvei tampil
 * terkunci sampai izin role SALES dipasang (spec §9.3); Canvasing dan Absensi
 * mempertahankan gerbang sembunyi lama (`href` di `app/(app)/_layout.tsx`).
 */
const ATURAN_TAB: Record<RuteTabSales, (user: PenggunaTab | null) => boolean | null> = {
  dashboard: (user) => !punyaFitur(user, AppFeature.DASHBOARD),
  'presurvei/index': (user) => !punyaFitur(user, AppFeature.PRESURVEI),
  'marketing/canvasing/index': (user) => (bolehCanvasing(user) ? false : null),
  absensi: (user) => (punyaFitur(user, AppFeature.ABSENSI) ? false : null),
  profile: () => false,
};

/** Tab sales karyawan dalam urutan tampil. */
export function susunTabKaryawanSales(user: PenggunaTab | null): TabSales[] {
  return RUTE_TAB_KARYAWAN_SALES.flatMap((rute) => {
    const isTerkunci = ATURAN_TAB[rute](user);
    return isTerkunci === null ? [] : [{ rute, isTerkunci }];
  });
}

/**
 * Apakah layar meminta tab bar disembunyikan (`tabBarStyle: {display: 'none'}`).
 * Tab bar bawaan membaca opsi ini sendiri; tab bar kustom harus memeriksanya.
 */
export function isTabBarDisembunyikan(options: Pick<BottomTabNavigationOptions, 'tabBarStyle'>): boolean {
  const gaya = options.tabBarStyle as { display?: unknown } | null | undefined;
  return gaya?.display === 'none';
}
