import { AppFeature } from '@/constants/features';
import type { User } from '@/context/AuthContext';

/**
 * Persona menentukan tata letak (tab bar, Beranda, menu cepat); izin tetap
 * menentukan akses. Satu-satunya definisi persona di aplikasi.
 */
export type Persona =
  | 'KARYAWAN_STAFF'
  | 'KARYAWAN_TEKNISI'
  | 'KARYAWAN_SALES'
  | 'KARYAWAN_FINANCE'
  | 'KARYAWAN_DIREKTUR'
  | 'MITRA_SALES'
  | 'MITRA_TEKNISI';

/** Persona karyawan seperti dikirim server (`user.persona`, dari `Role.persona` di netmanager). */
export type PersonaKaryawanServer = 'STAFF' | 'TEKNISI' | 'SALES' | 'FINANCE' | 'DIREKTUR';

const PERSONA_DARI_SERVER: Record<PersonaKaryawanServer, Persona> = {
  STAFF: 'KARYAWAN_STAFF',
  TEKNISI: 'KARYAWAN_TEKNISI',
  SALES: 'KARYAWAN_SALES',
  FINANCE: 'KARYAWAN_FINANCE',
  DIREKTUR: 'KARYAWAN_DIREKTUR',
};

const PERSONA_MITRA: Record<Persona, boolean> = {
  KARYAWAN_STAFF: false,
  KARYAWAN_TEKNISI: false,
  KARYAWAN_SALES: false,
  KARYAWAN_FINANCE: false,
  KARYAWAN_DIREKTUR: false,
  MITRA_SALES: true,
  MITRA_TEKNISI: true,
};

const PERAN_SUPER_ADMIN = 'SUPER_ADMIN';

/** Apakah nilai adalah persona karyawan yang dikenal versi aplikasi ini. */
function isPersonaKaryawanServer(nilai: unknown): nilai is PersonaKaryawanServer {
  return typeof nilai === 'string' && Object.prototype.hasOwnProperty.call(PERSONA_DARI_SERVER, nilai);
}

/**
 * Persona dari data login. Mitra dibaca dari `employeeType` (server tidak
 * mengirim `persona` untuk mitra). Karyawan memakai `persona` dari server;
 * server/cache lama tanpa `persona` — atau nilai yang belum dikenal aplikasi
 * ini — jatuh ke aturan lama: `isSales` → sales, selain itu teknisi.
 * Pengguna yang belum dimuat diperlakukan sebagai teknisi karyawan (perilaku lama).
 */
export function tentukanPersona(user: Pick<User, 'employeeType' | 'isSales' | 'persona'> | null | undefined): Persona {
  if (user?.employeeType === 'MITRA_SALES') return 'MITRA_SALES';
  if (user?.employeeType === 'MITRA_TEKNISI') return 'MITRA_TEKNISI';
  if (isPersonaKaryawanServer(user?.persona)) return PERSONA_DARI_SERVER[user.persona];
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
 * Apakah Canvasing boleh tampil: cukup izin `m_canvasing` dari role. Teknisi
 * yang role-nya diberi izin ini ikut canvasing tanpa berubah persona menjadi
 * sales. Dipakai tab bar bawaan dan tab bar sales karyawan.
 */
export function bolehCanvasing(user: Pick<User, 'role' | 'features'> | null | undefined): boolean {
  return punyaFitur(user, AppFeature.CANVASING);
}
