import { perkecilFoto as perkecilFotoUmum } from '@/utils/perkecilFoto';

/** Lebar foto bukti setelah diperkecil (pola `canvasing/create.tsx:147-160`). */
export const LEBAR_FOTO_BUKTI = 1024;

/** Kualitas JPEG foto bukti. */
export const KUALITAS_FOTO_BUKTI = 0.7;

/** Perkecil foto kamera ke lebar 1024, JPEG 0.7; mengembalikan URI baru. */
export function perkecilFoto(uri: string): Promise<string> {
  return perkecilFotoUmum(uri, { lebar: LEBAR_FOTO_BUKTI, kualitas: KUALITAS_FOTO_BUKTI });
}
