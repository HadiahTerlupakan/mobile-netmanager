import type { SalesRencana } from '@/types/presurvei';

/** Tim besar contoh (9 anggota termasuk kepala k-1) untuk test tampilan Tim. */
export const ANGGOTA_TIM_BESAR: SalesRencana[] = [
  { id: 'k-1', nama: 'Kepala Andi' },
  { id: 's-2', nama: 'Sinta' },
  { id: 's-3', nama: 'Tono' },
  { id: 's-4', nama: 'Budi' },
  { id: 's-5', nama: 'Wati' },
  { id: 's-6', nama: 'Rudi' },
  { id: 's-7', nama: 'Dewi' },
  { id: 's-8', nama: 'Eka' },
  { id: 's-9', nama: 'Fajar' },
];

/** Nama anggota tim besar menurut id. */
export const namaAnggota = (salesId: string): string =>
  ANGGOTA_TIM_BESAR.find((sales) => sales.id === salesId)?.nama ?? salesId;
