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

function sajikanProfil(status: string) {
  mockGet.mockResolvedValue({
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
});
