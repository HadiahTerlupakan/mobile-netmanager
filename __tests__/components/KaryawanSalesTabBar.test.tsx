import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

const mockUseAuth = jest.fn();
jest.mock('@/context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('twrnc', () => () => ({}));

import { KaryawanSalesTabBar } from '@/components/organisms/navigation/KaryawanSalesTabBar';

const JUDUL: Record<string, string> = {
  dashboard: 'Beranda',
  'work-order': 'Work Order',
  'presurvei/index': 'Presurvei',
  'marketing/canvasing/index': 'Canvasing',
  barang: 'Barang',
  absensi: 'Absensi',
  profile: 'Profil',
  'presurvei/kegiatan/catat': 'Catat Kegiatan',
};

const RUTE_LAYAR_PENUH = 'presurvei/kegiatan/catat';
const WARNA_AKTIF = '#2563eb';
const WARNA_PASIF = '#9ca3af';

const mockIkon = jest.fn((_rute: string, _props: unknown) => null);

const routes = Object.keys(JUDUL).map((name) => ({ key: `${name}-kunci`, name, params: undefined }));
const descriptors = Object.fromEntries(
  routes.map((route) => [
    route.key,
    {
      options: {
        title: JUDUL[route.name],
        tabBarIcon: (props: unknown) => mockIkon(route.name, props),
        tabBarStyle: route.name === RUTE_LAYAR_PENUH ? { display: 'none' } : undefined,
      },
    },
  ]),
);

const buatNavigasi = (isDicegah: boolean) => ({
  emit: jest.fn(() => ({ defaultPrevented: isDicegah })),
  navigate: jest.fn(),
});

const renderBar = (navigasi: ReturnType<typeof buatNavigasi>, indeksFokus = 0, daftarRute = routes) =>
  render(
    <KaryawanSalesTabBar
      state={{ index: indeksFokus, routes: daftarRute } as never}
      descriptors={descriptors as never}
      navigation={navigasi as never}
      insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
    />,
  );

describe('KaryawanSalesTabBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: {
        role: 'SALES',
        isSales: true,
        features: ['m_dashboard', 'm_presurvei', 'm_canvasing', 'm_absensi', 'm_work_order', 'm_barang'],
      },
    });
  });

  it('menampilkan tab sales dalam urutannya tanpa Work Order dan Barang', () => {
    const { getAllByRole } = renderBar(buatNavigasi(false));

    expect(getAllByRole('button').map((tombol) => tombol.props.accessibilityLabel)).toEqual([
      'Beranda',
      'Presurvei',
      'Canvasing',
      'Absensi',
      'Profil',
    ]);
  });

  it('pindah tab bila tabPress tidak dicegah', () => {
    const navigasi = buatNavigasi(false);
    const { getByLabelText } = renderBar(navigasi);

    fireEvent.press(getByLabelText('Presurvei'));

    expect(navigasi.emit).toHaveBeenCalledWith({ type: 'tabPress', target: 'presurvei/index-kunci', canPreventDefault: true });
    expect(navigasi.navigate).toHaveBeenCalledWith('presurvei/index', undefined);
  });

  it('tidak pindah bila listener layout mencegahnya (tab terkunci)', () => {
    const navigasi = buatNavigasi(true);
    const { getByLabelText } = renderBar(navigasi);

    fireEvent.press(getByLabelText('Presurvei'));

    expect(navigasi.emit).toHaveBeenCalledWith({ type: 'tabPress', target: 'presurvei/index-kunci', canPreventDefault: true });
    expect(navigasi.navigate).not.toHaveBeenCalled();
  });

  it('tidak navigasi ulang saat tab yang sedang aktif ditekan', () => {
    const navigasi = buatNavigasi(false);
    const { getByLabelText } = renderBar(navigasi);

    fireEvent.press(getByLabelText('Beranda'));

    expect(navigasi.emit).toHaveBeenCalledWith({ type: 'tabPress', target: 'dashboard-kunci', canPreventDefault: true });
    expect(navigasi.navigate).not.toHaveBeenCalled();
  });

  it('melewati tab yang route-nya tidak terdaftar di navigator', () => {
    const tanpaAbsensi = routes.filter((route) => route.name !== 'absensi');
    const { getAllByRole } = renderBar(buatNavigasi(false), 0, tanpaAbsensi);

    expect(getAllByRole('button').map((tombol) => tombol.props.accessibilityLabel)).toEqual([
      'Beranda',
      'Presurvei',
      'Canvasing',
      'Profil',
    ]);
  });

  it('tab aktif disorot biru, tetapi tab terkunci yang aktif tetap abu-abu', () => {
    const indeksPresurvei = routes.findIndex((route) => route.name === 'presurvei/index');
    renderBar(buatNavigasi(false), indeksPresurvei);

    expect(mockIkon).toHaveBeenCalledWith('presurvei/index', { focused: true, color: WARNA_AKTIF, size: 24 });

    mockIkon.mockClear();
    mockUseAuth.mockReturnValue({ user: { role: 'SALES', isSales: true, features: ['m_dashboard'] } });
    renderBar(buatNavigasi(false), indeksPresurvei);

    expect(mockIkon).toHaveBeenCalledWith('presurvei/index', { focused: true, color: WARNA_PASIF, size: 24 });
  });

  it('tidak dirender di layar penuh yang menyembunyikan tab bar', () => {
    const indeksLayarPenuh = routes.findIndex((route) => route.name === RUTE_LAYAR_PENUH);

    const { toJSON } = renderBar(buatNavigasi(false), indeksLayarPenuh);

    expect(toJSON()).toBeNull();
  });
});
