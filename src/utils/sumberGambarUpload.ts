import { TenantService } from '@/services/TenantService';
import { TokenService } from '@/services/TokenService';

/**
 * Sumber gambar untuk file yang disajikan server tenant di `/uploads/`.
 *
 * Server menolak jalur itu tanpa sesi, dan aplikasi tidak pernah memegang
 * cookie — sesinya berupa Bearer token. Tanpa header ini setiap foto yang
 * diunggah dari aplikasi (KTP canvasing, laporan penyelesaian WO, lampiran
 * izin) balas 401 saat hendak ditampilkan kembali.
 *
 * Token hanya ditempelkan untuk host tenant itu sendiri: URL publik seperti
 * bucket R2 atau avatar pihak ketiga tidak boleh ikut membawanya.
 */
export interface SumberGambar {
  uri: string;
  headers?: Record<string, string>;
}

export function sumberGambarUpload(uri: string): SumberGambar {
  if (!butuhToken(uri)) return { uri };

  const token = TokenService.getToken();
  if (!token) return { uri };

  return { uri, headers: { Authorization: `Bearer ${token}` } };
}

/** Apakah URI menunjuk file upload privat di server tenant. */
function butuhToken(uri: string): boolean {
  const dasar = TenantService.getTenantUrl().replace(/\/$/, '');
  if (!dasar || !uri.startsWith(`${dasar}/`)) return false;

  return uri.slice(dasar.length).startsWith('/uploads/');
}
