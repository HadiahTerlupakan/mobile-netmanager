import { AppFeature } from '@/constants/features';
import { bolehCanvasing, punyaFitur } from './persona';
import { susunTab, type AturanTab, type PenggunaTab, type TabPersona } from './tabPersona';

export { isTabBarDisembunyikan } from './tabPersona';

/** Urutan tab sales karyawan. Work Order dan Barang sengaja tidak ada. */
export const RUTE_TAB_KARYAWAN_SALES = [
  'dashboard',
  'presurvei/index',
  'marketing/canvasing/index',
  'absensi',
  'profile',
] as const;

export type RuteTabSales = (typeof RUTE_TAB_KARYAWAN_SALES)[number];

/** Satu tab sales yang tampil. */
export type TabSales = TabPersona<RuteTabSales>;

/**
 * Keterkuncian tiap tab, atau null bila tab disembunyikan. Presurvei tampil
 * terkunci sampai izin role SALES dipasang (spec §9.3); Canvasing dan Absensi
 * mempertahankan gerbang sembunyi lama (`href` di `app/(app)/_layout.tsx`).
 */
const ATURAN_TAB: Record<RuteTabSales, AturanTab> = {
  dashboard: (user) => !punyaFitur(user, AppFeature.DASHBOARD),
  'presurvei/index': (user) => !punyaFitur(user, AppFeature.PRESURVEI),
  'marketing/canvasing/index': (user) => (bolehCanvasing(user) ? false : null),
  absensi: (user) => (punyaFitur(user, AppFeature.ABSENSI) ? false : null),
  profile: () => false,
};

/** Tab sales karyawan dalam urutan tampil. */
export function susunTabKaryawanSales(user: PenggunaTab | null): TabSales[] {
  return susunTab(RUTE_TAB_KARYAWAN_SALES, ATURAN_TAB, user);
}
