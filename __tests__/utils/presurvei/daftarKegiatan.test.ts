import { describe, expect, it } from '@jest/globals';

import type { KegiatanListItem } from '@/types/presurvei';
import type { KegiatanMenunggu } from '@/utils/presurvei/antreanKegiatan';
import { gabungKegiatanHarian, keBarisKegiatan } from '@/utils/presurvei/daftarKegiatan';
import { bangunFilterProspek } from '@/utils/presurvei/filterProspek';

const RENTANG = { dariTanggal: '2026-09-23T17:00:00.000Z', sampaiTanggal: '2026-09-24T16:59:59.999Z' };

const server = (id: string, waktuMulai: string): KegiatanListItem => ({
  id,
  jenis: 'KUNJUNGAN',
  userId: 'sales-a',
  namaSales: null,
  peranPelaku: null,
  departemenPelaku: null,
  prospekId: null,
  waktuMulai,
  alamatDikunjungi: `Alamat ${id}`,
  ditemuiNama: null,
  latitude: -6.2,
  longitude: 106.8,
  hasil: 'TERTARIK',
  jumlahFoto: 2,
});

const antrean = (
  idAntrean: number,
  waktuMulai: string,
  status: KegiatanMenunggu['status'] = 'PENDING',
): KegiatanMenunggu => ({
  idAntrean,
  jenis: 'TELEPON',
  hasil: 'TIDAK_MINAT',
  waktuMulai,
  alamatDikunjungi: null,
  ditemuiNama: 'Bu Sari',
  jumlahFoto: 0,
  status,
});

describe('gabungKegiatanHarian', () => {
  it('menggabungkan server dan antrean, terbaru lebih dulu, antrean ditandai', () => {
    const baris = gabungKegiatanHarian(
      [server('k-1', '2026-09-24T01:00:00.000Z'), server('k-2', '2026-09-24T05:00:00.000Z')],
      [antrean(9, '2026-09-24T03:00:00.000Z')],
      RENTANG,
    );

    expect(baris.map((b) => [b.kunci, b.isMenunggu])).toEqual([
      ['server-k-2', false],
      ['antrean-9', true],
      ['server-k-1', false],
    ]);
  });

  it('antrean di luar hari yang dilihat tidak ikut', () => {
    const baris = gabungKegiatanHarian([], [antrean(1, '2026-09-23T16:00:00.000Z')], RENTANG);

    expect(baris).toEqual([]);
  });

  it('memetakan item server ke baris daftar', () => {
    expect(keBarisKegiatan(server('k-3', '2026-09-24T02:00:00.000Z'))).toEqual({
      kunci: 'server-k-3',
      jenis: 'KUNJUNGAN',
      hasil: 'TERTARIK',
      waktuMulai: '2026-09-24T02:00:00.000Z',
      tempat: 'Alamat k-3',
      ditemuiNama: null,
      jumlahFoto: 2,
      isMenunggu: false,
      isGagal: false,
    });
  });

  // Ruling (progress.md): kegiatan FAILED di antrean WAJIB tetap tampil,
  // dibedakan dari yang masih menunggu lewat isGagal ("Gagal terkirim").
  it('kegiatan antrean berstatus FAILED tetap tampil dan ditandai isGagal, bukan isMenunggu', () => {
    const baris = gabungKegiatanHarian(
      [],
      [antrean(4, '2026-09-24T02:00:00.000Z', 'FAILED')],
      RENTANG,
    );

    expect(baris).toEqual([
      expect.objectContaining({ kunci: 'antrean-4', isMenunggu: false, isGagal: true }),
    ]);
  });

  it('kegiatan antrean berstatus RETRY tetap dianggap menunggu, bukan gagal', () => {
    const baris = gabungKegiatanHarian(
      [],
      [antrean(6, '2026-09-24T02:00:00.000Z', 'RETRY')],
      RENTANG,
    );

    expect(baris).toEqual([
      expect.objectContaining({ kunci: 'antrean-6', isMenunggu: true, isGagal: false }),
    ]);
  });
});

describe('bangunFilterProspek', () => {
  it('SEMUA dan pencarian kosong tidak mengirim filter', () => {
    expect(bangunFilterProspek('SEMUA', '  ')).toEqual({});
  });

  it('status dan pencarian yang dirapikan', () => {
    expect(bangunFilterProspek('TERTARIK', ' budi ')).toEqual({ status: 'TERTARIK', search: 'budi' });
  });
});
