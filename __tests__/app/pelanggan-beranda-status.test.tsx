import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';

import { renderDenganQuery, selesaikanJanji } from '../fixtures/portalPelanggan';

/**
 * Beranda dulu merakit sendiri profil, koneksi, dan 20 tagihan lewat
 * `Promise.all`: satu permintaan gagal mengosongkan semuanya, dan kartu
 * layanan lalu menulis "Gangguan / Offline" serta "Tagihan Lunas" untuk
 * pelanggan yang online dan menunggak. Status pelanggan juga tidak dibaca,
 * jadi pelanggan isolir (tetap online di pool isolir) membaca layanannya
 * normal. Kini Beranda memakai ringkasan yang sama dengan portal web.
 */

const mockGet = jest.fn<(url: string, config?: unknown) => Promise<{ data: unknown }>>();

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: (url: string, config?: unknown) => mockGet(url, config) },
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }), useFocusEffect: jest.fn() }));
jest.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'p-1', name: 'Budi', role: 'CUSTOMER' } }) }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

import CustomerDashboardScreen from '../../app/(customer)/dashboard';

const URL_RINGKASAN = '/api/customer/dashboard/summary';

const siap = <T,>(data: T) => ({ state: 'ready', data });
const galat = (message: string) => ({ state: 'error', data: null, message });

const PROFIL_AKTIF = siap({ nama: 'Budi', status: 'AKTIF', paket: { nama: 'Home 20 Mbps', bandwidth: { download: '20 Mbps' } } });
const ONLINE = siap({ isOnline: true, ipAddress: '10.0.0.2' });
const LUNAS = siap({ outstandingCount: 0, outstandingAmount: 0, nearestDueDate: null, hasOverdue: false });
const MENUNGGAK = siap({ outstandingCount: 1, outstandingAmount: 166500, nearestDueDate: '2026-10-20T00:00:00.000Z', hasOverdue: true });

function sajikanRingkasan(ringkasan: Record<string, unknown>) {
  mockGet.mockImplementation(async (url: string) => ({
    data:
      url === URL_RINGKASAN
        ? { success: true, data: { profile: PROFIL_AKTIF, connection: ONLINE, billing: LUNAS, ...ringkasan } }
        : { success: true, count: 0 },
  }));
}

async function renderLayar() {
  const layar = renderDenganQuery(<CustomerDashboardScreen />);
  await selesaikanJanji();
  return layar;
}

describe('kartu layanan Beranda pelanggan', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('membaca ringkasan yang sama dengan portal web', async () => {
    sajikanRingkasan({});

    const layar = await renderLayar();

    expect(mockGet).toHaveBeenCalledWith(URL_RINGKASAN, undefined);
    expect(layar.getByText('Aktif & Stabil')).toBeTruthy();
    expect(layar.getByText('Home 20 Mbps')).toBeTruthy();
  });

  it('isolir dengan tunggakan diminta membayar', async () => {
    sajikanRingkasan({ profile: siap({ ...PROFIL_AKTIF.data, status: 'ISOLIR' }), billing: MENUNGGAK });

    const layar = await renderLayar();

    expect(layar.getByText('Diisolir – bayar tagihan')).toBeTruthy();
    expect(layar.getByText('Bayar Sekarang')).toBeTruthy();
    expect(layar.getByText('Rp 166.500')).toBeTruthy();
  });

  it('isolir tanpa tunggakan tidak disuruh membayar', async () => {
    sajikanRingkasan({ profile: siap({ ...PROFIL_AKTIF.data, status: 'ISOLIR' }) });

    const layar = await renderLayar();

    expect(layar.getByText('Diisolir – hubungi admin/CS')).toBeTruthy();
    expect(layar.getByText('Tagihan Lunas')).toBeTruthy();
    expect(layar.queryByText('Diisolir – bayar tagihan')).toBeNull();
  });

  it('tagihan yang gagal dimuat tidak membuat koneksi tampil offline atau tagihan lunas', async () => {
    sajikanRingkasan({ billing: galat('Gagal memuat ringkasan tagihan pelanggan') });

    const layar = await renderLayar();

    expect(layar.getByText('Aktif & Stabil')).toBeTruthy();
    expect(layar.getByText('Tagihan belum bisa diverifikasi')).toBeTruthy();
    expect(layar.queryByText('Tagihan Lunas')).toBeNull();
  });

  it('koneksi yang gagal dibaca server tidak disebut offline', async () => {
    sajikanRingkasan({ connection: galat('Gagal memuat koneksi pelanggan') });

    const layar = await renderLayar();

    expect(layar.getByText('Status perangkat belum tersedia')).toBeTruthy();
    expect(layar.queryByText('Gangguan / Offline')).toBeNull();
  });

  it('sesi PPPoE yang putus tetap tampil sebagai gangguan', async () => {
    sajikanRingkasan({ connection: siap({ isOnline: false, ipAddress: null }) });

    const layar = await renderLayar();

    expect(layar.getByText('Gangguan / Offline')).toBeTruthy();
  });
});
