import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

const mockUseAuth = jest.fn();
jest.mock('@/context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('twrnc', () => require('twrnc-kosong'));

import { KaryawanStaffTabBar } from '@/components/organisms/navigation/KaryawanStaffTabBar';

/** Route navigator (semua terdaftar di layout), termasuk yang bukan tab staff. */
const JUDUL: Record<string, string> = {
  dashboard: 'Beranda',
  'presurvei/index': 'Presurvei',
  'work-order': 'Work Order',
  'marketing/canvasing/index': 'Canvasing',
  barang: 'Barang',
  absensi: 'Absensi',
  profile: 'Profil',
  'chat/index': 'Chat',
  'chat/new': 'Chat Baru',
};

const RUTE_LAYAR_PENUH = 'chat/new';

const routes = Object.keys(JUDUL).map((name) => ({ key: `${name}-kunci`, name, params: undefined }));
const descriptors = Object.fromEntries(
  routes.map((route) => [
    route.key,
    {
      options: {
        title: JUDUL[route.name],
        tabBarIcon: () => null,
        tabBarStyle: route.name === RUTE_LAYAR_PENUH ? { display: 'none' } : undefined,
      },
    },
  ]),
);

const buatNavigasi = () => ({
  emit: jest.fn(() => ({ defaultPrevented: false })),
  navigate: jest.fn(),
});

const renderBar = (navigasi: ReturnType<typeof buatNavigasi>, indeksFokus = 0) =>
  render(
    <KaryawanStaffTabBar
      state={{ index: indeksFokus, routes } as never}
      descriptors={descriptors as never}
      navigation={navigasi as never}
      insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
    />,
  );

const labelTab = (getAllByRole: (peran: string) => { props: { accessibilityLabel: string } }[]) =>
  getAllByRole('button').map((tombol) => tombol.props.accessibilityLabel);

describe('KaryawanStaffTabBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('staff berizin lengkap: Beranda · Absensi · Chat · Profil, tanpa tab teknisi/sales', () => {
    mockUseAuth.mockReturnValue({
      user: { role: 'STAFF', features: ['m_dashboard', 'm_absensi', 'm_chat', 'm_work_order', 'm_barang', 'm_canvasing'] },
    });

    const { getAllByRole } = renderBar(buatNavigasi());

    expect(labelTab(getAllByRole)).toEqual(['Beranda', 'Absensi', 'Chat', 'Profil']);
  });

  it('tanpa izin chat: tab Chat tidak tampil', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'STAFF', features: ['m_dashboard', 'm_absensi'] } });

    const { getAllByRole } = renderBar(buatNavigasi());

    expect(labelTab(getAllByRole)).toEqual(['Beranda', 'Absensi', 'Profil']);
  });

  it('menekan Chat pindah ke chat/index', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'STAFF', features: ['m_dashboard', 'm_chat'] } });
    const navigasi = buatNavigasi();
    const { getByLabelText } = renderBar(navigasi);

    fireEvent.press(getByLabelText('Chat'));

    expect(navigasi.navigate).toHaveBeenCalledWith('chat/index', undefined);
  });

  it('tidak dirender di layar penuh yang menyembunyikan tab bar', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'STAFF', features: ['m_chat'] } });
    const indeksLayarPenuh = routes.findIndex((route) => route.name === RUTE_LAYAR_PENUH);

    const { toJSON } = renderBar(buatNavigasi(), indeksLayarPenuh);

    expect(toJSON()).toBeNull();
  });
});
