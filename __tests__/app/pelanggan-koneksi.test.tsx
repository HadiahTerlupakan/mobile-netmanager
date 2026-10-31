import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act } from '@testing-library/react-native';
import React from 'react';

import { renderDenganQuery, selesaikanJanji } from '../fixtures/portalPelanggan';

/**
 * `/api/customer/usage` tidak pernah mengirim kecepatan atau ping, jadi kartu
 * DOWN/UP/PING selalu "-". Yang dikirim adalah pemakaian bulan ini
 * (`usage.monthly`, sudah diformat server lewat `formatBytesValue`).
 */

const mockGet = jest.fn<(url: string) => Promise<{ data: unknown }>>();

jest.mock('@/services/api', () => ({ __esModule: true, default: { get: (url: string) => mockGet(url) } }));
let mockEfekFokus: (() => void) | undefined;
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
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

import CustomerConnectionScreen from '../../app/(customer)/koneksi';

const ukuran = (bytes: number, formatted: string) => ({ bytes, formatted });

beforeEach(() => {
  mockGet.mockResolvedValue({
    data: {
      success: true,
      data: {
        connection: { isOnline: true, ipAddress: '10.20.30.40', sessionDurationFormatted: '2j 15m' },
        usage: {
          monthly: {
            download: ukuran(1288490188, '1.2 GB'),
            upload: ukuran(314572800, '300 MB'),
            total: ukuran(1603062988, '1.49 GB'),
            period: { start: '2026-10-01T00:00:00.000Z', end: '2026-10-30T00:00:00.000Z' },
          },
          allTime: { download: ukuran(0, '0 B'), upload: ukuran(0, '0 B'), total: ukuran(0, '0 B') },
        },
      },
    },
  });
});

async function renderLayar() {
  const layar = renderDenganQuery(<CustomerConnectionScreen />);
  await selesaikanJanji();
  return layar;
}

describe('layar koneksi pelanggan', () => {
  it('menampilkan pemakaian bulan ini dari server', async () => {
    const layar = await renderLayar();

    expect(mockGet).toHaveBeenCalledWith('/api/customer/usage');
    expect(layar.getByText('1.2 GB')).toBeTruthy();
    expect(layar.getByText('300 MB')).toBeTruthy();
    expect(layar.getByText('1.49 GB')).toBeTruthy();
  });

  it('tetap menampilkan status, uptime, dan IP', async () => {
    const layar = await renderLayar();

    expect(layar.getByText('Terhubung')).toBeTruthy();
    expect(layar.getByText('2j 15m')).toBeTruthy();
    expect(layar.getByText('10.20.30.40')).toBeTruthy();
  });

  it('tidak lagi menampilkan kecepatan/ping kosong atau fitur "Segera hadir"', async () => {
    const layar = await renderLayar();

    expect(layar.queryByText('Mbps')).toBeNull();
    expect(layar.queryByText('Ping')).toBeNull();
    expect(layar.queryByText('Segera hadir')).toBeNull();
    for (const fitur of ['Detail Perangkat', 'Tes Kecepatan', 'Restart', 'Diagnosa Otomatis', 'Mulai Diagnosa']) {
      expect(layar.queryByText(fitur)).toBeNull();
    }
  });

  it('memuat ulang status koneksi saat layar kembali difokuskan', async () => {
    const layar = await renderLayar();
    expect(layar.getByText('Terhubung')).toBeTruthy();

    mockGet.mockResolvedValue({
      data: { success: true, data: { connection: { isOnline: false, ipAddress: null, sessionDurationFormatted: null } } },
    });
    act(() => mockEfekFokus?.());
    await selesaikanJanji();

    expect(layar.getByText('Terputus')).toBeTruthy();
  });

  // radacct.framedipaddress bertipe inet, jadi API mengirim prefix "/32".
  it('menampilkan IP tanpa prefix inet', async () => {
    mockGet.mockResolvedValue({
      data: { success: true, data: { connection: { isOnline: true, ipAddress: '10.127.63.254/32', sessionDurationFormatted: '2j 15m' } } },
    });

    const layar = await renderLayar();

    expect(layar.getByText('10.127.63.254')).toBeTruthy();
    expect(layar.queryByText('10.127.63.254/32')).toBeNull();
  });
});
