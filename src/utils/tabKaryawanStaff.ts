import { AppFeature } from '@/constants/features';
import { punyaFitur } from './persona';
import { susunTab, type AturanTab, type PenggunaTab, type TabPersona } from './tabPersona';

/**
 * Urutan tab staff karyawan: Beranda · Absensi · Chat · Profil. Staff bukan
 * teknisi — Work Order, Barang, Canvasing, dan Presurvei sengaja tidak ada.
 * Dipakai juga oleh Finance & Direktur selama tampilan mereka belum dibuat.
 */
export const RUTE_TAB_KARYAWAN_STAFF = ['dashboard', 'absensi', 'chat/index', 'profile'] as const;

export type RuteTabStaff = (typeof RUTE_TAB_KARYAWAN_STAFF)[number];

/** Keterkuncian tiap tab staff, atau null bila disembunyikan (Absensi & Chat hanya bila berizin). */
const ATURAN_TAB: Record<RuteTabStaff, AturanTab> = {
  dashboard: (user) => !punyaFitur(user, AppFeature.DASHBOARD),
  absensi: (user) => (punyaFitur(user, AppFeature.ABSENSI) ? false : null),
  'chat/index': (user) => (punyaFitur(user, AppFeature.CHAT) ? false : null),
  profile: () => false,
};

/** Tab staff karyawan dalam urutan tampil. */
export function susunTabKaryawanStaff(user: PenggunaTab | null): TabPersona<RuteTabStaff>[] {
  return susunTab(RUTE_TAB_KARYAWAN_STAFF, ATURAN_TAB, user);
}
