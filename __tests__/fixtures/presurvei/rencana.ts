import type { Rencana } from '@/types/presurvei';

/** Rencana contoh untuk test; timpa medan yang relevan lewat `over`. */
export function buatRencanaUji(id: string, over: Partial<Rencana> = {}): Rencana {
  return {
    id,
    salesId: 's-1',
    namaSales: null,
    dibuatOlehId: 's-1',
    namaPembuat: null,
    sumber: 'MANDIRI',
    jenis: 'KUNJUNGAN',
    tanggal: '2026-09-26',
    jam: null,
    tujuan: `Tujuan ${id}`,
    prospekId: null,
    namaProspek: null,
    alamat: null,
    latitude: null,
    longitude: null,
    status: 'DIRENCANAKAN',
    statusTampil: 'DIRENCANAKAN',
    isTerlambat: false,
    kegiatanId: null,
    dilaporkanAt: null,
    alasanBatal: null,
    dibatalkanAt: null,
    createdAt: '2026-09-25T00:00:00.000Z',
    ...over,
  };
}
