import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent } from '@testing-library/react-native';
import React from 'react';

import type { DetailTiket } from '@/types/portalPelanggan';
import { galatHttp, renderDenganQuery, selesaikanJanji, toastTerakhir } from '../fixtures/portalPelanggan';

const mockGet = jest.fn<(url: string) => Promise<{ data: unknown }>>();
const mockPost = jest.fn<(url: string, body?: unknown) => Promise<{ data: unknown }>>();
const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: (url: string) => mockGet(url), post: (url: string, body?: unknown) => mockPost(url, body) },
}));
let mockEfekFokus: (() => void) | undefined;
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useLocalSearchParams: () => ({ id: 't-1' }),
  useFocusEffect: (efek: () => void) => {
    mockEfekFokus = efek;
  },
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

import DetailTiketPelangganScreen from '../../app/(customer)/tickets/[id]';
import CustomerTicketsScreen from '../../app/(customer)/tickets/index';

const URL_TIKET = '/api/customer/tickets/t-1';

function buatTiket(ubah: Partial<DetailTiket> = {}): DetailTiket {
  return {
    id: 't-1',
    ticketNumber: 'TKT-20261030-001',
    subject: 'Internet mati',
    description: 'Sejak pagi lampu LOS merah',
    category: 'TECHNICAL',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    createdAt: '2026-10-30T01:00:00.000Z',
    closedAt: null,
    rating: null,
    attachments: [],
    replies: [
      {
        id: 'r-1',
        message: 'Teknisi kami sedang menuju lokasi',
        isFromAdmin: true,
        createdAt: '2026-10-30T02:00:00.000Z',
        sender: { id: 'u-1', name: 'Rina CS', type: 'admin' },
        attachments: [],
      },
    ],
    ...ubah,
  };
}

const sajikanTiket = (tiket: DetailTiket) => mockGet.mockResolvedValue({ data: { success: true, ticket: tiket } });

async function renderLayar() {
  const layar = renderDenganQuery(<DetailTiketPelangganScreen />);
  await selesaikanJanji();
  return layar;
}

describe('detail tiket pelanggan', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it('menampilkan deskripsi dan balasan staf dari GET detail', async () => {
    sajikanTiket(buatTiket());

    const layar = await renderLayar();

    expect(mockGet).toHaveBeenCalledWith(URL_TIKET);
    expect(layar.getByText('Internet mati')).toBeTruthy();
    expect(layar.getByText('Sejak pagi lampu LOS merah')).toBeTruthy();
    expect(layar.getByText('Teknisi kami sedang menuju lokasi')).toBeTruthy();
    expect(layar.getByText('Rina CS')).toBeTruthy();
    expect(layar.getByLabelText('Balasan tiket')).toBeTruthy();
  });

  it('tiket yang sudah ditutup tidak punya kotak balas maupun tombol tutup', async () => {
    sajikanTiket(buatTiket({ status: 'CLOSED', closedAt: '2026-10-30T03:00:00.000Z' }));

    const layar = await renderLayar();

    expect(layar.getByText('Tiket ini sudah ditutup')).toBeTruthy();
    expect(layar.queryByLabelText('Balasan tiket')).toBeNull();
    expect(layar.queryByLabelText('Kirim balasan')).toBeNull();
    expect(layar.queryByLabelText('Tutup Tiket')).toBeNull();
  });

  it('membalas mengirim teks terpangkas ke endpoint reply lalu memuat ulang tiket', async () => {
    sajikanTiket(buatTiket());
    mockPost.mockResolvedValue({ data: { success: true, reply: { id: 'r-2' } } });
    const layar = await renderLayar();

    fireEvent.changeText(layar.getByLabelText('Balasan tiket'), '  Baik, saya tunggu  ');
    fireEvent.press(layar.getByLabelText('Kirim balasan'));
    await selesaikanJanji();

    expect(mockPost).toHaveBeenCalledWith(`${URL_TIKET}/reply`, { message: 'Baik, saya tunggu' });
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(layar.getByLabelText('Balasan tiket').props.value).toBe('');
  });

  it('balasan yang ditolak server menampilkan pesannya dan teks tidak hilang', async () => {
    sajikanTiket(buatTiket());
    mockPost.mockRejectedValue(galatHttp(400, 'Tiket sudah ditutup dan tidak dapat dibalas'));
    const layar = await renderLayar();

    fireEvent.changeText(layar.getByLabelText('Balasan tiket'), 'Halo');
    fireEvent.press(layar.getByLabelText('Kirim balasan'));
    await selesaikanJanji();

    expect(toastTerakhir()?.text2).toBe('Tiket sudah ditutup dan tidak dapat dibalas');
    expect(layar.getByLabelText('Balasan tiket').props.value).toBe('Halo');
  });

  it('kotak balas kosong tidak bisa dikirim', async () => {
    sajikanTiket(buatTiket());
    const layar = await renderLayar();

    fireEvent.changeText(layar.getByLabelText('Balasan tiket'), '   ');
    fireEvent.press(layar.getByLabelText('Kirim balasan'));
    await selesaikanJanji();

    expect(mockPost).not.toHaveBeenCalled();
  });

  it('menutup tiket mengirim rating dan feedback yang dipilih', async () => {
    sajikanTiket(buatTiket());
    mockPost.mockResolvedValue({ data: { success: true, message: 'Tiket berhasil ditutup. Terima kasih telah menghubungi kami!' } });
    const layar = await renderLayar();

    fireEvent.press(layar.getByLabelText('Tutup Tiket'));
    fireEvent.press(layar.getByLabelText('4 bintang'));
    expect(layar.getByText('Puas')).toBeTruthy();
    fireEvent.changeText(layar.getByLabelText('Masukan penutupan'), ' Cepat ditangani ');
    fireEvent.press(layar.getByText('Ya, Tutup'));
    await selesaikanJanji();

    expect(mockPost).toHaveBeenCalledWith(`${URL_TIKET}/close`, { rating: 4, feedback: 'Cepat ditangani' });
    expect(toastTerakhir()?.text2).toBe('Tiket berhasil ditutup. Terima kasih telah menghubungi kami!');
  });

  it('menutup tanpa rating maupun feedback mengirim badan kosong', async () => {
    sajikanTiket(buatTiket());
    mockPost.mockResolvedValue({ data: { success: true } });
    const layar = await renderLayar();

    fireEvent.press(layar.getByLabelText('Tutup Tiket'));
    fireEvent.press(layar.getByText('Ya, Tutup'));
    await selesaikanJanji();

    expect(mockPost).toHaveBeenCalledWith(`${URL_TIKET}/close`, {});
  });

  it('tiket yang tidak ada (404) menampilkan keterangan, bukan galat umum', async () => {
    mockGet.mockRejectedValue(galatHttp(404, 'Tiket tidak ditemukan'));

    const layar = await renderLayar();

    expect(layar.getByText('Tiket tidak ditemukan')).toBeTruthy();
    expect(mockGet).toHaveBeenCalledTimes(1);
    fireEvent.press(layar.getByText('Kembali ke daftar tiket'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('mengetuk tiket di daftar membuka layar detailnya', async () => {
    mockGet.mockResolvedValue({
      data: { tickets: [{ id: 't-1', ticketNumber: 'TKT-1', subject: 'Internet mati', status: 'OPEN', updatedAt: '2026-10-30T01:00:00.000Z', category: 'TECHNICAL', _count: { replies: 0 } }] },
    });
    const layar = renderDenganQuery(<CustomerTicketsScreen />);
    await selesaikanJanji();

    fireEvent.press(layar.getByLabelText('Tiket TKT-1'));

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/(customer)/tickets/[id]', params: { id: 't-1' } });
  });

  // Balasan staf dan perubahan status dari portal dulu tidak terlihat di
  // daftar sampai pelanggan menarik layar untuk menyegarkan.
  it('daftar tiket dimuat ulang saat layar kembali difokuskan', async () => {
    const tiketDaftar = (id: string, ticketNumber: string) => ({
      id, ticketNumber, subject: 'Internet mati', status: 'OPEN', updatedAt: '2026-10-30T01:00:00.000Z', category: 'TECHNICAL', _count: { replies: 0 },
    });
    mockGet.mockResolvedValue({ data: { tickets: [tiketDaftar('t-1', 'TKT-1')] } });
    const layar = renderDenganQuery(<CustomerTicketsScreen />);
    await selesaikanJanji();
    expect(layar.queryByLabelText('Tiket TKT-2')).toBeNull();

    mockGet.mockResolvedValue({ data: { tickets: [tiketDaftar('t-2', 'TKT-2'), tiketDaftar('t-1', 'TKT-1')] } });
    act(() => mockEfekFokus?.());
    await selesaikanJanji();

    expect(layar.getByLabelText('Tiket TKT-2')).toBeTruthy();
  });
});
