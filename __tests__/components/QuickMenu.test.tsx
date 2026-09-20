import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));
// Layar memakai banyak ikon; proxy ini mengembalikan komponen kosong untuk ikon apa pun.
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => () => ({}));

import { AppFeature } from '@/constants/features';

const ISOLIR_TILE = 'Isolir';

describe('QuickMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderMenu = (props: Record<string, unknown>) => {
    const { QuickMenu } = require('@/components/organisms/dashboard/QuickMenu');
    return render(<QuickMenu {...props} />);
  };

  it('menyembunyikan menu internal Isolir dari mitra eksternal', () => {
    const { queryByText } = renderMenu({ isMitra: true, features: [] });

    expect(queryByText(ISOLIR_TILE)).toBeNull();
    // Menu mitra lain tetap tampil: penanda internalOnly tidak boleh menyapu semuanya.
    expect(queryByText('Request WO')).toBeTruthy();
  });

  it('menampilkan menu Isolir untuk karyawan internal yang punya m_pelanggan', () => {
    const { getByText } = renderMenu({ isMitra: false, features: [AppFeature.PELANGGAN] });

    expect(getByText(ISOLIR_TILE)).toBeTruthy();
  });

  it('tetap menyembunyikan menu Isolir dari mitra walau punya m_pelanggan', () => {
    const { queryByText } = renderMenu({ isMitra: true, features: [AppFeature.PELANGGAN] });

    expect(queryByText(ISOLIR_TILE)).toBeNull();
  });

  it('membiarkan SUPER_ADMIN internal melihat menu Isolir', () => {
    const { getByText } = renderMenu({ isMitra: false, features: [], role: 'SUPER_ADMIN' });

    expect(getByText(ISOLIR_TILE)).toBeTruthy();
  });
});
