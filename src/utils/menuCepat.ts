import { MENU_BUKAN_UNTUK_MITRA, MENU_ITEMS, type IdMenuCepat, type MenuItem } from '@/constants/menuCepat';

const PERAN_SUPER_ADMIN = 'SUPER_ADMIN';

/** Masukan penyusun tile menu cepat. */
export interface KonteksMenuCepat {
  features: readonly string[];
  role?: string;
  isMitra: boolean;
  menuIds?: readonly IdMenuCepat[];
  isSembunyikanTerkunci: boolean;
  /** Tile yang disembunyikan karena data server (mis. Pengesahan tanpa surat). */
  idTersembunyi: readonly IdMenuCepat[];
}

/** Tile siap tampil beserta status aktifnya. */
export type TileMenuCepatTersusun = MenuItem & { enabled: boolean };

/** Apakah pengguna berizin membuka menu; SUPER_ADMIN & mitra (menu tetap) selalu boleh. */
export function isMenuBerizin(requiredFeatures: readonly string[], konteks: KonteksMenuCepat): boolean {
  if (konteks.role === PERAN_SUPER_ADMIN || konteks.isMitra) return true;
  if (requiredFeatures.length === 0) return true;
  return requiredFeatures.some((fitur) => konteks.features.includes(fitur));
}

/** Apakah tile masuk daftar persona ini (mitra, `menuIds`, dan penyembunyian dinamis). */
function isMenuTermasuk(item: MenuItem, konteks: KonteksMenuCepat): boolean {
  if (konteks.idTersembunyi.includes(item.id)) return false;
  if (konteks.isMitra && (item.internalOnly || MENU_BUKAN_UNTUK_MITRA.includes(item.id))) return false;
  return konteks.menuIds === undefined || konteks.menuIds.includes(item.id);
}

/** Susun tile menu cepat: saring, urutkan sesuai `menuIds`, tandai berizin, buang yang terkunci bila diminta. */
export function susunMenuCepat(konteks: KonteksMenuCepat): TileMenuCepatTersusun[] {
  const { menuIds } = konteks;
  return MENU_ITEMS.filter((item) => isMenuTermasuk(item, konteks))
    // Urutan tile mengikuti menuIds bila diberikan (menu terpenting persona di depan).
    .sort((a, b) => (menuIds ? menuIds.indexOf(a.id) - menuIds.indexOf(b.id) : 0))
    .map((item) => ({ ...item, enabled: isMenuBerizin(item.requiredFeatures, konteks) }))
    .filter((item) => item.enabled || !(item.hideWhenLocked || konteks.isSembunyikanTerkunci));
}
