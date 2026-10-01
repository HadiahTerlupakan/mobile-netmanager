import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react-native';

/**
 * Multiplexer Beranda. Keempat layar dimock menjadi penanda; batas galat
 * dimock menjadi penanda nama layarnya sambil tetap merender anaknya, supaya
 * persona yang salah pilih layar (atau salah batas) langsung terlihat.
 */

const mockUseAuth = jest.fn();

jest.mock('@/context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
jest.mock('@/components/screens/MitraSalesDashboardScreen', () => {
  const { Text } = require('react-native');
  return { MitraSalesDashboardScreen: () => <Text>layar-mitra-sales</Text> };
});
jest.mock('@/components/screens/MitraTeknisiDashboardScreen', () => {
  const { Text } = require('react-native');
  return { MitraTeknisiDashboardScreen: () => <Text>layar-mitra-teknisi</Text> };
});
jest.mock('@/components/screens/KaryawanSalesDashboardScreen', () => {
  const { Text } = require('react-native');
  return { KaryawanSalesDashboardScreen: () => <Text>layar-karyawan-sales</Text> };
});
jest.mock('@/components/screens/KaryawanStaffDashboardScreen', () => {
  const { Text } = require('react-native');
  return { KaryawanStaffDashboardScreen: () => <Text>layar-karyawan-staff</Text> };
});
jest.mock('@/components/screens/KaryawanTeknisiDashboardScreen', () => {
  const { Text } = require('react-native');
  return { KaryawanTeknisiDashboardScreen: () => <Text>layar-karyawan-teknisi</Text> };
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

const renderBeranda = (user: Record<string, unknown> | null) => {
  mockUseAuth.mockReturnValue({ user });
  const Dashboard = require('../../app/(app)/dashboard').default;
  return render(<Dashboard />);
};

const SEMUA_PENANDA = [
  'layar-karyawan-sales',
  'layar-karyawan-teknisi',
  'layar-karyawan-staff',
  'layar-mitra-sales',
  'layar-mitra-teknisi',
  'batas:Dashboard',
  'batas:DashboardSales',
  'batas:DashboardStaff',
];

describe('Beranda per persona', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    [{ employeeType: 'KARYAWAN', isSales: true }, ['batas:DashboardSales', 'layar-karyawan-sales']],
    [{ employeeType: 'KARYAWAN', isSales: false }, ['batas:Dashboard', 'layar-karyawan-teknisi']],
    [{ isSales: true }, ['batas:DashboardSales', 'layar-karyawan-sales']],
    [{ employeeType: 'MITRA_SALES', isSales: true }, ['layar-mitra-sales']],
    [{ employeeType: 'MITRA_TEKNISI', isSales: false }, ['layar-mitra-teknisi']],
    [null, ['batas:Dashboard', 'layar-karyawan-teknisi']],
    // Persona dari server menang atas isSales; Finance & Direktur sementara = Staff.
    [{ employeeType: 'KARYAWAN', persona: 'STAFF', isSales: false }, ['batas:DashboardStaff', 'layar-karyawan-staff']],
    [{ employeeType: 'KARYAWAN', persona: 'FINANCE', isSales: false }, ['batas:DashboardStaff', 'layar-karyawan-staff']],
    [{ employeeType: 'KARYAWAN', persona: 'DIREKTUR', isSales: false }, ['batas:DashboardStaff', 'layar-karyawan-staff']],
    [{ employeeType: 'KARYAWAN', persona: 'TEKNISI', isSales: false }, ['batas:Dashboard', 'layar-karyawan-teknisi']],
    [{ employeeType: 'KARYAWAN', persona: 'SALES', isSales: true }, ['batas:DashboardSales', 'layar-karyawan-sales']],
  ])('%j → %j', (user, penandaHarapan) => {
    const { queryByText } = renderBeranda(user);

    const penandaTampil = SEMUA_PENANDA.filter((penanda) => queryByText(penanda) !== null);
    expect(penandaTampil.sort()).toEqual([...penandaHarapan].sort());
  });
});
