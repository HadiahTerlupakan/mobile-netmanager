import type { User } from '@/context/AuthContext';
import { PERAN_INVESTOR } from '@/constants/investor';
import { tentukanPersona, type Persona } from '@/utils/persona';

/**
 * Pemilik tema: persona karyawan/mitra, atau investor. Investor bukan
 * `Persona` karena punya grup layar sendiri (`app/(investor)`) dan tidak
 * memakai Beranda/tab karyawan.
 */
export type PersonaTema = Persona | typeof PERAN_INVESTOR;

/**
 * Warna IDENTITAS satu persona: tombol utama, tab aktif, tautan, header aksen,
 * chip terpilih, ikon aksen, kartu sorotan. Warna MAKNA (merah galat, hijau
 * berhasil, kuning peringatan, abu netral, lencana status/predikat/jenis)
 * sengaja tidak ada di sini dan tidak ikut persona.
 */
export interface WarnaTemaPersona {
  /** Warna identitas untuk ikon, garis, indikator, border terpilih (bukan latar teks putih). */
  utama: string;
  /** Latar yang memuat teks putih dan teks/tautan aksen di atas putih; kontras ≥ 4.5:1 terhadap putih. */
  utamaKuat: string;
  /** Teks tebal di atas latar muda, keadaan ditekan. */
  utamaGelap: string;
  /** Teks judul di atas latar muda (setara 800). */
  utamaPekat: string;
  /** Ikon/indikator sekunder, spinner (setara 500). */
  utamaTerang: string;
  /** Aksen lembut di atas latar gelap (setara 400). */
  utamaLembut: string;
  /** Garis/latar dekoratif pucat (setara 300). */
  utamaPucat: string;
  /** Border lembut kartu sorotan (setara 200). */
  utamaGaris: string;
  /** Latar lencana/ikon; teks lembut di atas latar utama (setara 100). */
  utamaMuda: string;
  /** Latar kartu sorotan & chip lembut (setara 50). */
  utamaSangatMuda: string;
  /** Teks/ikon di atas `utamaKuat`. */
  teksDiAtasUtama: string;
}

/** Tema identitas aktif: persona pemiliknya dan palet warnanya. */
export interface TemaPersona {
  persona: PersonaTema;
  warna: WarnaTemaPersona;
}

const PUTIH = '#ffffff';

/** Biru — tampilan sales saat ini (tailwind blue), tidak boleh berubah. */
const WARNA_BIRU: WarnaTemaPersona = {
  utama: '#2563eb',
  utamaKuat: '#2563eb',
  utamaGelap: '#1d4ed8',
  utamaPekat: '#1e40af',
  utamaTerang: '#3b82f6',
  utamaLembut: '#60a5fa',
  utamaPucat: '#93c5fd',
  utamaGaris: '#bfdbfe',
  utamaMuda: '#dbeafe',
  utamaSangatMuda: '#eff6ff',
  teksDiAtasUtama: PUTIH,
};

/** Oranye — teknisi. Putih di atas orange-600 hanya 3.56:1, jadi latar teks memakai orange-700. */
const WARNA_ORANYE: WarnaTemaPersona = {
  utama: '#ea580c',
  utamaKuat: '#c2410c',
  utamaGelap: '#c2410c',
  utamaPekat: '#9a3412',
  utamaTerang: '#f97316',
  utamaLembut: '#fb923c',
  utamaPucat: '#fdba74',
  utamaGaris: '#fed7aa',
  utamaMuda: '#ffedd5',
  utamaSangatMuda: '#fff7ed',
  teksDiAtasUtama: PUTIH,
};

/** Hijau tosca — staff. Putih di atas teal-600 hanya 3.74:1, jadi latar teks memakai teal-700. */
const WARNA_TOSCA: WarnaTemaPersona = {
  utama: '#0d9488',
  utamaKuat: '#0f766e',
  utamaGelap: '#0f766e',
  utamaPekat: '#115e59',
  utamaTerang: '#14b8a6',
  utamaLembut: '#2dd4bf',
  utamaPucat: '#5eead4',
  utamaGaris: '#99f6e4',
  utamaMuda: '#ccfbf1',
  utamaSangatMuda: '#f0fdfa',
  teksDiAtasUtama: PUTIH,
};

/** Ungu — finance (tailwind violet). */
const WARNA_UNGU: WarnaTemaPersona = {
  utama: '#7c3aed',
  utamaKuat: '#7c3aed',
  utamaGelap: '#6d28d9',
  utamaPekat: '#5b21b6',
  utamaTerang: '#8b5cf6',
  utamaLembut: '#a78bfa',
  utamaPucat: '#c4b5fd',
  utamaGaris: '#ddd6fe',
  utamaMuda: '#ede9fe',
  utamaSangatMuda: '#f5f3ff',
  teksDiAtasUtama: PUTIH,
};

/** Indigo — direktur; berangkat dari indigo-700 agar lebih tegas. */
const WARNA_INDIGO: WarnaTemaPersona = {
  utama: '#4338ca',
  utamaKuat: '#4338ca',
  utamaGelap: '#3730a3',
  utamaPekat: '#312e81',
  utamaTerang: '#6366f1',
  utamaLembut: '#818cf8',
  utamaPucat: '#a5b4fc',
  utamaGaris: '#c7d2fe',
  utamaMuda: '#e0e7ff',
  utamaSangatMuda: '#eef2ff',
  teksDiAtasUtama: PUTIH,
};

/** Zamrud — investor; berangkat dari emerald-700 agar teks putih tetap terbaca. */
const WARNA_ZAMRUD: WarnaTemaPersona = {
  utama: '#059669',
  utamaKuat: '#047857',
  utamaGelap: '#047857',
  utamaPekat: '#065f46',
  utamaTerang: '#10b981',
  utamaLembut: '#34d399',
  utamaPucat: '#6ee7b7',
  utamaGaris: '#a7f3d0',
  utamaMuda: '#d1fae5',
  utamaSangatMuda: '#ecfdf5',
  teksDiAtasUtama: PUTIH,
};

/** Palet per persona. Mitra memakai biru yang selama ini tampil di layar mitra. */
export const PALET_PERSONA: Readonly<Record<PersonaTema, WarnaTemaPersona>> = {
  KARYAWAN_SALES: WARNA_BIRU,
  KARYAWAN_TEKNISI: WARNA_ORANYE,
  KARYAWAN_STAFF: WARNA_TOSCA,
  KARYAWAN_FINANCE: WARNA_UNGU,
  KARYAWAN_DIREKTUR: WARNA_INDIGO,
  MITRA_SALES: WARNA_BIRU,
  MITRA_TEKNISI: WARNA_BIRU,
  INVESTOR: WARNA_ZAMRUD,
};

/** Persona yang dipakai saat belum login atau bukan karyawan/mitra (pelanggan). */
export const PERSONA_TEMA_BAWAAN: Persona = 'KARYAWAN_SALES';

const PERAN_PELANGGAN = 'CUSTOMER';

/** Tema identitas untuk sebuah persona. */
export function ambilTemaPersona(persona: PersonaTema): TemaPersona {
  return { persona, warna: PALET_PERSONA[persona] };
}

/**
 * Persona yang menentukan warna. Tanpa login dan pelanggan memakai tema
 * bawaan (biru) — berbeda dari `tentukanPersona` yang menganggap pengguna
 * belum dimuat sebagai teknisi untuk tata letak.
 */
export function tentukanPersonaTema(
  user: Pick<User, 'role' | 'employeeType' | 'isSales' | 'persona'> | null | undefined,
): PersonaTema {
  if (!user || user.role === PERAN_PELANGGAN) return PERSONA_TEMA_BAWAAN;
  if (user.role === PERAN_INVESTOR) return PERAN_INVESTOR;
  return tentukanPersona(user);
}
