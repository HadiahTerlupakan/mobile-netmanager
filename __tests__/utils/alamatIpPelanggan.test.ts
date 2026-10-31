import { describe, expect, it } from '@jest/globals';

import { jenisAlamatIp, labelAlamatIp } from '@/utils/alamatIpPelanggan';

/**
 * Penggolongan yang sama dengan `classifyIpAddress` di portal web
 * (netmanager `app/(customer)/paket/paket-helpers.ts`): Privat untuk RFC 1918
 * dan CGNAT (100.64.0.0/10), selain itu Publik.
 */
describe('jenisAlamatIp', () => {
  it.each([
    ['10.127.63.254', 'Privat'],
    ['172.16.0.1', 'Privat'],
    ['172.31.251.254', 'Privat'],
    ['192.168.88.10', 'Privat'],
    ['100.64.0.1', 'Privat'],
    ['100.127.255.254', 'Privat'],
    ['172.32.0.1', 'Publik'],
    ['100.128.0.1', 'Publik'],
    ['103.10.20.30', 'Publik'],
  ])('%s tergolong %s', (ip, jenis) => {
    expect(jenisAlamatIp(ip)).toBe(jenis);
  });

  it('menerima alamat dengan prefix inet seperti dikirim API', () => {
    expect(jenisAlamatIp('172.31.251.254/32')).toBe('Privat');
    expect(jenisAlamatIp('103.10.20.30/32')).toBe('Publik');
  });

  it('mengembalikan null untuk alamat yang bukan IPv4', () => {
    expect(jenisAlamatIp('bukan-ip')).toBeNull();
    expect(jenisAlamatIp('10.0.0.256')).toBeNull();
    expect(jenisAlamatIp('10.0.0')).toBeNull();
  });
});

describe('labelAlamatIp', () => {
  it('menyebut alamat sesi tanpa prefix beserta jenisnya', () => {
    expect(labelAlamatIp({ isOnline: true, ipAddress: '10.127.63.254/32' })).toBe('10.127.63.254 (Privat)');
    expect(labelAlamatIp({ isOnline: true, ipAddress: '103.10.20.30' })).toBe('103.10.20.30 (Publik)');
  });

  it.each([
    ['koneksi belum terbaca', undefined],
    ['sesi tidak online', { isOnline: false, ipAddress: '10.127.63.254' }],
    ['online tanpa alamat', { isOnline: true, ipAddress: null }],
    ['alamat bukan IPv4', { isOnline: true, ipAddress: 'fe80::1' }],
  ])('%s: "-"', (_kasus, koneksi) => {
    expect(labelAlamatIp(koneksi)).toBe('-');
  });
});
