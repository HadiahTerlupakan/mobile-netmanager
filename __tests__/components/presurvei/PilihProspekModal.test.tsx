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
type PropsFormTambahUji = { onBerhasil: (prospek: Record<string, unknown>) => void };
let mockFormTambah: PropsFormTambahUji | null = null;
jest.mock('@/components/organisms/presurvei/FormTambahProspek', () => ({
  FormTambahProspek: (props: PropsFormTambahUji) => {
    mockFormTambah = props;
    return null;
  },
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => () => ({}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 48, bottom: 24, left: 0, right: 0 }),
}));

import { JEDA_CARI_PROSPEK_MS } from '@/constants/presurvei';
import { PilihProspekModal } from '@/components/organisms/presurvei/PilihProspekModal';

const PROSPEK_BUDI = {
  id: 'p-1',
  nama: 'Budi Santoso',
  noTelp: '081200000001',
  alamat: 'Jl. Mawar 1',
  jenis: 'CALON_PELANGGAN',
  peran: null,
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
    mockFormTambah = null;
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

  it('galat server tidak ditelan menjadi "Belum ada prospek yang cocok. Ketuk tombol biru di atas untuk menambah."', () => {
    mockDaftar = { ...DAFTAR_DASAR, isError: true };
    const { getByText, queryByText } = renderModal();

    expect(getByText('Daftar prospek gagal dimuat.')).toBeTruthy();
    expect(queryByText('Belum ada prospek yang cocok. Ketuk tombol biru di atas untuk menambah.')).toBeNull();
  });

  it('sedang memuat saat online menampilkan Memuat…', () => {
    mockDaftar = { ...DAFTAR_DASAR, isPending: true, fetchStatus: 'fetching' };
    const { getByText } = renderModal();

    expect(getByText('Memuat…')).toBeTruthy();
  });

  it('hasil kosong menampilkan pesan kosong.', () => {
    mockDaftar = { ...DAFTAR_DASAR, data: { pages: [{ data: [] }] } };
    const { getByText } = renderModal();

    expect(getByText('Belum ada prospek yang cocok. Ketuk tombol biru di atas untuk menambah.')).toBeTruthy();
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

  it('berjudul "Pilih prospek"; perantara ditandai lencana berperan', () => {
    const PAK_RT = { ...PROSPEK_BUDI, id: 'p-2', nama: 'Pak Slamet', jenis: 'PERANTARA', peran: 'Ketua RT 03' };
    mockDaftar = { ...DAFTAR_DASAR, data: { pages: [{ data: [PROSPEK_BUDI, PAK_RT] }] } };
    const { getByText, getByPlaceholderText, getAllByTestId, getByLabelText, onPilih } = renderModal();

    expect(getByText('Pilih prospek')).toBeTruthy();
    expect(getByPlaceholderText('Cari nama atau nomor HP')).toBeTruthy();
    expect(getByText('Perantara · Ketua RT 03')).toBeTruthy();
    expect(getAllByTestId('lencana-perantara')).toHaveLength(1);

    fireEvent.press(getByLabelText('Pilih Pak Slamet'));
    expect(onPilih).toHaveBeenCalledWith(PAK_RT);
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

  it('isi modal menjauhi status bar sebesar inset sistem, supaya Tutup bisa diketuk', () => {
    const { getByTestId } = render(<PilihProspekModal onTutup={jest.fn()} onPilih={jest.fn()} />);

    const gaya = (getByTestId('isi-pilih-prospek').props.style as Record<string, number>[]).flat();
    expect(gaya).toEqual(expect.arrayContaining([expect.objectContaining({ paddingTop: 64, paddingBottom: 40 })]));
  });

  describe('tambah prospek baru', () => {
    it('tombol di atas daftar (juga saat kosong) membuka form di modal yang sama', () => {
      mockDaftar = { ...DAFTAR_DASAR, data: { pages: [{ data: [] }] } };
      const { getByLabelText, getByText, queryByLabelText } = renderModal();

      expect(getByText('Belum ada prospek yang cocok. Ketuk tombol biru di atas untuk menambah.')).toBeTruthy();
      fireEvent.press(getByLabelText('Tambah prospek baru'));

      expect(getByText('Tambah Prospek')).toBeTruthy();
      expect(mockFormTambah).not.toBeNull();
      expect(queryByLabelText('Cari prospek')).toBeNull();
    });

    it('prospek yang tersimpan langsung dipilih utuh (bentuk ProspekListItem)', () => {
      const { getByLabelText, onPilih, onTutup } = renderModal();
      fireEvent.press(getByLabelText('Tambah prospek baru'));
      const prospekBaru = { ...PROSPEK_BUDI, id: 'p-baru', status: 'BARU', email: null, latitude: -6.2 };

      act(() => mockFormTambah?.onBerhasil(prospekBaru));

      expect(onPilih).toHaveBeenCalledWith(prospekBaru);
      expect(onTutup).not.toHaveBeenCalled();
    });

    it('Batal dan tombol kembali Android kembali ke daftar tanpa menutup modal', () => {
      const { getByLabelText, getByText, UNSAFE_getByType, onTutup } = renderModal();
      const { Modal } = require('react-native');

      fireEvent.press(getByLabelText('Tambah prospek baru'));
      fireEvent.press(getByText('Batal'));
      expect(getByLabelText('Cari prospek')).toBeTruthy();

      fireEvent.press(getByLabelText('Tambah prospek baru'));
      act(() => UNSAFE_getByType(Modal).props.onRequestClose());
      expect(getByLabelText('Cari prospek')).toBeTruthy();
      expect(onTutup).not.toHaveBeenCalled();
    });
  });
});
