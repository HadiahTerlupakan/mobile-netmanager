import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react-native';

/**
 * Tab bar bawaan menampilkan setiap route yang tidak dideklarasikan sebagai
 * tab. Test ini menangkap props setiap `Tabs.Screen` untuk memastikan route
 * presurvei tersembunyi dan tab teknisi tidak berubah.
 */

type PropsLayar = {
  name: string;
  options?: { href?: unknown; title?: string };
  listeners?: { tabPress?: (e: { preventDefault: () => void }) => void };
};

const mockLayar: PropsLayar[] = [];
let mockPropsTabs: { tabBar?: unknown } = {};
const mockUseAuth = jest.fn();

jest.mock('expo-router', () => {
  const React = require('react');
  const Tabs = (props: { tabBar?: unknown; children: React.ReactNode }) => {
    mockPropsTabs = props;
    return <>{props.children}</>;
  };
  Tabs.Screen = (props: PropsLayar) => {
    mockLayar.push(props);
    return null;
  };
  return {
    Tabs,
    usePathname: () => '/dashboard',
    useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  };
});
jest.mock('@/utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('@/context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
jest.mock('@/hooks/useProfileSync', () => ({ useProfileSync: () => ({ profileData: null }) }));
jest.mock('@/utils/leaveAccess', () => ({ isRouteAllowedDuringLeave: () => true }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/components/organisms/FaceVerificationModal', () => ({ FaceVerificationModal: () => null }));
jest.mock('@/components/providers/LocationDisclosureProvider', () => ({
  LocationDisclosureProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('@/components/organisms/navigation/MitraSalesTabBar', () => ({ MitraSalesTabBar: () => null }));
jest.mock('@/components/organisms/navigation/MitraTeknisiTabBar', () => ({ MitraTeknisiTabBar: () => null }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => () => ({}));

/** Route presurvei yang tidak boleh muncul sebagai tab di tab bar bawaan. */
const RUTE_PRESURVEI_TERSEMBUNYI = ['presurvei/index', 'presurvei/kegiatan/catat'];

const TEKNISI = {
  id: 'u-1',
  role: 'TEKNISI',
  employeeType: 'KARYAWAN',
  isSales: false,
  isOnLeave: false,
  features: ['m_dashboard', 'm_work_order', 'm_barang', 'm_absensi', 'm_presurvei'],
};

const renderLayout = (user: Record<string, unknown>) => {
  mockLayar.length = 0;
  mockUseAuth.mockReturnValue({ user });
  const AppLayout = require('../../app/(app)/_layout').default;
  render(<AppLayout />);
};

const layar = (nama: string) => mockLayar.filter((props) => props.name === nama).at(-1);

describe('layout aplikasi — route presurvei', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Amandemen preflight: spy `Alert.alert` bisa bocor ke test lain bila
  // assertion di dalam test gagal sebelum sempat `mockRestore()`.
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(RUTE_PRESURVEI_TERSEMBUNYI)('mendaftarkan %s tanpa tab', (nama) => {
    renderLayout(TEKNISI);

    expect(layar(nama)).toBeDefined();
    expect(layar(nama)?.options?.href).toBeNull();
  });

  it('teknisi karyawan tetap melihat tab yang sama seperti sebelumnya', () => {
    renderLayout(TEKNISI);

    const terlihat = mockLayar
      .filter((props) => props.options?.href !== null)
      .map((props) => props.name);

    expect(terlihat).toEqual(['dashboard', 'work-order', 'barang', 'absensi', 'profile']);
    expect(mockPropsTabs.tabBar).toBeUndefined();
  });

  it('tab Presurvei memakai judul Presurvei dan terkunci tanpa m_presurvei', () => {
    const { Alert } = require('react-native');
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const preventDefault = jest.fn();
    renderLayout({ ...TEKNISI, features: ['m_dashboard'] });

    layar('presurvei/index')?.listeners?.tabPress?.({ preventDefault });

    expect(layar('presurvei/index')?.options?.title).toBe('Presurvei');
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(alert).toHaveBeenCalledWith('Akses Terbatas', expect.any(String), expect.any(Array));
    alert.mockRestore();
  });
});
