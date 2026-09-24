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
  options?: { href?: unknown; title?: string; tabBarStyle?: { display?: string } };
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
const mockMitraSalesTabBar = jest.fn((_props: unknown) => null);
jest.mock('@/components/organisms/navigation/MitraSalesTabBar', () => ({
  MitraSalesTabBar: (props: unknown) => mockMitraSalesTabBar(props),
}));
jest.mock('@/components/organisms/navigation/MitraTeknisiTabBar', () => ({ MitraTeknisiTabBar: () => null }));
const mockKaryawanSalesTabBar = jest.fn((_props: unknown) => null);
jest.mock('@/components/organisms/navigation/KaryawanSalesTabBar', () => ({
  KaryawanSalesTabBar: (props: unknown) => mockKaryawanSalesTabBar(props),
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => () => ({}));

/** Route presurvei yang tidak boleh muncul sebagai tab di tab bar bawaan. */
const RUTE_PRESURVEI_TERSEMBUNYI = [
  'presurvei/index',
  'presurvei/kegiatan/catat',
  'presurvei/prospek/[id]/index',
  'presurvei/prospek/[id]/jadikan-canvasing',
];

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

/** Penanda `href` tidak diisi (tab tampil dengan href bawaan), beda dari `href: null`. */
const HREF_BAWAAN = 'bawaan';

/** Sidik registrasi: nama, href, dan apakah tab bar disembunyikan, dalam urutan deklarasi. */
const sidikRegistrasi = () =>
  mockLayar.map((props) => [
    props.name,
    props.options && 'href' in props.options ? props.options.href : HREF_BAWAAN,
    props.options?.tabBarStyle?.display ?? null,
  ]);

const SIDIK_TERSEMBUNYI = [
  ['history', null, null],
  ['work-order-detail/[id]', null, 'none'],
  ['ambil-barang/[id]', null, 'none'],
  ['lembur', null, null],
  ['izin', null, null],
  ['notifications', null, null],
  ['topology-map', null, null],
  ['pelanggan/isolir', null, null],
  ['complete-work-order/[id]', null, 'none'],
  ['kembalikan-barang/[id]', null, 'none'],
  ['chat/index', null, null],
  ['chat/[conversationId]', null, 'none'],
  ['chat/new', null, 'none'],
  ['holidays', null, null],
  ['edit-profile', null, null],
  ['change-password', null, null],
  ['mitra-withdraw', null, 'none'],
  ['id-card/[id]', null, 'none'],
  ['marketing/canvasing/create', null, null],
  ['marketing/canvasing/[id]/index', null, 'none'],
  ['marketing/canvasing/[id]/claim', null, 'none'],
  ['presurvei/kegiatan/catat', null, 'none'],
  ['presurvei/prospek/[id]/index', null, 'none'],
  ['presurvei/prospek/[id]/jadikan-canvasing', null, 'none'],
  ['request-work-order', null, null],
];

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

  // Regresi ekstraksi `_layout.tsx` (Task 17): urutan, href, dan tab bar
  // tersembunyi setiap route harus identik dengan sebelum ekstraksi.
  it('registrasi route teknisi karyawan identik dengan sebelum ekstraksi', () => {
    renderLayout(TEKNISI);

    expect(sidikRegistrasi()).toEqual([
      ['dashboard', HREF_BAWAAN, null],
      ['presurvei/index', null, null],
      ['work-order', '/work-order', null],
      ['marketing/canvasing/index', null, null],
      ['barang', '/barang', null],
      ['absensi', '/absensi', null],
      ['profile', HREF_BAWAAN, null],
      ['mitra-wallet', null, null],
      ...SIDIK_TERSEMBUNYI,
    ]);
  });

  it('registrasi route mitra sales identik dengan sebelum ekstraksi', () => {
    renderLayout({ ...TEKNISI, employeeType: 'MITRA_SALES', isSales: true, features: ['m_canvasing'] });

    expect(sidikRegistrasi()).toEqual([
      ['dashboard', HREF_BAWAAN, null],
      ['presurvei/index', null, null],
      ['work-order', null, null],
      ['marketing/canvasing/index', '/marketing/canvasing', null],
      ['barang', null, null],
      ['absensi', null, null],
      ['profile', HREF_BAWAAN, null],
      ['mitra-wallet', '/mitra-wallet', null],
      ...SIDIK_TERSEMBUNYI,
    ]);
  });

  it('registrasi route mitra teknisi identik dengan sebelum ekstraksi', () => {
    renderLayout({ ...TEKNISI, employeeType: 'MITRA_TEKNISI' });

    expect(sidikRegistrasi()).toEqual([
      ['dashboard', HREF_BAWAAN, null],
      ['presurvei/index', null, null],
      ['work-order', '/work-order', null],
      ['marketing/canvasing/index', null, null],
      ['barang', null, null],
      ['absensi', null, null],
      ['profile', HREF_BAWAAN, null],
      ['mitra-wallet', '/mitra-wallet', null],
      ...SIDIK_TERSEMBUNYI,
    ]);
  });

  it('setiap route di RUTE_LAYAR_TERSEMBUNYI terdaftar tanpa tab, layar penuh tanpa tab bar', () => {
    const { RUTE_LAYAR_TERSEMBUNYI } = require('@/constants/ruteLayarTersembunyi');
    renderLayout(TEKNISI);

    for (const { nama, isLayarPenuh } of RUTE_LAYAR_TERSEMBUNYI as { nama: string; isLayarPenuh: boolean }[]) {
      expect([nama, layar(nama)?.options?.href, layar(nama)?.options?.tabBarStyle?.display ?? null]).toEqual([
        nama,
        null,
        isLayarPenuh ? 'none' : null,
      ]);
    }
  });

  it('layar presurvei selain tab-nya adalah layar penuh di RUTE_LAYAR_TERSEMBUNYI', () => {
    const { RUTE_LAYAR_TERSEMBUNYI } = require('@/constants/ruteLayarTersembunyi');
    const layarPenuh = (RUTE_LAYAR_TERSEMBUNYI as { nama: string; isLayarPenuh: boolean }[])
      .filter((rute) => rute.isLayarPenuh)
      .map((rute) => rute.nama);

    expect(layarPenuh).toEqual(expect.arrayContaining(RUTE_PRESURVEI_TERSEMBUNYI.filter((nama) => nama !== 'presurvei/index')));
  });

  /** Props tab bar tiruan; harus diteruskan utuh ke tab bar persona. */
  const PROPS_TAB_BAR = Object.freeze({ state: { index: 0, routes: [] } });

  const renderTabBar = () => {
    const tabBar = mockPropsTabs.tabBar as ((props: unknown) => React.ReactElement) | undefined;
    if (tabBar) render(tabBar(PROPS_TAB_BAR));
  };

  it('sales karyawan memakai KaryawanSalesTabBar', () => {
    renderLayout({ ...TEKNISI, isSales: true });

    renderTabBar();

    expect(mockKaryawanSalesTabBar).toHaveBeenCalledWith({ state: { index: 0, routes: [] } });
    expect(mockMitraSalesTabBar).not.toHaveBeenCalled();
  });

  it('sales karyawan tanpa m_presurvei: tab Presurvei ditolak saat ditekan (terkunci, bukan hilang)', () => {
    const { Alert } = require('react-native');
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const preventDefault = jest.fn();
    renderLayout({ ...TEKNISI, role: 'SALES', isSales: true, features: ['m_dashboard', 'm_canvasing'] });

    layar('presurvei/index')?.listeners?.tabPress?.({ preventDefault });

    expect(preventDefault).toHaveBeenCalledWith();
    expect(alert).toHaveBeenCalledWith('Akses Terbatas', expect.any(String), expect.any(Array));
  });

  it('mitra sales tetap memakai MitraSalesTabBar', () => {
    renderLayout({ ...TEKNISI, employeeType: 'MITRA_SALES', isSales: true });

    renderTabBar();

    expect(mockMitraSalesTabBar).toHaveBeenCalledWith({ state: { index: 0, routes: [] } });
    expect(mockKaryawanSalesTabBar).not.toHaveBeenCalled();
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
