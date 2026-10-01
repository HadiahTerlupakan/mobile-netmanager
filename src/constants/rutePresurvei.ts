import type { Href } from 'expo-router';

import type { ProspekListItem } from '@/types/presurvei';

/** Layar catat kegiatan (`app/(app)/presurvei/kegiatan/catat.tsx`). */
export const RUTE_CATAT_KEGIATAN = '/(app)/presurvei/kegiatan/catat';

/** Layar Tambah Prospek (`app/(app)/presurvei/prospek/baru.tsx`). */
export const RUTE_TAMBAH_PROSPEK = '/(app)/presurvei/prospek/baru';

/** Rincian satu prospek. */
export function ruteRincianProspek(id: string): Href {
  return { pathname: '/(app)/presurvei/prospek/[id]', params: { id } } as Href;
}

/** Form catat kegiatan dengan prospek terpilih ("Catat Follow-up"). */
export function ruteCatatFollowUp(prospek: Pick<ProspekListItem, 'id' | 'nama'>): Href {
  return {
    pathname: RUTE_CATAT_KEGIATAN,
    params: { prospekId: prospek.id, prospekNama: prospek.nama },
  } as Href;
}

/** Form Jadikan Canvasing untuk satu prospek. */
export function ruteJadikanCanvasing(id: string): Href {
  return { pathname: '/(app)/presurvei/prospek/[id]/jadikan-canvasing', params: { id } } as Href;
}

