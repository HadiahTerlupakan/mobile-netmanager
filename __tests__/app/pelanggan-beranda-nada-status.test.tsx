import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet } from 'react-native';
import tw from 'twrnc';

import { renderDenganQuery, selesaikanJanji } from '../fixtures/portalPelanggan';

/**
 * Kartu layanan Beranda dulu hanya dua warna: hijau untuk sehat, merah untuk
 * selain itu. Pelanggan dalam perbaikan teknisi bukan gagal, jadi labelnya
 * kuning; twrnc sungguhan dipakai di sini agar warnanya ikut teruji.
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

import CustomerDashboardScreen from '../../app/(customer)/dashboard';

const URL_RINGKASAN = '/api/customer/dashboard/summary';
const siap = <T,>(data: T) => ({ state: 'ready', data });

function sajikanStatus(status: string) {
  mockGet.mockImplementation(async (url: string) => ({
    data:
      url === URL_RINGKASAN
        ? {
            success: true,
            data: {
              profile: siap({ nama: 'Budi', status, paket: { nama: 'Home 20 Mbps', bandwidth: { download: '20 Mbps' } } }),
              connection: siap({ isOnline: true, ipAddress: '10.0.0.2' }),
              billing: siap({ outstandingCount: 0, outstandingAmount: 0, nearestDueDate: null, hasOverdue: false }),
            },
          }
        : { success: true, count: 0 },
  }));
}

async function warnaLabel(status: string, label: string) {
  sajikanStatus(status);
  const layar = renderDenganQuery(<CustomerDashboardScreen />);
  await selesaikanJanji();
  return StyleSheet.flatten(layar.getByText(label).props.style).color;
}

describe('warna status layanan Beranda', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('aktif dan online berwarna hijau', async () => {
    expect(await warnaLabel('AKTIF', 'Aktif & Stabil')).toBe(tw`text-green-600`.color);
  });

  it('dalam perbaikan teknisi berwarna kuning, bukan hijau atau merah', async () => {
    expect(await warnaLabel('MAINTENANCE', 'Dalam perbaikan teknisi')).toBe(tw`text-amber-600`.color);
  });

  it('berhenti berlangganan berwarna merah walau sesi masih online', async () => {
    expect(await warnaLabel('DISMANTLE', 'Berhenti berlangganan')).toBe(tw`text-red-600`.color);
  });
});
