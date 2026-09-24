import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act, render } from '@testing-library/react-native';

const mockUseAuth = jest.fn();
const mockPush = jest.fn();
const mockInvalidate = jest.fn(async () => undefined);
const mockRefetchProfile = jest.fn(async () => undefined);
const mockUseSegarkan = jest.fn();
let mockPropsMenu: Record<string, unknown> = {};
let mockPropsPresurvei: { isPresurveiAktif?: boolean } = {};
let mockPropsHeader: { userName?: string; userImage?: string | null; onProfilePress?: () => void } = {};

jest.mock('@/context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual<typeof import('@tanstack/react-query')>('@tanstack/react-query'),
  useQueryClient: () => ({ invalidateQueries: mockInvalidate }),
}));
jest.mock('@/hooks/useProfileSync', () => ({ useProfileSync: () => ({ refetch: mockRefetchProfile }) }));
jest.mock('@/hooks/queries/usePresurveiKegiatan', () => ({
  useSegarkanPresurveiSetelahSinkron: (...args: unknown[]) => mockUseSegarkan(...args),
}));
jest.mock('@/components/organisms/dashboard/QuickMenu', () => ({
  QuickMenu: (props: Record<string, unknown>) => {
    mockPropsMenu = props;
    return null;
  },
}));
jest.mock('@/components/organisms/dashboard/BagianPresurveiBeranda', () => {
  const { Text } = require('react-native');
  return {
    BagianPresurveiBeranda: (props: { isPresurveiAktif: boolean }) => {
      mockPropsPresurvei = props;
      return <Text>bagian-presurvei</Text>;
    },
  };
});
jest.mock('@/components/organisms/dashboard/KartuAbsenHariIni', () => {
  const { Text } = require('react-native');
  return { KartuAbsenHariIni: () => <Text>kartu-absen</Text> };
});
jest.mock('@/components/organisms/dashboard/BagianPencairanCanvasing', () => {
  const { Text } = require('react-native');
  return { BagianPencairanCanvasing: () => <Text>kartu-pencairan</Text> };
});
jest.mock('@/components/organisms/dashboard/BerandaModeCuti', () => {
  const { Text } = require('react-native');
  return {
    BerandaModeCuti: (props: { userName: string; userImage: string | null }) => (
      <Text>{`mode-cuti:${props.userName}:${props.userImage}`}</Text>
    ),
  };
});
jest.mock('@/components/organisms/dashboard/DashboardHeader', () => ({
  DashboardHeader: (props: typeof mockPropsHeader) => {
    mockPropsHeader = props;
    return null;
  },
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: unknown }) => children,
}));
jest.mock('twrnc', () => () => ({}));

import { KaryawanSalesDashboardScreen } from '@/components/screens/KaryawanSalesDashboardScreen';

const sales = (features: string[], tambahan: Record<string, unknown> = {}) => ({
  user: {
    ...tambahan,
    id: 'u-1',
    name: 'Sari',
    image: 'uploads/sari.jpg',
    role: 'SALES',
    isSales: true,
    employeeType: 'KARYAWAN',
    features,
  },
});

describe('KaryawanSalesDashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPropsMenu = {};
    mockPropsPresurvei = {};
    mockPropsHeader = {};
  });

  it('menu cepat sales: Chat, Izin/Cuti, Lembur, Kalender Libur (ruling I5)', () => {
    mockUseAuth.mockReturnValue(sales(['m_chat', 'm_izin']));

    render(<KaryawanSalesDashboardScreen />);

    expect(mockPropsMenu).toEqual({
      features: ['m_chat', 'm_izin'],
      isSales: true,
      role: 'SALES',
      isMitra: false,
      menuIds: ['chat', 'izin', 'lembur', 'holidays'],
    });
  });

  it('presurvei di Beranda aktif hanya bila berizin m_presurvei', () => {
    mockUseAuth.mockReturnValue(sales(['m_presurvei']));
    render(<KaryawanSalesDashboardScreen />);
    expect(mockPropsPresurvei.isPresurveiAktif).toBe(true);

    mockUseAuth.mockReturnValue(sales([]));
    render(<KaryawanSalesDashboardScreen />);
    expect(mockPropsPresurvei.isPresurveiAktif).toBe(false);
  });

  it('kartu absen hanya tampil bila berizin m_absensi (S11)', () => {
    mockUseAuth.mockReturnValue(sales(['m_absensi']));
    expect(render(<KaryawanSalesDashboardScreen />).queryByText('kartu-absen')).toBeTruthy();

    mockUseAuth.mockReturnValue(sales(['m_presurvei']));
    expect(render(<KaryawanSalesDashboardScreen />).queryByText('kartu-absen')).toBeNull();
  });

  it('menyegarkan data presurvei setiap antrean presurvei terkirim', () => {
    mockUseAuth.mockReturnValue(sales([]));

    render(<KaryawanSalesDashboardScreen />);

    expect(mockUseSegarkan).toHaveBeenCalledWith();
  });

  it('header memakai nama dan foto user; avatar membuka Profil', () => {
    mockUseAuth.mockReturnValue(sales([]));

    render(<KaryawanSalesDashboardScreen />);
    mockPropsHeader.onProfilePress?.();

    expect(mockPropsHeader.userName).toBe('Sari');
    expect(mockPropsHeader.userImage).toBe('uploads/sari.jpg');
    expect(mockPush).toHaveBeenCalledWith('/(app)/profile');
  });

  it('tarik-untuk-segarkan: presurvei, absensi, dan profil (izin baru, S12)', async () => {
    mockUseAuth.mockReturnValue(sales(['m_presurvei']));
    const { getByTestId } = render(<KaryawanSalesDashboardScreen />);
    const refreshControl = getByTestId('beranda-sales-gulir').props.refreshControl;

    await act(async () => {
      await refreshControl.props.onRefresh();
    });

    expect(mockInvalidate).toHaveBeenCalledTimes(3);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['presurvei'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['attendance'] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
    expect(mockRefetchProfile).toHaveBeenCalledWith();
  });

  it('kartu pencairan bonus canvasing tampil setelah presurvei bila boleh canvasing (fix C1)', () => {
    mockUseAuth.mockReturnValue(sales(['m_canvasing', 'm_presurvei']));
    const { getAllByText } = render(<KaryawanSalesDashboardScreen />);

    const urutan = getAllByText(/^(bagian-presurvei|kartu-pencairan)$/).map((node) => node.props.children);
    expect(urutan).toEqual(['bagian-presurvei', 'kartu-pencairan']);
  });

  it('tanpa m_canvasing tidak ada kartu pencairan bonus (fix C1)', () => {
    mockUseAuth.mockReturnValue(sales(['m_presurvei']));

    expect(render(<KaryawanSalesDashboardScreen />).queryByText('kartu-pencairan')).toBeNull();
  });

  it('sales cuti melihat Beranda mode cuti yang sama dengan teknisi (fix C2)', () => {
    mockUseAuth.mockReturnValue(sales(['m_presurvei', 'm_canvasing', 'm_absensi'], { isOnLeave: true }));
    const { getByText, queryByText } = render(<KaryawanSalesDashboardScreen />);

    expect(getByText('mode-cuti:Sari:uploads/sari.jpg')).toBeTruthy();
    expect(queryByText('kartu-absen')).toBeNull();
    expect(queryByText('kartu-pencairan')).toBeNull();
    expect(mockPropsPresurvei).toEqual({});
    expect(mockPropsMenu).toEqual({});
  });

  it('sales tidak cuti tidak melihat mode cuti (fix C2)', () => {
    mockUseAuth.mockReturnValue(sales(['m_presurvei'], { isOnLeave: false }));

    expect(render(<KaryawanSalesDashboardScreen />).queryByText(/mode-cuti/)).toBeNull();
    expect(mockPropsPresurvei.isPresurveiAktif).toBe(true);
  });
});
