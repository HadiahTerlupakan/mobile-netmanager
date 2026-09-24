import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';

/**
 * Regresi Beranda teknisi karyawan: ditulis terhadap `app/(app)/dashboard.tsx`
 * sebelum Task 19 memindahkan layar teknisi keluar dan memecahnya (G4). Semua
 * assertion di sini wajib tetap hijau setelah refactor.
 */

const mockUseAuth = jest.fn();
const mockPush = jest.fn();
const mockRefetchStats = jest.fn();
const mockRefetchCanvasing = jest.fn();
const mockRefetchProfile = jest.fn();
const mockMutate = jest.fn();
const mockPresentInfo = jest.fn();
const mockPresentSuccess = jest.fn();
let mockProfil: { profileData: Record<string, unknown> | undefined; isPending: boolean };
let mockStats: { data: Record<string, unknown> | undefined; isPending: boolean };
let mockCanvasing: { data: Record<string, unknown> | undefined; isPending: boolean };
let mockOpsiMutasi: { mutationFn: () => unknown; onSuccess: () => void } | undefined;
const mockProps: Record<string, Record<string, unknown>[]> = {};

const catatProps = (nama: string, props: Record<string, unknown>) => {
  mockProps[nama] = [...(mockProps[nama] ?? []), props];
};

jest.mock('@/context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
jest.mock('@/hooks/useProfileSync', () => ({
  useProfileSync: () => ({
    profileData: mockProfil.profileData,
    isPending: mockProfil.isPending,
    refetch: mockRefetchProfile,
    hasFeature: (fitur: string) =>
      ((mockProfil.profileData?.features as string[] | undefined) ?? []).includes(fitur),
  }),
}));
jest.mock('@/hooks/queries', () => ({
  useOfflineQuery: (opsi: { endpoint: string }) =>
    opsi.endpoint === '/api/mobile/dashboard'
      ? { ...mockStats, refetch: mockRefetchStats }
      : { ...mockCanvasing, refetch: mockRefetchCanvasing },
  useMutation: (opsi: { mutationFn: () => unknown; onSuccess: () => void }) => {
    mockOpsiMutasi = opsi;
    return { mutate: mockMutate };
  },
}));
jest.mock('@/services/api', () => ({ __esModule: true, default: { post: jest.fn() } }));
jest.mock('@/services/TenantService', () => ({ TenantService: { getTenantUrl: () => 'https://tenant.test/' } }));
jest.mock('@/utils/errorPresenter', () => ({
  presentAppError: jest.fn(),
  presentInfoMessage: (...args: unknown[]) => mockPresentInfo(...args),
  presentSuccessMessage: (...args: unknown[]) => mockPresentSuccess(...args),
}));
jest.mock('@/components/atoms/ScreenErrorBoundary', () => ({
  ScreenErrorBoundary: ({ children }: { children: unknown }) => children,
}));
jest.mock('@/components/molecules/DashboardSkeleton', () => {
  const { Text: T } = require('react-native');
  return { DashboardSkeleton: () => <T>kerangka-beranda</T> };
});
jest.mock('@/components/organisms/dashboard/DashboardHeader', () => ({
  DashboardHeader: (props: Record<string, unknown>) => {
    catatProps('DashboardHeader', props);
    return null;
  },
}));
jest.mock('@/components/organisms/dashboard/QuickMenu', () => ({
  QuickMenu: (props: Record<string, unknown>) => {
    catatProps('QuickMenu', props);
    return null;
  },
}));
jest.mock('@/components/organisms/dashboard/PerformanceStats', () => {
  const { Text: T } = require('react-native');
  return {
    PerformanceStats: (props: { title: string; today: number; week: number; month: number }) => (
      <T>{`statistik:${props.title}:${props.today}/${props.week}/${props.month}`}</T>
    ),
  };
});
jest.mock('@/components/organisms/dashboard/WorkOrderCard', () => {
  const { Text: T } = require('react-native');
  return {
    WorkOrderCard: (props: { assigned: number; pending: number; onPress: () => void }) => (
      <T onPress={props.onPress}>{`kartu-wo:${props.assigned}/${props.pending}`}</T>
    ),
  };
});
jest.mock('@/components/organisms/dashboard/CanvasingCard', () => {
  const { Text: T } = require('react-native');
  return {
    CanvasingCard: (props: { assigned: number; completed: number; onPress: () => void }) => (
      <T onPress={props.onPress}>{`kartu-canvasing:${props.assigned}/${props.completed}`}</T>
    ),
  };
});
jest.mock('@/components/screens/MitraSalesDashboardScreen', () => ({ MitraSalesDashboardScreen: () => null }));
jest.mock('@/components/screens/MitraTeknisiDashboardScreen', () => ({ MitraTeknisiDashboardScreen: () => null }));
jest.mock('@shopify/flash-list', () => {
  const { View: V } = require('react-native');
  return {
    FlashList: ({ data, renderItem }: { data: unknown[]; renderItem: (info: { item: unknown; index: number }) => unknown }) => (
      <V>{data.map((item, index) => <V key={index}>{renderItem({ item, index }) as never}</V>)}</V>
    ),
  };
});
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: unknown }) => children,
}));
jest.mock('twrnc', () => () => ({}));

const TEKNISI = {
  id: 'u-9',
  name: 'Tono Auth',
  role: 'TEKNISI',
  employeeType: 'KARYAWAN',
  isSales: false,
  features: ['m_dashboard'],
};

const STATS = {
  workOrdersAssigned: 7,
  workOrdersPending: 4,
  woCompletedToday: 2,
  woCompletedWeek: 9,
  woCompletedMonth: 31,
  unclaimedCanvasing: 12,
  canvasingTarget: 10,
  targetSchema: 'ACCUMULATED',
};

const CANVASING = { approved: 5, completedToday: 3, completedWeek: 8, completedMonth: 21 };

const profilDengan = (features: string[], tambahan: Record<string, unknown> = {}) => ({
  name: 'Tono Profil',
  image: 'uploads/tono.jpg',
  features,
  ...tambahan,
});

const renderBeranda = (user: Record<string, unknown>) => {
  mockUseAuth.mockReturnValue({ user, token: 'tkn' });
  const Dashboard = require('../../app/(app)/dashboard').default;
  return render(<Dashboard />);
};

describe('Beranda teknisi karyawan (regresi)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    for (const nama of Object.keys(mockProps)) delete mockProps[nama];
    mockOpsiMutasi = undefined;
    mockProfil = { profileData: profilDengan(['m_work_order', 'm_canvasing']), isPending: false };
    mockStats = { data: STATS, isPending: false };
    mockCanvasing = { data: CANVASING, isPending: false };
  });

  it('karusel WO lalu canvasing dengan statistik tiket selesai untuk kartu pertama', () => {
    const { getByText, queryByText } = renderBeranda(TEKNISI);

    expect(getByText('kartu-wo:7/4')).toBeTruthy();
    expect(getByText('kartu-canvasing:5/3')).toBeTruthy();
    expect(getByText('statistik:Tiket Selesai:2/9/31')).toBeTruthy();
    expect(queryByText('Target & Pencairan')).toBeNull();
    expect(getByText('Tono Profil')).toBeTruthy();
  });

  it('header dan menu cepat memakai profil segar; teknisi bukan mitra dan bukan sales', () => {
    renderBeranda(TEKNISI);

    const header = mockProps.DashboardHeader.at(-1);
    expect(header).toEqual({ userName: 'Tono Profil', userImage: 'https://tenant.test/uploads/tono.jpg' });
    const menu = mockProps.QuickMenu.at(-1);
    expect(menu).toEqual({
      features: ['m_work_order', 'm_canvasing'],
      isSales: false,
      role: 'TEKNISI',
      isMitra: false,
    });
  });

  it('hanya canvasing: statistik canvasing tanpa kartu pencairan untuk non-sales', () => {
    mockProfil = { profileData: profilDengan(['m_canvasing']), isPending: false };
    const { getByText, queryByText } = renderBeranda(TEKNISI);

    expect(getByText('statistik:Canvasing Selesai:3/8/21')).toBeTruthy();
    expect(queryByText('Target & Pencairan')).toBeNull();
    expect(queryByText(/kartu-wo/)).toBeNull();
  });

  it('kartu canvasing ditekan teknisi: ditolak dengan pesan akses terbatas', () => {
    mockProfil = { profileData: profilDengan(['m_canvasing']), isPending: false };
    const { getByText } = renderBeranda(TEKNISI);

    fireEvent.press(getByText('kartu-canvasing:5/3'));

    expect(mockPresentInfo).toHaveBeenCalledWith('Fitur ini hanya dapat diakses oleh Sales yang aktif.', 'Akses Terbatas');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('kartu WO membuka daftar work order', () => {
    const { getByText } = renderBeranda(TEKNISI);

    fireEvent.press(getByText('kartu-wo:7/4'));

    expect(mockPush).toHaveBeenCalledWith('/(app)/work-order');
  });

  it('tanpa modul: pesan "Tidak ada modul aktif"', () => {
    mockProfil = { profileData: profilDengan([]), isPending: false };
    const { getByText } = renderBeranda(TEKNISI);

    expect(getByText('Tidak ada modul aktif')).toBeTruthy();
  });

  it('memuat statistik tanpa cache: kerangka Beranda', () => {
    mockStats = { data: undefined, isPending: true };
    const { getByText } = renderBeranda(TEKNISI);

    expect(getByText('kerangka-beranda')).toBeTruthy();
  });

  it('mode cuti: hanya tombol Buka Chat', () => {
    const { getByText, getByLabelText, queryByText } = renderBeranda({ ...TEKNISI, isOnLeave: true });

    expect(getByText('Mode Cuti Aktif')).toBeTruthy();
    expect(queryByText(/kartu-wo/)).toBeNull();
    fireEvent.press(getByLabelText('Buka chat'));
    expect(mockPush).toHaveBeenCalledWith('/(app)/chat');
    expect(mockProps.DashboardHeader.at(-1)).toEqual({
      userName: 'Tono Profil',
      userImage: 'https://tenant.test/uploads/tono.jpg',
    });
  });

  it('tarik-untuk-segarkan memuat ulang statistik, profil, dan canvasing', async () => {
    const { UNSAFE_root } = renderBeranda(TEKNISI);
    const refreshControl = UNSAFE_root.findAll(
      (node: { props: Record<string, unknown> }) => typeof node.props.onRefresh === 'function',
    )[0];

    await act(async () => {
      await refreshControl.props.onRefresh();
    });

    expect(mockRefetchStats).toHaveBeenCalledWith();
    expect(mockRefetchProfile).toHaveBeenCalledWith();
    expect(mockRefetchCanvasing).toHaveBeenCalledWith();
  });
});

/**
 * Kartu "Target & Pencairan" hanya dirender untuk `user.isSales`. Sebelum
 * Task 19 kartu ini terjangkau oleh sales karyawan lewat Beranda bawaan
 * (test ini semula merender lewat `Dashboard` dan hijau di kode lama). Sejak
 * Task 19 sales karyawan mendapat Beranda sendiri, jadi layar teknisi
 * dirender langsung supaya ekstraksi `KartuPencairanCanvasing` tetap terkunci.
 */
const SALES_LAMA = { ...TEKNISI, isSales: true };

const renderLayarLama = (user: Record<string, unknown>) => {
  mockUseAuth.mockReturnValue({ user, token: 'tkn' });
  const { KaryawanTeknisiDashboardScreen } = require('@/components/screens/KaryawanTeknisiDashboardScreen');
  return render(<KaryawanTeknisiDashboardScreen />);
};

describe('Kartu Target & Pencairan canvasing (regresi)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfil = { profileData: profilDengan(['m_canvasing']), isPending: false };
    mockStats = { data: STATS, isPending: false };
    mockCanvasing = { data: CANVASING, isPending: false };
  });

  it('skema akumulasi: progres dan konfirmasi pencairan', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { getByText, getByLabelText } = renderLayarLama(SALES_LAMA);

    expect(getByText('Target & Pencairan')).toBeTruthy();
    expect(getByText('AKUMULASI')).toBeTruthy();
    expect(getByText('Progress Pencairan')).toBeTruthy();
    expect(getByText('12 / 10')).toBeTruthy();

    fireEvent.press(getByLabelText('Cairkan komisi'));

    expect(alert).toHaveBeenCalledWith(
      'Konfirmasi Pencairan',
      'Anda memiliki 12 bonus canvasing yang siap dicairkan. Yakin ingin mencairkan semuanya sekarang?',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Cairkan', onPress: expect.any(Function) },
      ],
    );
    const tombol = alert.mock.calls[0][2] as { onPress?: () => void }[];
    tombol[1].onPress?.();
    expect(mockMutate).toHaveBeenCalledWith();
    alert.mockRestore();
  });

  it('pencairan berhasil: pesan sukses dan statistik dimuat ulang', () => {
    renderLayarLama(SALES_LAMA);

    mockOpsiMutasi?.onSuccess();

    expect(mockPresentSuccess).toHaveBeenCalledWith('Bonus canvasing berhasil dicairkan! Saldo akan direset menjadi 0.');
    expect(mockRefetchStats).toHaveBeenCalledWith();
  });

  it('akumulasi belum mencapai target: tombol cairkan nonaktif', () => {
    mockStats = { data: { ...STATS, unclaimedCanvasing: 4 }, isPending: false };
    const { getByLabelText, getByText } = renderLayarLama(SALES_LAMA);

    expect(getByText('4 / 10')).toBeTruthy();
    expect(getByLabelText('Cairkan komisi').props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
  });

  it('skema bulanan: tanpa tombol cairkan, target bawaan 30', () => {
    mockStats = { data: { ...STATS, targetSchema: 'MONTHLY_RESET', canvasingTarget: undefined }, isPending: false };
    const { getByText, queryByLabelText } = renderLayarLama(SALES_LAMA);

    expect(getByText('BULANAN')).toBeTruthy();
    expect(getByText('Progress Bulan Ini')).toBeTruthy();
    expect(getByText('12 / 30')).toBeTruthy();
    expect(queryByLabelText('Cairkan komisi')).toBeNull();
    expect(
      getByText('Target Anda direset otomatis setiap awal bulan. Bonus akan diproses langsung oleh Admin.'),
    ).toBeTruthy();
  });
});
