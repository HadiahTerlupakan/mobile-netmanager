import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent } from '@testing-library/react-native';
import React from 'react';

import { renderDenganQuery, selesaikanJanji, toastTerakhir } from '../fixtures/portalPelanggan';
import { buatTagihan, CHECKOUT_QRIS, jawabanServer } from '../fixtures/tagihanPelanggan';

/**
 * Setelah membayar di browser dalam aplikasi, pelanggan dulu mendarat di
 * portal web (returnUrl) dan harus menutup tab itu sendiri; status bayarnya
 * baru terbaca setelah polling berikutnya.
 */

const mockGet = jest.fn<(url: string) => Promise<{ data: unknown }>>();
const mockPost = jest.fn<(url: string, body?: unknown) => Promise<{ status: number; data: unknown }>>();
const mockSesiBayar = jest.fn<(url: string, kembaliKe: string, opsi?: unknown) => Promise<{ type: string; url?: string }>>();

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
jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: (...args: [string, string, unknown]) => mockSesiBayar(...args),
}));
jest.mock('@/services/TokenService', () => ({ TokenService: { getToken: jest.fn() } }));
jest.mock('@/services/TenantService', () => ({ TenantService: { getTenantUrl: jest.fn() } }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

import CustomerTagihanScreen from '../../app/(customer)/tagihan';

const URL_BAYAR_OVO = 'https://sandbox.duitku.com/ovo';
const KEMBALI_KE_APLIKASI = 'netmanager://tagihan';
const CHECKOUT_OVO = { ...CHECKOUT_QRIS, gatewayProvider: 'OV', qrString: null, vaNumber: null, paymentUrl: URL_BAYAR_OVO };
const URL_CEK_STATUS = '/api/customer/payments/check-status';

function jawabPost(statusCek: string) {
  mockPost.mockImplementation(async (url) =>
    url === URL_CEK_STATUS
      ? { status: 200, data: { success: true, data: { status: statusCek } } }
      : { status: 200, data: { success: true, data: { paymentUrl: URL_BAYAR_OVO, vaNumber: null, qrString: null } } },
  );
}

async function renderLayar() {
  const layar = renderDenganQuery(<CustomerTagihanScreen />);
  await selesaikanJanji();
  return layar;
}

async function bayarDenganOvo(layar: Awaited<ReturnType<typeof renderLayar>>) {
  fireEvent.press(layar.getByText('Bayar Sekarang'));
  fireEvent.press(layar.getByText('OVO'));
  mockGet.mockImplementation(jawabanServer([buatTagihan({ lastPayment: CHECKOUT_OVO })]));
  fireEvent.press(layar.getByText('Konfirmasi & Bayar'));
  await selesaikanJanji();
}

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockSesiBayar.mockReset();
  mockSesiBayar.mockResolvedValue({ type: 'success', url: KEMBALI_KE_APLIKASI });
  mockGet.mockImplementation(jawabanServer([buatTagihan()]));
});

describe('halaman bayar e-wallet', () => {
  it('checkout meminta gateway kembali ke aplikasi dan halaman bayar menutup sendiri', async () => {
    jawabPost('PENDING');
    const layar = await renderLayar();

    await bayarDenganOvo(layar);

    expect(mockPost).toHaveBeenCalledWith('/api/customer/payments', expect.objectContaining({ paymentMethod: 'OV', returnTo: 'app' }));
    expect(mockSesiBayar).toHaveBeenCalledWith(URL_BAYAR_OVO, KEMBALI_KE_APLIKASI, expect.any(Object));
  });

  it('kembali dari halaman bayar memeriksa status ke gateway lalu menampilkan lembar sukses', async () => {
    jawabPost('PAID');
    const layar = await renderLayar();
    let kembaliKeAplikasi: () => void = () => undefined;
    mockSesiBayar.mockImplementation(
      () => new Promise((selesai) => (kembaliKeAplikasi = () => selesai({ type: 'success', url: KEMBALI_KE_APLIKASI }))),
    );

    await bayarDenganOvo(layar);
    // Pelanggan membayar di halaman e-wallet, lalu gateway mengembalikannya ke aplikasi.
    mockGet.mockImplementation(jawabanServer([buatTagihan({ status: 'PAID', lastPayment: { ...CHECKOUT_OVO, gatewayStatus: 'PAID' } })]));
    await act(async () => kembaliKeAplikasi());
    await selesaikanJanji();

    expect(mockPost).toHaveBeenCalledWith(URL_CEK_STATUS, { invoiceId: 'inv-1' });
    expect(layar.getByText('Pembayaran Berhasil')).toBeTruthy();
  });

  it('halaman bayar yang ditutup sendiri tidak menyebut pembayaran belum diterima', async () => {
    jawabPost('PENDING');
    mockSesiBayar.mockResolvedValue({ type: 'cancel' });
    const layar = await renderLayar();

    await bayarDenganOvo(layar);
    await selesaikanJanji();

    expect(mockPost).toHaveBeenCalledWith(URL_CEK_STATUS, { invoiceId: 'inv-1' });
    expect(toastTerakhir()?.text2 ?? '').not.toMatch(/belum kami terima/);
  });

  it('"Lanjutkan ke Halaman Pembayaran" membuka halaman yang sama', async () => {
    jawabPost('PENDING');
    mockGet.mockImplementation(jawabanServer([buatTagihan({ lastPayment: CHECKOUT_OVO })]));
    const layar = await renderLayar();

    fireEvent.press(layar.getByText('Lanjutkan ke Halaman Pembayaran'));
    await selesaikanJanji();

    expect(mockSesiBayar).toHaveBeenCalledWith(URL_BAYAR_OVO, KEMBALI_KE_APLIKASI, expect.any(Object));
    expect(mockPost).toHaveBeenCalledWith(URL_CEK_STATUS, { invoiceId: 'inv-1' });
  });
});
