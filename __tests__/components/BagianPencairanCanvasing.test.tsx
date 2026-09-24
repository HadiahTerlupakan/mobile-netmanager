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
});
