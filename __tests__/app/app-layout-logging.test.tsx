import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react-native';

const mockInfo = jest.fn();
const mockWarn = jest.fn();
const mockError = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockUseAuth = jest.fn();
const mockUseProfileSync = jest.fn();

jest.mock('@/utils/logger', () => ({
  logger: {
    info: mockInfo,
    warn: mockWarn,
    error: mockError,
  },
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/hooks/useProfileSync', () => ({
  useProfileSync: () => mockUseProfileSync(),
}));

jest.mock('@/utils/leaveAccess', () => ({
  isRouteAllowedDuringLeave: () => true,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/components/organisms/FaceVerificationModal', () => ({
  FaceVerificationModal: () => null,
}));

jest.mock('@/components/organisms/navigation/MitraSalesTabBar', () => ({
  MitraSalesTabBar: () => null,
}));

jest.mock('@/components/organisms/navigation/MitraTeknisiTabBar', () => ({
  MitraTeknisiTabBar: () => null,
}));

jest.mock('@/components/organisms/navigation/KaryawanSalesTabBar', () => ({
  KaryawanSalesTabBar: () => null,
}));

jest.mock('@/constants/features', () => ({
  AppFeature: {
    DASHBOARD: 'dashboard',
    WORK_ORDER: 'work_order',
    CANVASING: 'canvasing',
    BARANG: 'barang',
    ABSENSI: 'absensi',
    IZIN: 'izin',
    PROFILE: 'profile',
  },
}));

jest.mock('lucide-react-native', () => ({
  ClipboardList: 'ClipboardList',
  DollarSign: 'DollarSign',
  Home: 'Home',
  Package: 'Package',
  ScanLine: 'ScanLine',
  User: 'User',
  Wallet: 'Wallet',
}));

jest.mock('twrnc', () => () => ({}));

jest.mock('expo-router', () => {
  const React = require('react');
  const TabsComponent = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  TabsComponent.Screen = () => null;

  return {
    Tabs: TabsComponent,
    usePathname: () => '/dashboard',
    useRouter: () => ({ replace: mockReplace, push: mockPush }),
  };
});

describe('App layout logging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        role: 'SUPER_ADMIN',
        isSales: false,
        employeeType: 'KARYAWAN',
        requiresFaceVerification: false,
        isOnLeave: false,
        features: [],
      },
    });
    mockUseProfileSync.mockReturnValue({ profileData: null });
  });

  it('does not log layout state again when re-rendered with the same user state', () => {
    const AppLayout = require('../../app/(app)/_layout').default;
    const { rerender } = render(<AppLayout />);

    rerender(<AppLayout />);

    expect(mockInfo.mock.calls.filter(([message]) => message === '[Layout] User State loaded')).toHaveLength(1);
  });
});
