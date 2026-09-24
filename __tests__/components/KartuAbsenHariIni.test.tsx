import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockUseStatusAbsen = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/hooks/useStatusAbsenHariIni', () => ({ useStatusAbsenHariIni: () => mockUseStatusAbsen() }));
jest.mock('twrnc', () => () => ({}));

import { KartuAbsenHariIni } from '@/components/organisms/dashboard/KartuAbsenHariIni';

describe('KartuAbsenHariIni', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('menampilkan status absen dari server', () => {
    mockUseStatusAbsen.mockReturnValue({
      data: { success: true, data: { status: 'checked-in', checkInTime: '07:58', checkOutTime: null } },
    });

    const { getByText } = render(<KartuAbsenHariIni />);

    expect(getByText('Check-in 07:58')).toBeTruthy();
  });

  it('status belum dimuat ditulis apa adanya', () => {
    mockUseStatusAbsen.mockReturnValue({ data: undefined });

    const { getByText } = render(<KartuAbsenHariIni />);

    expect(getByText('Status absen belum dimuat')).toBeTruthy();
  });

  it('ditekan membuka layar Absensi (check-in tetap di sana)', () => {
    mockUseStatusAbsen.mockReturnValue({ data: undefined });
    const { getByText } = render(<KartuAbsenHariIni />);

    fireEvent.press(getByText('Buka Absensi'));

    expect(mockPush).toHaveBeenCalledWith('/(app)/absensi');
  });
});
