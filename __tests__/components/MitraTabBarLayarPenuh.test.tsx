import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react-native';

const mockUseAuth = jest.fn(() => ({
  user: { role: 'MITRA', isSales: true, features: ['m_dashboard', 'm_canvasing'] },
}));
jest.mock('@/context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('twrnc', () => require('twrnc-kosong'));

import { MitraSalesTabBar } from '@/components/organisms/navigation/MitraSalesTabBar';
import { MitraTeknisiTabBar } from '@/components/organisms/navigation/MitraTeknisiTabBar';

const JUDUL: Record<string, string> = {
  dashboard: 'Beranda',
  'work-order': 'Work Order',
  'marketing/canvasing/index': 'Canvasing',
  profile: 'Profil',
  'work-order-detail/[id]': 'Rincian Work Order',
};

const RUTE_LAYAR_PENUH = 'work-order-detail/[id]';

const routes = Object.keys(JUDUL).map((name) => ({ key: `${name}-kunci`, name, params: undefined }));
const indeksLayarPenuh = routes.findIndex((route) => route.name === RUTE_LAYAR_PENUH);

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

const navigasi = { emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn() };

function renderBar(Bar: typeof MitraSalesTabBar, indeksFokus: number) {
  return render(
    <Bar
      state={{ index: indeksFokus, routes } as never}
      descriptors={descriptors as never}
      navigation={navigasi as never}
      insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
    />,
  );
}

describe.each([
  ['MitraSalesTabBar', MitraSalesTabBar],
  ['MitraTeknisiTabBar', MitraTeknisiTabBar],
])('%s di layar penuh', (_nama, Bar) => {
  it('tidak dirender saat layar meminta tab bar disembunyikan', () => {
    // Pil mengambang mitra menutupi tombol aksi di bawah layar rincian work
    // order (Mulai Kerja / Selesaikan) bila tetap dirender.
    const { toJSON } = renderBar(Bar as typeof MitraSalesTabBar, indeksLayarPenuh);

    expect(toJSON()).toBeNull();
  });

  it('tetap dirender di layar biasa', () => {
    const { toJSON } = renderBar(Bar as typeof MitraSalesTabBar, 0);

    expect(toJSON()).not.toBeNull();
  });
});
