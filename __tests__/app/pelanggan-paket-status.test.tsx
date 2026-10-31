import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent } from '@testing-library/react-native';
import React from 'react';

import { renderDenganQuery, selesaikanJanji } from '../fixtures/portalPelanggan';

/**
 * Detail Layanan dulu menulis "Non-Aktif" untuk setiap status selain AKTIF,
 * jadi pelanggan isolir atau dalam perbaikan membaca layanannya dimatikan.
 */

const mockGet = jest.fn<(url: string) => Promise<{ data: unknown }>>();
const mockPush = jest.fn();

jest.mock('@/services/api', () => ({ __esModule: true, default: { get: (url: string) => mockGet(url) } }));
let mockEfekFokus: (() => void) | undefined;
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useFocusEffect: (efek: () => void) => {
    mockEfekFokus = efek;
  },
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

import CustomerPaketScreen from '../../app/(customer)/paket';

const URL_PROFIL = '/api/customer/profile';
const URL_PEMAKAIAN = '/api/customer/usage';
const SESI_ONLINE = { isOnline: true, ipAddress: '10.127.63.254/32', sessionDurationFormatted: '1j 5m' };

/** Profil dari `/api/customer/profile`; alamat IP sesi datang dari `/api/customer/usage`, seperti di portal. */
function sajikanProfil(status: string, koneksi: Record<string, unknown> = SESI_ONLINE) {
  mockGet.mockImplementation(async (url: string) => {
    if (url === URL_PEMAKAIAN) return { data: { success: true, data: { connection: koneksi } } };
    if (url !== URL_PROFIL) throw new Error(`URL tak terduga: ${url}`);
    return {
      data: {
        success: true,
        data: {
          profile: {
            idPelanggan: 'PLG-1',
            status,
            jatuhTempo: '2026-11-20T00:00:00.000Z',
            alamat: 'Jl. Mawar 1',
            paket: { nama: 'Home 10 Mbps', harga: 150000, bandwidth: null },
          },
        },
      },
    };
  });
}

async function renderLayar() {
  const layar = renderDenganQuery(<CustomerPaketScreen />);
  await selesaikanJanji();
  return layar;
}

describe('detail layanan pelanggan', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPush.mockReset();
    mockEfekFokus = undefined;
  });

  it.each([
    ['AKTIF', 'Aktif'],
    ['ISOLIR', 'Isolir'],
    ['NONAKTIF', 'Nonaktif'],
    ['MAINTENANCE', 'Perbaikan'],
  ])('status %s tampil sebagai "%s"', async (status, label) => {
    sajikanProfil(status);

    const layar = await renderLayar();

    expect(layar.getByText(label)).toBeTruthy();
    expect(layar.queryByText('Non-Aktif')).toBeNull();
  });

  it('layanan aktif bisa membuka layar upgrade', async () => {
    sajikanProfil('AKTIF');
    const layar = await renderLayar();

    fireEvent.press(layar.getByText('Upgrade Paket'));

    expect(mockPush).toHaveBeenCalledWith('/(customer)/upgrade-paket');
  });

  it('layanan tidak aktif: tombol upgrade nonaktif dengan alasannya', async () => {
    sajikanProfil('ISOLIR');
    const layar = await renderLayar();

    expect(layar.getByText('Upgrade bisa diajukan saat layanan Anda aktif.')).toBeTruthy();
    fireEvent.press(layar.getByText('Upgrade Paket'));

    expect(mockPush).not.toHaveBeenCalled();
  });

  // Setelah admin mengaktifkan kembali pelanggan, tab Paket dulu tetap
  // menulis "Perbaikan" dengan upgrade terkunci sampai ditarik untuk segarkan.
  it('memuat ulang status saat layar kembali difokuskan', async () => {
    sajikanProfil('MAINTENANCE');
    const layar = await renderLayar();
    expect(layar.getByText('Perbaikan')).toBeTruthy();

    sajikanProfil('AKTIF');
    act(() => mockEfekFokus?.());
    await selesaikanJanji();
    fireEvent.press(layar.getByText('Upgrade Paket'));

    expect(layar.getByText('Aktif')).toBeTruthy();
    expect(mockPush).toHaveBeenCalledWith('/(customer)/upgrade-paket');
  });

  // Dulu semua pelanggan membaca "Dynamic Public", termasuk yang beralamat privat.
  it('jenis IP mengikuti alamat sesi seperti di portal', async () => {
    sajikanProfil('AKTIF');

    const layar = await renderLayar();

    expect(layar.getByText('10.127.63.254 (Privat)')).toBeTruthy();
    expect(layar.queryByText('Dynamic Public')).toBeNull();
  });

  it('tanpa sesi online jenis IP tidak ditebak', async () => {
    sajikanProfil('AKTIF', { isOnline: false, ipAddress: null, sessionDurationFormatted: null });

    const layar = await renderLayar();

    expect(layar.getByText('Jenis IP Address')).toBeTruthy();
    expect(layar.getByText('-')).toBeTruthy();
    expect(layar.queryByText('Dynamic Public')).toBeNull();
  });
});
