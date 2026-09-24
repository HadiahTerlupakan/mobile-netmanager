import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react-native';

/**
 * Multiplexer Profil memilih layar lewat `tentukanPersona` (review akhir M7),
 * dengan pemetaan yang sama seperti sebelumnya: mitra ke layar mitra-nya,
 * sisanya (termasuk sales karyawan dan user belum dimuat) ke profil karyawan.
 */

const mockUseAuth = jest.fn();

jest.mock('@/context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
jest.mock('@/components/screens/profile/KaryawanProfileScreen', () => {
  const { Text } = require('react-native');
  return { KaryawanProfileScreen: () => <Text>profil-karyawan</Text> };
});
jest.mock('@/components/screens/profile/MitraSalesProfileScreen', () => {
  const { Text } = require('react-native');
  return { MitraSalesProfileScreen: () => <Text>profil-mitra-sales</Text> };
});
jest.mock('@/components/screens/profile/MitraTeknisiProfileScreen', () => {
  const { Text } = require('react-native');
  return { MitraTeknisiProfileScreen: () => <Text>profil-mitra-teknisi</Text> };
});
jest.mock('@/components/atoms/ScreenErrorBoundary', () => {
  const { Text, View } = require('react-native');
  return {
    ScreenErrorBoundary: ({ screenName, children }: { screenName: string; children: unknown }) => (
      <View>
        <Text>{`batas:${screenName}`}</Text>
        {children}
      </View>
    ),
  };
});

const SEMUA_PENANDA = ['profil-karyawan', 'profil-mitra-sales', 'profil-mitra-teknisi'];

const renderProfil = (user: Record<string, unknown> | null) => {
  mockUseAuth.mockReturnValue({ user });
  const Profil = require('../../app/(app)/profile').default;
  return render(<Profil />);
};

describe('Profil per persona', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['mitra sales', 'profil-mitra-sales', { employeeType: 'MITRA_SALES', isSales: true }],
    ['mitra teknisi', 'profil-mitra-teknisi', { employeeType: 'MITRA_TEKNISI', isSales: false }],
    ['sales karyawan', 'profil-karyawan', { employeeType: 'KARYAWAN', isSales: true }],
    ['teknisi karyawan', 'profil-karyawan', { employeeType: 'KARYAWAN', isSales: false }],
    ['employeeType kosong', 'profil-karyawan', { isSales: false }],
    ['user belum dimuat', 'profil-karyawan', null],
  ])('%s → %s di dalam batas galat ProfileMultiplexer', (_nama, penanda, user) => {
    const { getByText, queryByText } = renderProfil(user);

    expect(getByText('batas:ProfileMultiplexer')).toBeTruthy();
    expect(getByText(penanda)).toBeTruthy();
    for (const lain of SEMUA_PENANDA.filter((p) => p !== penanda)) {
      expect(queryByText(lain)).toBeNull();
    }
  });
});
