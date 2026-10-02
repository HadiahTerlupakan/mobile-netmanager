/**
 * Daftar dari respons API yang bentuknya berbeda antar-endpoint: array
 * langsung, `{ data: [...] }`, atau `{ data: { [kunci]: [...] } }` / `{ [kunci]: [...] }`.
 */
export function ambilDaftar<T>(respons: unknown, kunci?: string): T[] {
  if (Array.isArray(respons)) return respons as T[];
  if (respons === null || typeof respons !== 'object') return [];
  const isi = (respons as { data?: unknown }).data ?? respons;
  if (Array.isArray(isi)) return isi as T[];
  if (kunci && isi !== null && typeof isi === 'object') {
    const daftar = (isi as Record<string, unknown>)[kunci];
    if (Array.isArray(daftar)) return daftar as T[];
  }
  return [];
}
