import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';

import type { User } from '@/context/AuthContext';

/** Satu tab yang tampil; terkunci berarti tampil abu-abu dan ditolak saat ditekan. */
export interface TabPersona<Rute extends string = string> {
  rute: Rute;
  isTerkunci: boolean;
}

/** Data pengguna yang dibaca aturan tab. */
export type PenggunaTab = Pick<User, 'role' | 'features' | 'isSales'>;

/** Keterkuncian tab untuk pengguna, atau null bila tab disembunyikan. */
export type AturanTab = (user: PenggunaTab | null) => boolean | null;

/** Tab yang tampil dalam urutan `urutanRute`, menurut aturan tiap rute. */
export function susunTab<Rute extends string>(
  urutanRute: readonly Rute[],
  aturan: Record<Rute, AturanTab>,
  user: PenggunaTab | null,
): TabPersona<Rute>[] {
  return urutanRute.flatMap((rute) => {
    const isTerkunci = aturan[rute](user);
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
