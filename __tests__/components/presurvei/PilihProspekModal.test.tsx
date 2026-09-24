import React from 'react';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';

type KeadaanDaftarUji = {
  data?: { pages: { data: Record<string, unknown>[] }[] };
  isError: boolean;
  isPending: boolean;
  fetchStatus: 'fetching' | 'paused' | 'idle';
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
};

const mockRefetch = jest.fn(() => Promise.resolve());
const mockFetchNextPage = jest.fn(() => Promise.resolve());
const mockUseDaftarProspek = jest.fn<(filter: Record<string, unknown>) => KeadaanDaftarUji>();
let mockDaftar: KeadaanDaftarUji;

jest.mock('@/hooks/queries/usePresurveiProspek', () => ({
  useDaftarProspek: (filter: Record<string, unknown>) => ({
    ...mockUseDaftarProspek(filter),
    refetch: mockRefetch,
    fetchNextPage: mockFetchNextPage,
  }),
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => () => ({}));

import { JEDA_CARI_PROSPEK_MS } from '@/constants/presurvei';
import { PilihProspekModal } from '@/components/organisms/presurvei/PilihProspekModal';

const PROSPEK_BUDI = {
  id: 'p-1',
  nama: 'Budi Santoso',
  noTelp: '081200000001',
  alamat: 'Jl. Mawar 1',
  sumber: 'KUNJUNGAN',
  status: 'TERTARIK',
  pemilikId: 'u-1',
  namaPemilik: 'Sales A',
  paketDiminati: null,
  canvasingId: null,
  createdAt: '2026-09-20T02:00:00.000Z',
};

const DAFTAR_DASAR: KeadaanDaftarUji = {
  isError: false,
  isPending: false,
  fetchStatus: 'idle',
  hasNextPage: false,
  isFetchingNextPage: false,
};

const PESAN_OFFLINE =
  'Tidak ada koneksi. Memilih prospek butuh internet; kegiatan tetap bisa dicatat tanpa prospek.';

const renderModal = () => {
  const onPilih = jest.fn();
  const onTutup = jest.fn();
  const utilitas = render(<PilihProspekModal onPilih={onPilih} onTutup={onTutup} />);
  return { ...utilitas, onPilih, onTutup };
};

describe('PilihProspekModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDaftar = { ...DAFTAR_DASAR };
    mockUseDaftarProspek.mockImplementation(() => mockDaftar);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('offline: tidak memuat selamanya, menjelaskan kegiatan tetap bisa dicatat, dan menawarkan coba lagi', () => {
    mockDaftar = { ...DAFTAR_DASAR, isPending: true, fetchStatus: 'paused' };
    const { getByText, queryByText, getByLabelText } = renderModal();

    expect(queryByText('Memuat…')).toBeNull();
    expect(getByText(PESAN_OFFLINE)).toBeTruthy();

    fireEvent.press(getByLabelText('Coba lagi'));
    expect(mockRefetch).toHaveBeenCalledWith();
  });

  it('galat server tidak ditelan menjadi "Prospek tidak ditemukan."', () => {
    mockDaftar = { ...DAFTAR_DASAR, isError: true };
    const { getByText, queryByText } = renderModal();

    expect(getByText('Daftar prospek gagal dimuat.')).toBeTruthy();
    expect(queryByText('Prospek tidak ditemukan.')).toBeNull();
  });

  it('sedang memuat saat online menampilkan Memuat…', () => {
    mockDaftar = { ...DAFTAR_DASAR, isPending: true, fetchStatus: 'fetching' };
    const { getByText } = renderModal();

    expect(getByText('Memuat…')).toBeTruthy();
  });

  it('hasil kosong menampilkan Prospek tidak ditemukan.', () => {
    mockDaftar = { ...DAFTAR_DASAR, data: { pages: [{ data: [] }] } };
    const { getByText } = renderModal();

    expect(getByText('Prospek tidak ditemukan.')).toBeTruthy();
  });

  it('memilih prospek meneruskan item itu, dan Tutup menutup modal', () => {
    mockDaftar = { ...DAFTAR_DASAR, data: { pages: [{ data: [PROSPEK_BUDI] }] } };
    const { getByText, onPilih, onTutup } = renderModal();

    expect(getByText('081200000001 · Tertarik')).toBeTruthy();
    fireEvent.press(getByText('Budi Santoso'));
    fireEvent.press(getByText('Tutup'));

    expect(onPilih).toHaveBeenCalledWith(PROSPEK_BUDI);
    expect(onTutup).toHaveBeenCalledWith();
  });

  it('pencarian dikirim setelah jeda debounce dan dipangkas spasinya', () => {
    jest.useFakeTimers();
    const { getByLabelText } = renderModal();
    expect(mockUseDaftarProspek).toHaveBeenLastCalledWith({});

    fireEvent.changeText(getByLabelText('Cari prospek'), '  budi ');
    act(() => {
      jest.advanceTimersByTime(JEDA_CARI_PROSPEK_MS - 1);
    });
    expect(mockUseDaftarProspek).toHaveBeenLastCalledWith({});

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(mockUseDaftarProspek).toHaveBeenLastCalledWith({ search: 'budi' });
  });

  it('menggulir ke akhir memuat halaman berikutnya hanya bila ada dan tidak sedang dimuat', () => {
    mockDaftar = { ...DAFTAR_DASAR, data: { pages: [{ data: [PROSPEK_BUDI] }] }, hasNextPage: true };
    const { UNSAFE_getByType, rerender } = renderModal();
    const { FlatList } = require('react-native');

    act(() => UNSAFE_getByType(FlatList).props.onEndReached());
    expect(mockFetchNextPage).toHaveBeenCalledWith();

    mockFetchNextPage.mockClear();
    mockDaftar = { ...mockDaftar, isFetchingNextPage: true };
    rerender(<PilihProspekModal onPilih={jest.fn()} onTutup={jest.fn()} />);
    act(() => UNSAFE_getByType(FlatList).props.onEndReached());
    expect(mockFetchNextPage).not.toHaveBeenCalled();
  });
});
