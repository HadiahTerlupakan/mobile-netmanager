import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

/**
 * Beranda staff: absen + menu kepegawaian yang berizin saja. Staff bukan
 * teknisi — tidak ada work order, statistik tiket, barang, topologi, isolir.
 */

const mockUseAuth = jest.fn();
const mockPush = jest.fn();
const mockInvalidate = jest.fn(async (_opsi: unknown) => undefined);
const mockRefetchProfile = jest.fn(async () => undefined);
let mockProfil: Record<string, unknown> | undefined;

jest.mock('@/context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual<typeof import('@tanstack/react-query')>('@tanstack/react-query'),
  useQueryClient: () => ({ invalidateQueries: mockInvalidate }),
}));
jest.mock('@/hooks/useProfileSync', () => ({
  useProfileSync: () => ({ profileData: mockProfil, refetch: mockRefetchProfile }),
}));
jest.mock('@/components/organisms/dashboard/KartuAbsenHariIni', () => {
  const { Text } = require('react-native');
  return { KartuAbsenHariIni: () => <Text>kartu-absen</Text> };
});
jest.mock('@/components/organisms/dashboard/BagianKinerjaBeranda', () => {
  const { Text } = require('react-native');
  return { BagianKinerjaBeranda: () => <Text>kartu-kinerja</Text> };
});
jest.mock('@/components/organisms/dashboard/BerandaModeCuti', () => {
  const { Text } = require('react-native');
  return { BerandaModeCuti: () => <Text>mode-cuti</Text> };
});
jest.mock('@/components/organisms/dashboard/DashboardHeader', () => ({ DashboardHeader: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: unknown }) => children,
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => () => ({}));

import { KaryawanStaffDashboardScreen } from '@/components/screens/KaryawanStaffDashboardScreen';

const SEMUA_FITUR = [
  'm_dashboard',
  'm_absensi',
  'm_izin',
  'm_lembur',
  'm_holidays',
  'm_chat',
  'm_work_order',
  'm_topology',
  'm_barang_keluar',
  'm_pelanggan',
  'm_canvasing',
  'm_presurvei',
];

const MENU_BUKAN_STAFF = ['Request WO', 'Topology Map', 'Barang Keluar', 'Isolir', 'Canvasing', 'Presurvei'];

const staff = (features: string[], tambahan: Record<string, unknown> = {}) => ({
  user: { id: 'u-1', name: 'Siti', role: 'STAFF', employeeType: 'KARYAWAN', persona: 'STAFF', features, ...tambahan },
});

describe('Beranda staff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfil = undefined;
  });

  it('menampilkan sapaan, kartu absen, dan menu kepegawaian; menu teknisi/sales tidak ada', () => {
    mockUseAuth.mockReturnValue(staff(SEMUA_FITUR));

    const { getByText, queryByText } = render(<KaryawanStaffDashboardScreen />);

    expect(getByText('Siti')).toBeTruthy();
    expect(getByText('kartu-absen')).toBeTruthy();
    for (const judul of ['Izin & Cuti', 'Lembur', 'Kalender Libur', 'Chat']) {
      expect(getByText(judul)).toBeTruthy();
    }
    for (const judul of MENU_BUKAN_STAFF) {
      expect(queryByText(judul)).toBeNull();
    }
  });

  it('menu tanpa izin disembunyikan (bukan dikunci); tanpa m_absensi kartu absen tidak tampil', () => {
    mockUseAuth.mockReturnValue(staff(['m_izin', 'm_chat']));

    const { getByText, queryByText } = render(<KaryawanStaffDashboardScreen />);

    expect(getByText('Izin & Cuti')).toBeTruthy();
    expect(getByText('Chat')).toBeTruthy();
    expect(queryByText('Lembur')).toBeNull();
    expect(queryByText('Kalender Libur')).toBeNull();
    expect(queryByText('kartu-absen')).toBeNull();
  });

  it('tanpa satu pun izin menu: bagian Menu Cepat tidak tampil', () => {
    mockUseAuth.mockReturnValue(staff(['m_dashboard']));

    const { queryByText } = render(<KaryawanStaffDashboardScreen />);

    expect(queryByText('Menu Cepat')).toBeNull();
  });

  it('menu berizin membuka layarnya', () => {
    mockUseAuth.mockReturnValue(staff(['m_lembur']));
    const { getByText } = render(<KaryawanStaffDashboardScreen />);

    fireEvent.press(getByText('Lembur'));

    expect(mockPush.mock.calls).toEqual([['/(app)/lembur']]);
  });

  it.each([
    ['TIM', true],
    ['SEMUA', true],
    ['SENDIRI', false],
    [undefined, false],
  ])('kartu penilaian kinerja tim: lingkup %s → tampil %s', (lingkupRencana, isTampil) => {
    mockProfil = { lingkupRencana };
    mockUseAuth.mockReturnValue(staff(SEMUA_FITUR));

    const { queryByText } = render(<KaryawanStaffDashboardScreen />);

    expect(queryByText('kartu-kinerja') !== null).toBe(isTampil);
  });

  it('sedang cuti: menampilkan Beranda mode cuti saja', () => {
    mockUseAuth.mockReturnValue(staff(SEMUA_FITUR, { isOnLeave: true }));

    const { getByText, queryByText } = render(<KaryawanStaffDashboardScreen />);

    expect(getByText('mode-cuti')).toBeTruthy();
    expect(queryByText('kartu-absen')).toBeNull();
    expect(queryByText('Menu Cepat')).toBeNull();
  });

  it('tarik-untuk-segarkan memuat ulang absen, penilaian, dan profil', async () => {
    mockUseAuth.mockReturnValue(staff(SEMUA_FITUR));
    const { getByTestId } = render(<KaryawanStaffDashboardScreen />);

    await act(async () => {
      await getByTestId('beranda-staff-gulir').props.refreshControl.props.onRefresh();
    });

    expect(mockInvalidate.mock.calls).toEqual([[{ queryKey: ['attendance'] }], [{ queryKey: ['presurvei'] }]]);
    expect(mockRefetchProfile).toHaveBeenCalledTimes(1);
  });
});
