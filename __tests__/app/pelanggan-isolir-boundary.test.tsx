import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ActivityIndicator } from 'react-native';

const mockUsePelangganList = jest.fn();
const mockUseFeatureGuard = jest.fn();
const mockPush = jest.fn();
const mockApiGet = jest.fn();
const mockApiPost = jest.fn();

jest.mock('@/hooks/queries/usePelangganList', () => ({
  usePelangganList: (...args: any[]) => mockUsePelangganList(...args),
}));
jest.mock('@/hooks/useFeatureGuard', () => ({
  useFeatureGuard: (...args: any[]) => mockUseFeatureGuard(...args),
}));
jest.mock('@/constants/features', () => ({ AppFeature: { PELANGGAN: 'm_pelanggan' } }));
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));
jest.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: mockApiGet, post: mockApiPost },
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
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
jest.mock('lucide-react-native', () => ({
  AlertTriangle: () => null, CloudOff: () => null, MapPin: () => null,
  Phone: () => null, Search: () => null, X: () => null, Wrench: () => null,
}));
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
  isFetchingNextPage: false,
  isFetching: false,
  isRefetching: false,
  refetch: jest.fn(),
  isError: false,
  error: null,
  ...overrides,
});

describe('layar isolir pelanggan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePelangganList.mockReturnValue(queryResult());
  });

  it('meminta pelanggan berstatus ISOLIR dan dijaga feature guard', () => {
    const PelangganIsolirScreen = require('../../app/(app)/pelanggan/isolir').default;

    const { getByText } = render(<PelangganIsolirScreen />);

    expect(mockUseFeatureGuard).toHaveBeenCalledWith('m_pelanggan');
    expect(mockUsePelangganList).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ISOLIR' }),
    );
    // Bukan cuma argumen hook: pastikan layar benar-benar merender kartu
    // pelanggan dari fixture, supaya tes ini tidak tetap hijau kalau layar
    // diam-diam mengembalikan null.
    expect(getByText('Budi Santoso')).toBeTruthy();
  });

  it('tidak memanggil endpoint tulis apa pun dari layar ini', () => {
    const PelangganIsolirScreen = require('../../app/(app)/pelanggan/isolir').default;

    const { getByText } = render(<PelangganIsolirScreen />);

    expect(getByText('Budi Santoso')).toBeTruthy();
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it('menampilkan indikator memuat saat pemuatan pertama, bukan pesan kosong', () => {
    mockUsePelangganList.mockReturnValue(
      queryResult({ data: undefined, isFetching: true }),
    );
    const PelangganIsolirScreen = require('../../app/(app)/pelanggan/isolir').default;

    const { UNSAFE_getByType, queryByText } = render(<PelangganIsolirScreen />);

    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    expect(queryByText('Tidak ada pelanggan terisolir.')).toBeNull();
  });

  it('membuka Ajukan WO dengan membawa pelanggan terpilih', () => {
    const PelangganIsolirScreen = require('../../app/(app)/pelanggan/isolir').default;
    const { getByText } = render(<PelangganIsolirScreen />);

    fireEvent.press(getByText('Ajukan WO'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(app)/request-work-order',
      params: { pelangganId: 'plg-1', pelangganNama: 'Budi Santoso' },
    });
  });

  it('menjelaskan ketika karyawan belum punya site', () => {
    mockUsePelangganList.mockReturnValue(
      queryResult({
        data: undefined,
        isError: true,
        error: { response: { status: 403 } },
      }),
    );
    const PelangganIsolirScreen = require('../../app/(app)/pelanggan/isolir').default;

    const { getByText } = render(<PelangganIsolirScreen />);

    expect(getByText(/belum ada site/i)).toBeTruthy();
  });
});
