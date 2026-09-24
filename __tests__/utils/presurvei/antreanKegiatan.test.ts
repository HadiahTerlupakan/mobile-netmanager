import { describe, expect, it } from '@jest/globals';

import type { SyncQueueItem } from '@/services/DatabaseService';
import { ambilKegiatanMenunggu } from '@/utils/presurvei/antreanKegiatan';

const item = (over: Partial<SyncQueueItem>): SyncQueueItem => ({
  id: 7,
  url: '/api/presurvei/kegiatan',
  method: 'POST',
  body: JSON.stringify({
    jenis: 'KUNJUNGAN',
    hasil: 'TERTARIK',
    waktuMulai: '2026-09-24T03:15:00.000Z',
    alamatDikunjungi: 'Jl. Melati 9',
    ditemuiNama: 'Bu Sari',
  }),
  status: 'PENDING',
  createdAt: '2026-09-24T03:16:00.000Z',
  meta: JSON.stringify({ photos: ['file:///a.jpg', 'file:///b.jpg'], targetField: 'fotoUrls' }),
  ...over,
});

describe('ambilKegiatanMenunggu', () => {
  it('memetakan kegiatan dari antrean beserta jumlah fotonya', () => {
    expect(ambilKegiatanMenunggu([item({})])).toEqual([
      {
        idAntrean: 7,
        jenis: 'KUNJUNGAN',
        hasil: 'TERTARIK',
        waktuMulai: '2026-09-24T03:15:00.000Z',
        alamatDikunjungi: 'Jl. Melati 9',
        ditemuiNama: 'Bu Sari',
        jumlahFoto: 2,
      },
    ]);
  });

  it('mengabaikan antrean endpoint lain dan metode lain', () => {
    expect(
      ambilKegiatanMenunggu([
        item({ url: '/api/presurvei/prospek' }),
        item({ url: '/api/marketing/canvasing' }),
        item({ method: 'PATCH' }),
      ]),
    ).toEqual([]);
  });

  it('melewati badan rusak dan jenis asing tanpa melempar', () => {
    expect(
      ambilKegiatanMenunggu([
        item({ id: 1, body: '{bukan json' }),
        item({ id: 2, body: JSON.stringify({ jenis: 'SULAP', hasil: 'DEAL', waktuMulai: 'x' }) }),
        item({ id: 3 }),
      ]).map((kegiatan) => kegiatan.idAntrean),
    ).toEqual([3]);
  });

  it('jumlah foto nol bila meta tidak membawa foto', () => {
    expect(ambilKegiatanMenunggu([item({ meta: '{}' })])[0].jumlahFoto).toBe(0);
  });

  it('teks kosong menjadi null', () => {
    const [kegiatan] = ambilKegiatanMenunggu([
      item({ body: JSON.stringify({ jenis: 'TELEPON', hasil: 'TIDAK_MINAT', waktuMulai: '2026-09-24T03:15:00.000Z' }) }),
    ]);
    expect(kegiatan.alamatDikunjungi).toBeNull();
    expect(kegiatan.ditemuiNama).toBeNull();
  });
});
