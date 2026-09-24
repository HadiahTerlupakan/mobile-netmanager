import { AppFeature } from '@/constants/features';
import type { User } from '@/context/AuthContext';

/**
 * Persona menentukan tata letak (tab bar, Beranda, menu cepat); izin tetap
 * menentukan akses. Satu-satunya definisi persona di aplikasi.
 */
export type Persona = 'KARYAWAN_SALES' | 'KARYAWAN_TEKNISI' | 'MITRA_SALES' | 'MITRA_TEKNISI';

const PERSONA_MITRA: Record<Persona, boolean> = {
  KARYAWAN_SALES: false,
  KARYAWAN_TEKNISI: false,
  MITRA_SALES: true,
  MITRA_TEKNISI: true,
};

const PERAN_SUPER_ADMIN = 'SUPER_ADMIN';

/**
 * Persona dari data login. `employeeType` kosong diperlakukan sebagai
 * karyawan, dan pengguna yang belum dimuat sebagai teknisi karyawan — sama
 * dengan cabang bawaan lama tab bar (`app/(app)/_layout.tsx` sebelum Task 17:
 * selain MITRA_SALES/MITRA_TEKNISI memakai tab bar bawaan).
 */
export function tentukanPersona(user: Pick<User, 'employeeType' | 'isSales'> | null | undefined): Persona {
  if (user?.employeeType === 'MITRA_SALES') return 'MITRA_SALES';
  if (user?.employeeType === 'MITRA_TEKNISI') return 'MITRA_TEKNISI';
  return user?.isSales === true ? 'KARYAWAN_SALES' : 'KARYAWAN_TEKNISI';
}

/** Apakah persona adalah mitra eksternal. */
export function isPersonaMitra(persona: Persona): boolean {
  return PERSONA_MITRA[persona];
}

/** Apakah pengguna memegang fitur mobile (`m_*`); SUPER_ADMIN selalu. */
export function punyaFitur(user: Pick<User, 'role' | 'features'> | null | undefined, fitur: string): boolean {
  if (!user) return false;
  if (user.role === PERAN_SUPER_ADMIN) return true;
  return user.features?.includes(fitur) ?? false;
}

/**
 * Apakah Canvasing boleh tampil: izin `m_canvasing` dan user sales sekaligus
 * (spec §3 aturan 4). Dipakai tab bar bawaan dan tab bar sales karyawan.
 */
export function bolehCanvasing(user: Pick<User, 'role' | 'features' | 'isSales'> | null | undefined): boolean {
  return punyaFitur(user, AppFeature.CANVASING) && user?.isSales === true;
}
