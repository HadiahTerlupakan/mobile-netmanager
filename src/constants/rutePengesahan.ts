import type { Href } from 'expo-router';

/** Daftar surat pengesahan saya. */
export const RUTE_DAFTAR_PENGESAHAN = '/(app)/pengesahan' as Href;

/** Detail satu surat pengesahan. */
export function ruteDetailPengesahan(id: string): Href {
  return `/(app)/pengesahan/${id}` as Href;
}

/** Layar papan tanda tangan untuk satu surat. */
export function ruteTandaTanganPengesahan(id: string): Href {
  return `/(app)/pengesahan/tanda-tangan/${id}` as Href;
}

/** Layar alasan menolak satu surat. */
export function ruteTolakPengesahan(id: string): Href {
  return `/(app)/pengesahan/tolak/${id}` as Href;
}
