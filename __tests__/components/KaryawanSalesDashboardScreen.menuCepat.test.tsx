import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

/**
 * Beranda sales memakai QuickMenu ASLI dengan Kalender Libur. Lembur
 * dihapus (keputusan pemilik 2026-09-26: sales tidak lembur). Tile tetap
 * terkunci tanpa izin; menu teknisi tetap tidak tampil.
 */

const mockUseAuth = jest.fn();
const mockPush = jest.fn();

jest.mock('@/context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual<typeof import('@tanstack/react-query')>('@tanstack/react-query'),
  useQueryClient: () => ({ invalidateQueries: jest.fn(async () => undefined) }),
}));
jest.mock('@/hooks/useProfileSync', () => ({ useProfileSync: () => ({ refetch: jest.fn(async () => undefined) }) }));
jest.mock('@/hooks/queries/usePresurveiKegiatan', () => ({ useSegarkanPresurveiSetelahSinkron: jest.fn() }));
jest.mock('@/components/organisms/dashboard/BagianPresurveiBeranda', () => ({ BagianPresurveiBeranda: () => null }));
jest.mock('@/components/organisms/dashboard/KartuAbsenHariIni', () => ({ KartuAbsenHariIni: () => null }));
jest.mock('@/components/organisms/dashboard/BagianPencairanCanvasing', () => ({ BagianPencairanCanvasing: () => null }));
jest.mock('@/components/organisms/dashboard/DashboardHeader', () => ({ DashboardHeader: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: unknown }) => children,
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => () => ({}));

import { KaryawanSalesDashboardScreen } from '@/components/screens/KaryawanSalesDashboardScreen';

const sales = (features: string[]) => ({
  user: { id: 'u-1', name: 'Sari', role: 'SALES', isSales: true, employeeType: 'KARYAWAN', features },
});

describe('Menu cepat Beranda sales (QuickMenu asli, ruling I5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('menampilkan Chat, Izin & Cuti, Kalender Libur; Lembur dan menu teknisi tidak tampil', () => {
    mockUseAuth.mockReturnValue(sales(['m_chat', 'm_izin', 'm_lembur', 'm_holidays', 'm_work_order', 'm_pelanggan']));

    const { getByText, queryByText } = render(<KaryawanSalesDashboardScreen />);

    for (const judul of ['Chat', 'Izin & Cuti', 'Kalender Libur']) {
      expect(getByText(judul)).toBeTruthy();
    }
    // Lembur tetap tersembunyi meski role memegang m_lembur: sales tidak lembur.
    for (const judul of ['Lembur', 'Request WO', 'Topology Map', 'Barang Keluar', 'Isolir', 'Canvasing', 'Presurvei']) {
      expect(queryByText(judul)).toBeNull();
    }
  });

  it('Kalender Libur terkunci tanpa izin: tidak membuka layar, tampil Akses Terbatas', () => {
    const { Alert } = require('react-native');
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockUseAuth.mockReturnValue(sales(['m_chat', 'm_izin']));
    const { getByText } = render(<KaryawanSalesDashboardScreen />);

    fireEvent.press(getByText('Kalender Libur'));

    expect(mockPush).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledTimes(1);
    expect(alert).toHaveBeenCalledWith('Akses Terbatas', expect.any(String), expect.any(Array));
    alert.mockRestore();
  });

  it('dengan izin: Kalender Libur membuka layarnya', () => {
    mockUseAuth.mockReturnValue(sales(['m_holidays']));
    const { getByText } = render(<KaryawanSalesDashboardScreen />);

    fireEvent.press(getByText('Kalender Libur'));

    expect(mockPush.mock.calls).toEqual([['/(app)/holidays']]);
  });
});
