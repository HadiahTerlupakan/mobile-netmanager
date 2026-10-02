import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockDaftar = jest.fn<(status: string, salesId?: string) => unknown>();

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { name: 'Kepala' } }) }));
jest.mock('@/hooks/queries/useKeluhan', () => ({
  useDaftarKeluhan: (status: string, salesId?: string) => mockDaftar(status, salesId),
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

import DaftarKeluhanScreen from '../../app/(app)/keluhan/index';

const keluhan = {
  id: 'tk1',
  nomor: 'TKT-1',
  subjek: 'Internet mati',
  kategori: 'TECHNICAL',
  prioritas: 'HIGH',
  status: 'OPEN',
  dibuatPada: '2026-10-02T01:00:00.000Z',
  diperbaruiPada: '2026-10-02T01:00:00.000Z',
  pelanggan: { id: 'p1', nama: 'Bu Sari', idPelanggan: '77001' },
  namaSales: 'Ani',
  namaPelapor: 'Ani',
  wo: null,
};

const hasilKueri = (ubah: Record<string, unknown> = {}) => ({
  data: {
    pages: [
      {
        data: [keluhan],
        total: 1,
        page: 1,
        limit: 20,
        ringkasanSales: [
          { salesId: 's1', namaSales: 'Ani', jumlahTerbuka: 1 },
          { salesId: null, namaSales: 'Tanpa sales', jumlahTerbuka: 2 },
        ],
      },
    ],
  },
  isPending: false,
  isError: false,
  isRefetching: false,
  isFetchingNextPage: false,
  hasNextPage: false,
  fetchNextPage: jest.fn(),
  refetch: jest.fn(),
  ...ubah,
});

describe('layar daftar keluhan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDaftar.mockReturnValue(hasilKueri());
  });

  it('menampilkan jumlah, nama sales lain, dan membuka detail', () => {
    const { getByText, getByLabelText } = render(<DaftarKeluhanScreen />);
    expect(getByText('1 keluhan berjalan')).toBeTruthy();
    expect(getByText(/TKT-1 · Ani/)).toBeTruthy();
    fireEvent.press(getByLabelText('Keluhan Bu Sari: Internet mati'));
    expect(mockPush).toHaveBeenCalledWith('/(app)/keluhan/tk1');
  });

  it('chip sales menyaring daftar; sales tanpa id nonaktif', () => {
    const { getByText } = render(<DaftarKeluhanScreen />);
    fireEvent.press(getByText('Ani · 1 berjalan'));
    expect(mockDaftar).toHaveBeenLastCalledWith('TERBUKA', 's1');
    fireEvent.press(getByText('Tanpa sales · 2 berjalan'));
    expect(mockDaftar).toHaveBeenLastCalledWith('TERBUKA', 's1');
  });

  it('gagal muat: tombol coba lagi memuat ulang', () => {
    const refetch = jest.fn();
    mockDaftar.mockReturnValue(hasilKueri({ data: undefined, isError: true, refetch }));
    const { getByText } = render(<DaftarKeluhanScreen />);
    fireEvent.press(getByText('Coba lagi'));
    expect(refetch).toHaveBeenCalled();
  });
});
