import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent } from '@testing-library/react-native';
import React from 'react';

import { galatHttp, renderDenganQuery, selesaikanJanji, toastTerakhir } from '../fixtures/portalPelanggan';
import { buatTagihan, CHECKOUT_QRIS, jawabanServer, METODE_BAYAR } from '../fixtures/tagihanPelanggan';

/**
 * Setelah checkout dibuat, panel bayar dulu tetap terbuka dengan "Konfirmasi
 * & Bayar" aktif sampai daftar tagihan termuat ulang; ketukan kedua mengganti
 * checkout yang baru dibuat. Daftar metode yang gagal dimuat tampil sebagai
 * skeleton selamanya, dan daftar kosong tidak menampilkan apa pun.
 */

const mockGet = jest.fn<(url: string) => Promise<{ data: unknown }>>();
const mockPost = jest.fn<(url: string, body?: unknown) => Promise<{ status: number; data: unknown }>>();

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: (url: string) => mockGet(url),
    post: (url: string, body?: unknown) => mockPost(url, body),
  },
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }), useFocusEffect: jest.fn() }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});
jest.mock('react-native-sse', () => jest.fn(() => ({ addEventListener: jest.fn(), close: jest.fn() })));
jest.mock('react-native-qrcode-svg', () => {
  const { Text } = require('react-native');
  return ({ value }: { value: string }) => <Text>{`QR:${value}`}</Text>;
});
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
jest.mock('expo-image-picker', () => ({}));
jest.mock('@/utils/simpanQrisKeGaleri', () => ({ simpanQrisKeGaleri: jest.fn() }));
jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: jest.fn(async () => ({ type: 'dismiss' })) }));
jest.mock('@/services/TokenService', () => ({ TokenService: { getToken: jest.fn() } }));
jest.mock('@/services/TenantService', () => ({ TenantService: { getTenantUrl: jest.fn() } }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

import CustomerTagihanScreen from '../../app/(customer)/tagihan';

const CHECKOUT_VA_BARU = { status: 200, data: { success: true, data: { vaNumber: '7007', paymentUrl: 'https://gw' } } };

async function bukaPanel() {
  const layar = renderDenganQuery(<CustomerTagihanScreen />);
  await selesaikanJanji();
  fireEvent.press(layar.getByText('Bayar Sekarang'));
  return layar;
}

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockGet.mockImplementation(jawabanServer([buatTagihan()]));
});

describe('setelah checkout dibuat', () => {
  it('panel langsung tertutup dan tidak bisa dibayar lagi sebelum tagihan termuat ulang', async () => {
    mockPost.mockResolvedValue(CHECKOUT_VA_BARU);
    const layar = await bukaPanel();
    fireEvent.press(layar.getByText('BCA Virtual Account'));

    let selesaikanMuatUlang: () => void = () => undefined;
    const jawabSetelahCheckout = jawabanServer([buatTagihan({ lastPayment: { ...CHECKOUT_QRIS, qrString: null, vaNumber: '7007', gatewayProvider: 'BC' } })]);
    mockGet.mockImplementation((url) => new Promise((selesai) => (selesaikanMuatUlang = () => selesai(jawabSetelahCheckout(url)))));
    fireEvent.press(layar.getByText('Konfirmasi & Bayar'));
    await selesaikanJanji();

    expect(layar.queryByText('Konfirmasi & Bayar')).toBeNull();
    expect(layar.queryByText('Bayar Sekarang')).toBeNull();

    await act(async () => selesaikanMuatUlang());
    await selesaikanJanji();

    expect(layar.getByText('7007')).toBeTruthy();
    expect(mockPost).toHaveBeenCalledTimes(1);
  });
});

// Server menolak checkout baru dan mempertahankan checkout lama (lastPayment
// tetap menunjuknya); pelanggan harus tetap melihat instruksi bayar itu.
describe('ganti metode yang ditolak server', () => {
  it('kembali menampilkan checkout yang masih terbuka beserta alasan penolakannya', async () => {
    const PESAN = 'Nominal tagihan di bawah batas minimum metode pembayaran ini. Silakan pilih metode lain, misalnya QRIS.';
    mockGet.mockImplementation(jawabanServer([buatTagihan({ lastPayment: CHECKOUT_QRIS })]));
    mockPost.mockRejectedValue(galatHttp(400, PESAN));
    const layar = renderDenganQuery(<CustomerTagihanScreen />);
    await selesaikanJanji();

    fireEvent.press(layar.getByText('Ganti Metode Pembayaran'));
    fireEvent.press(layar.getByText('BCA Virtual Account'));
    const jumlahMuatSebelum = mockGet.mock.calls.filter(([url]) => url.startsWith('/api/customer/invoices')).length;
    fireEvent.press(layar.getByText('Konfirmasi & Bayar'));
    await selesaikanJanji();

    expect(toastTerakhir()?.text2).toBe(PESAN);
    expect(layar.getByText('QR:000201QRIS')).toBeTruthy();
    expect(mockGet.mock.calls.filter(([url]) => url.startsWith('/api/customer/invoices')).length).toBeGreaterThan(jumlahMuatSebelum);
  });

  it('checkout pertama yang ditolak tetap di panel agar bisa memilih metode lain', async () => {
    mockPost.mockRejectedValue(galatHttp(400, 'Nominal tagihan di bawah batas minimum metode pembayaran ini.'));
    const layar = await bukaPanel();

    fireEvent.press(layar.getByText('BCA Virtual Account'));
    fireEvent.press(layar.getByText('Konfirmasi & Bayar'));
    await selesaikanJanji();

    expect(layar.getByText('Konfirmasi & Bayar')).toBeTruthy();
  });
});

describe('daftar metode pembayaran', () => {
  it('meminta metode untuk nominal yang akan dibayar', async () => {
    await bukaPanel();

    expect(mockGet).toHaveBeenCalledWith('/api/customer/payment-methods?amount=11100');
  });

  it('nominal mengikuti diskon kupon', async () => {
    mockPost.mockResolvedValue({ status: 200, data: { success: true, data: { valid: true, code: 'HEMAT', discountAmount: 1110 } } });
    const layar = await bukaPanel();

    fireEvent.changeText(layar.getByPlaceholderText('MASUKKAN KODE'), 'HEMAT');
    fireEvent.press(layar.getByText('CEK'));
    await selesaikanJanji();

    expect(mockGet).toHaveBeenCalledWith('/api/customer/payment-methods?amount=9990');
  });

  it('gagal dimuat: menampilkan galat dan bisa dimuat ulang', async () => {
    const jawabanNormal = jawabanServer([buatTagihan()]);
    mockGet.mockImplementation(async (url) => {
      if (url.startsWith('/api/customer/payment-methods')) throw new Error('Network Error');
      return jawabanNormal(url);
    });
    const layar = await bukaPanel();
    await selesaikanJanji();

    expect(layar.getByText('Metode pembayaran gagal dimuat.')).toBeTruthy();
    mockGet.mockImplementation(jawabanNormal);
    fireEvent.press(layar.getByText('Coba Lagi'));
    await selesaikanJanji();

    expect(layar.getByText(METODE_BAYAR[0].name)).toBeTruthy();
  });

  it('kosong: pelanggan diberi tahu tidak ada metode yang tersedia', async () => {
    mockGet.mockImplementation(jawabanServer([buatTagihan()], { metode: [] }));
    const layar = await bukaPanel();
    await selesaikanJanji();

    expect(layar.getByText('Tidak ada metode pembayaran tersedia.')).toBeTruthy();
  });
});
