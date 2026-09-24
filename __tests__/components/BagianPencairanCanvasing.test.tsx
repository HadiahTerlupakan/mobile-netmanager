import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react-native';

const mockUseStatistik = jest.fn();
const mockRefetch = jest.fn();
let mockPropsKartu: { statistik?: unknown; onBerhasilCair?: () => void } = {};

jest.mock('@/hooks/useStatistikBeranda', () => ({ useStatistikBeranda: () => mockUseStatistik() }));
jest.mock('@/components/organisms/dashboard/KartuPencairanCanvasing', () => ({
  KartuPencairanCanvasing: (props: typeof mockPropsKartu) => {
    mockPropsKartu = props;
    return null;
  },
}));

import { BagianPencairanCanvasing } from '@/components/organisms/dashboard/BagianPencairanCanvasing';

describe('BagianPencairanCanvasing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPropsKartu = {};
  });

  it('meneruskan statistik Beranda ke kartu; pencairan berhasil memuat ulang statistik', () => {
    const statistik = { unclaimedCanvasing: 12, canvasingTarget: 10, targetSchema: 'ACCUMULATED' };
    mockUseStatistik.mockReturnValue({ data: statistik, refetch: mockRefetch });

    render(<BagianPencairanCanvasing />);
    mockPropsKartu.onBerhasilCair?.();

    expect(mockPropsKartu.statistik).toEqual({ unclaimedCanvasing: 12, canvasingTarget: 10, targetSchema: 'ACCUMULATED' });
    expect(mockRefetch).toHaveBeenCalledWith();
  });

  // Review akhir M2: tanpa data, kartu menebak skema BULANAN "0/30" lalu
  // berganti — atau permanen bila offline tanpa cache.
  it('statistik belum termuat: indikator memuat, kartu (dan skema tebakannya) belum dirender', () => {
    mockUseStatistik.mockReturnValue({ data: undefined, isPending: true, refetch: mockRefetch });

    const { getByTestId } = render(<BagianPencairanCanvasing />);

    expect(getByTestId('pencairan-canvasing-memuat')).toBeTruthy();
    expect(mockPropsKartu).toEqual({});
  });

  it('statistik gagal dimuat tanpa cache: tidak ada kartu dan tidak ada indikator', () => {
    mockUseStatistik.mockReturnValue({ data: undefined, isPending: false, refetch: mockRefetch });

    const { queryByTestId, toJSON } = render(<BagianPencairanCanvasing />);

    expect(queryByTestId('pencairan-canvasing-memuat')).toBeNull();
    expect(toJSON()).toBeNull();
    expect(mockPropsKartu).toEqual({});
  });
});
