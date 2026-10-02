import { describe, expect, it } from '@jest/globals';

import { nomorWhatsApp } from '@/utils/kontak';

describe('nomorWhatsApp', () => {
  it('menormalkan nomor lokal ke format 62', () => {
    expect(nomorWhatsApp('0812-3456-7890')).toBe('6281234567890');
    expect(nomorWhatsApp('81234567890')).toBe('6281234567890');
    expect(nomorWhatsApp('+62 812 3456 7890')).toBe('6281234567890');
  });
});

describe('hariLewatJatuhTempo', () => {
  const { hariLewatJatuhTempo } = require('@/utils/kontak') as typeof import('@/utils/kontak');
  const sekarang = new Date(2026, 9, 2, 15, 0);

  it('menghitung hari kalender lewat jatuh tempo', () => {
    expect(hariLewatJatuhTempo(new Date(2026, 8, 25, 23, 0).toISOString(), sekarang)).toBe(7);
    expect(hariLewatJatuhTempo(new Date(2026, 9, 2, 8, 0).toISOString(), sekarang)).toBe(0);
  });

  it('belum jatuh tempo atau tanggal rusak = 0', () => {
    expect(hariLewatJatuhTempo(new Date(2026, 9, 10).toISOString(), sekarang)).toBe(0);
    expect(hariLewatJatuhTempo('bukan-tanggal', sekarang)).toBe(0);
  });
});

describe('pesanPengingatTunggakan', () => {
  const { pesanPengingatTunggakan } = require('@/utils/kontak') as typeof import('@/utils/kontak');

  it('menyebut nama, sales, paket, ID, dan jatuh tempo', () => {
    const pesan = pesanPengingatTunggakan({
      nama: 'Budi',
      idPelanggan: '12345678',
      paket: '20 Mbps',
      jatuhTempo: '2026-09-25T00:00:00.000Z',
      namaSales: 'Ani',
    });
    expect(pesan).toContain('Halo Bapak/Ibu Budi');
    expect(pesan).toContain('Saya Ani');
    expect(pesan).toContain('paket 20 Mbps (ID 12345678)');
    expect(pesan).toContain('September 2026');
  });
});

describe('keteranganPelanggan & tujuanPetaPelanggan', () => {
  const { keteranganPelanggan, tujuanPetaPelanggan } = require('@/utils/kontak') as typeof import('@/utils/kontak');
  const dasar = { paket: '20 Mbps', idPelanggan: '77001', alamat: null, siteName: 'Site A', latitude: null, longitude: null };

  it('keterangan: paket · ID · alamat, jatuh ke site bila alamat kosong', () => {
    expect(keteranganPelanggan({ ...dasar, alamat: 'Jl. Mawar 1' })).toBe('20 Mbps · 77001 · Jl. Mawar 1');
    expect(keteranganPelanggan({ ...dasar, paket: null })).toBe('77001 · Site A');
  });

  it('tujuan peta: alamat, lalu koordinat, lalu null', () => {
    expect(tujuanPetaPelanggan({ ...dasar, alamat: 'Jl. Mawar 1', latitude: -6.2, longitude: 106.8 })).toBe('Jl. Mawar 1');
    expect(tujuanPetaPelanggan({ ...dasar, latitude: -6.2, longitude: 106.8 })).toBe('-6.2,106.8');
    expect(tujuanPetaPelanggan({ ...dasar, latitude: -6.2 })).toBeNull();
  });
});
