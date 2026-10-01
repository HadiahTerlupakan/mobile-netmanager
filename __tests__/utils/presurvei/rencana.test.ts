import { describe, expect, it } from '@jest/globals';

import { buatRencanaUji } from '../../fixtures/presurvei/rencana';
import type { KegiatanMenunggu } from '@/utils/presurvei/antreanKegiatan';
import {
  labelWaktuRencana,
  filterRencanaHarian,
  idRencanaMenungguKirim,
  isBolehAturRencana,
  isRencanaTerbuka,
  keTanggalKalender,
  rekapRencanaHariIni,
} from '@/utils/presurvei/rencana';

const rencana = buatRencanaUji;

const antrean = (rencanaId: string | null, status: KegiatanMenunggu['status']): KegiatanMenunggu => ({
  idAntrean: 1, jenis: 'KUNJUNGAN', hasil: 'TERTARIK', waktuMulai: '2026-09-26T01:00:00.000Z',
  alamatDikunjungi: null, ditemuiNama: null, jumlahFoto: 1, rencanaId, status,
});

describe('aturan rencana', () => {
  it('tanggal kalender memakai hari LOKAL dengan nol di depan', () => {
    expect(keTanggalKalender(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(filterRencanaHarian(new Date(2026, 8, 26, 8))).toEqual({ dari: '2026-09-26', sampai: '2026-09-26' });
  });

  it('terbuka = direncanakan atau terlewat', () => {
    expect(isRencanaTerbuka({ statusTampil: 'DIRENCANAKAN' })).toBe(true);
    expect(isRencanaTerbuka({ statusTampil: 'TERLEWAT' })).toBe(true);
    expect(isRencanaTerbuka({ statusTampil: 'SELESAI' })).toBe(false);
    expect(isRencanaTerbuka({ statusTampil: 'BATAL' })).toBe(false);
  });

  it('hanya rencana MANDIRI yang masih direncanakan boleh diubah/dibatalkan sales', () => {
    expect(isBolehAturRencana({ sumber: 'MANDIRI', status: 'DIRENCANAKAN' })).toBe(true);
    expect(isBolehAturRencana({ sumber: 'PENUGASAN', status: 'DIRENCANAKAN' })).toBe(false);
    expect(isBolehAturRencana({ sumber: 'MANDIRI', status: 'SELESAI' })).toBe(false);
  });

  it('rencana menunggu kirim hanya dari antrean yang masih akan dicoba (bukan FAILED)', () => {
    const hasil = idRencanaMenungguKirim([antrean('r-1', 'PENDING'), antrean('r-2', 'FAILED'), antrean(null, 'RETRY')]);
    expect([...hasil]).toEqual(['r-1']);
  });

  it('rekap hari ini tidak menghitung yang batal', () => {
    const rekap = rekapRencanaHariIni([
      rencana('a', { statusTampil: 'SELESAI', status: 'SELESAI' }),
      rencana('b'),
      rencana('c', { statusTampil: 'BATAL', status: 'BATAL' }),
    ]);
    expect(rekap.jumlah).toBe(2);
    expect(rekap.selesai).toBe(1);
    expect(rekap.tertunda.map((item) => item.id)).toEqual(['b']);
  });
});

describe('jam rencana', () => {
  it('label tanggal menyertakan jam hanya bila ada', () => {
    const format = (tanggal: string) => `[${tanggal}]`;
    expect(labelWaktuRencana({ tanggal: '2026-09-27', jam: '13:30' }, format)).toBe('[2026-09-27] · 13:30');
    expect(labelWaktuRencana({ tanggal: '2026-09-27', jam: null }, format)).toBe('[2026-09-27]');
  });
});
