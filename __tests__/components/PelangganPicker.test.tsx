import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { ActivityIndicator } from 'react-native';

const mockUsePelangganList = jest.fn();

jest.mock('@/hooks/queries/usePelangganList', () => ({
  usePelangganList: (...args: any[]) => mockUsePelangganList(...args),
}));
jest.mock('@shopify/flash-list', () => {
  const MockReact = require('react');
  return {
    FlashList: ({ data = [], renderItem, ListEmptyComponent }: any) => (
      <>
        {data.map((item: any, index: number) => (
          <MockReact.Fragment key={item.id ?? index}>{renderItem({ item, index })}</MockReact.Fragment>
        ))}
        {data.length === 0 ? ListEmptyComponent : null}
      </>
    ),
  };
});
jest.mock('lucide-react-native', () => ({ Search: () => null, X: () => null }));
jest.mock('twrnc', () => () => ({}));

const pelanggan = {
  id: 'plg-1',
  idPelanggan: 'P-001',
  nama: 'Budi Santoso',
  username: 'budi',
  status: 'ISOLIR',
  paket: 'Paket 20 Mbps',
  alamat: 'Jl. Mawar 1',
  noTelp: '08123',
  jatuhTempo: '2026-09-10T00:00:00.000Z',
  siteId: 'site-a',
  siteName: 'Site A',
  latitude: -6.2,
  longitude: 106.8,
};

const queryResult = (overrides: Record<string, unknown> = {}) => ({
  data: { pages: [{ data: [pelanggan], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } }] },
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetching: false,
  isError: false,
  error: null,
  ...overrides,
});

const renderPicker = (props: Record<string, unknown> = {}) => {
  const { PelangganPicker } = require('@/components/molecules/PelangganPicker');
  return render(
    <PelangganPicker visible onClose={jest.fn()} onSelect={jest.fn()} {...props} />,
  );
};

describe('PelangganPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePelangganList.mockReturnValue(queryResult());
  });

  it('merender hasil pencarian dan mengembalikan pelanggan yang ditekan', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();

    const { getByText } = renderPicker({ onSelect, onClose });
    fireEvent.press(getByText('Budi Santoso'));

    expect(onSelect).toHaveBeenCalledWith(pelanggan);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('menjelaskan ketika karyawan belum punya site, bukan bilang pelanggan tidak ada', () => {
    mockUsePelangganList.mockReturnValue(
      queryResult({ data: undefined, isError: true, error: { response: { status: 403 } } }),
    );

    const { getByText, queryByText } = renderPicker();

    expect(getByText('Belum ada site yang ditugaskan ke Anda. Hubungi admin.')).toBeTruthy();
    expect(queryByText('Pelanggan tidak ditemukan')).toBeNull();
  });

  it('membedakan kegagalan pemuatan dari hasil yang memang kosong', () => {
    mockUsePelangganList.mockReturnValue(
      queryResult({ data: undefined, isError: true, error: { response: { status: 500 } } }),
    );

    const { getByText, queryByText } = renderPicker();

    expect(getByText('Gagal memuat data pelanggan.')).toBeTruthy();
    expect(queryByText('Pelanggan tidak ditemukan')).toBeNull();
  });

  it('mengatakan pelanggan tidak ditemukan hanya saat pencarian sukses tanpa hasil', () => {
    mockUsePelangganList.mockReturnValue(
      queryResult({ data: { pages: [{ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } }] } }),
    );

    const { getByText } = renderPicker();

    expect(getByText('Pelanggan tidak ditemukan')).toBeTruthy();
  });

  it('menampilkan indikator memuat saat pembukaan pertama, bukan daftar kosong', () => {
    mockUsePelangganList.mockReturnValue(queryResult({ data: undefined, isFetching: true }));

    const { UNSAFE_getByType, queryByText } = renderPicker();

    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    expect(queryByText('Pelanggan tidak ditemukan')).toBeNull();
  });
});
