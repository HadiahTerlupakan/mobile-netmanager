import { TenantService } from '@/services/TenantService';

/**
 * URL lengkap gambar (foto profil, dsb.): URL absolut dipakai apa adanya,
 * jalur relatif ("uploads/a.jpg" atau "/uploads/a.jpg") digabung dengan
 * domain tenant. Kosong → null.
 */
export function urlGambarTenant(jalur: string | null | undefined): string | null {
  if (!jalur) return null;
  if (jalur.startsWith('http')) return jalur;
  const dasar = TenantService.getTenantUrl().replace(/\/$/, '');
  return `${dasar}${jalur.startsWith('/') ? jalur : `/${jalur}`}`;
}
