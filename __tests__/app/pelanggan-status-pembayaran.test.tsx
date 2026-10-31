import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent } from '@testing-library/react-native';
import React from 'react';

import { galatHttp, renderDenganQuery, selesaikanJanji, toastTerakhir } from '../fixtures/portalPelanggan';
import { buatTagihan, CHECKOUT_MANUAL, CHECKOUT_QRIS, jawabanServer } from '../fixtures/tagihanPelanggan';

/**
 * "Saya Sudah Bayar, Cek Status" dulu hanya memuat ulang daftar tagihan (dan
 * saat offline menyebut "Pembayaran belum kami terima"), dan setiap status
 * FAILED dari SSE disebut "transfer manual Anda ditolak oleh Admin", juga
 * untuk kegagalan gateway dan pembatalan karena ganti metode.
 */

type Pendengar = (event: { data?: string }) => void;
const mockPendengarSse: Record<string, Pendengar> = {};
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
jest.mock('react-native-sse', () =>
  jest.fn(() => ({
    addEventListener: (nama: string, pendengar: Pendengar) => {
      mockPendengarSse[nama] = pendengar;
    },
    close: jest.fn(),
  })),
);
jest.mock('react-native-qrcode-svg', () => {
  const { Text } = require('react-native');
  return ({ value }: { value: string }) => <Text>{`QR:${value}`}</Text>;
});
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
jest.mock('expo-image-picker', () => ({}));
jest.mock('@/utils/simpanQrisKeGaleri', () => ({ simpanQrisKeGaleri: jest.fn() }));
jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: jest.fn() }));
jest.mock('@/services/TokenService', () => ({ TokenService: { getToken: jest.fn() } }));
jest.mock('@/services/TenantService', () => ({ TenantService: { getTenantUrl: jest.fn() } }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

import CustomerTagihanScreen from '../../app/(customer)/tagihan';

const URL_CEK_STATUS = '/api/customer/payments/check-status';

function jawabCekStatus(status: string) {
  mockPost.mockResolvedValue({ status: 200, data: { success: true, data: { status } } });
}

async function renderLayar() {
  const layar = renderDenganQuery(<CustomerTagihanScreen />);
  await selesaikanJanji();
  return layar;
}

async function tekanCekStatus(layar: Awaited<ReturnType<typeof renderLayar>>) {
  fireEvent.press(layar.getByText('Saya Sudah Bayar, Cek Status'));
  await selesaikanJanji();
}

async function kirimSse(muatan: Record<string, unknown>) {
  act(() => mockPendengarSse.message({ data: JSON.stringify(muatan) }));
  await selesaikanJanji();
}

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockGet.mockImplementation(jawabanServer([buatTagihan({ lastPayment: CHECKOUT_QRIS })]));
});

describe('Saya Sudah Bayar, Cek Status', () => {
  it('menanyakan checkout ke gateway lalu menampilkan lembar sukses bila sudah lunas', async () => {
    jawabCekStatus('PAID');
    const layar = await renderLayar();

    mockGet.mockImplementation(jawabanServer([buatTagihan({ status: 'PAID', lastPayment: { ...CHECKOUT_QRIS, gatewayStatus: 'PAID' } })]));
    await tekanCekStatus(layar);

    expect(mockPost).toHaveBeenCalledWith(URL_CEK_STATUS, { invoiceId: 'inv-1' });
    expect(layar.getByText('Pembayaran Berhasil')).toBeTruthy();
  });

  // Server sudah menyatakan lunas, tetapi daftar yang dimuat ulang belum
  // (pelunasan masih berjalan): pelanggan tidak boleh disebut belum membayar.
  it('gateway menyatakan lunas walau daftar belum: tidak disebut belum diterima', async () => {
    jawabCekStatus('PAID');
    const layar = await renderLayar();

    await tekanCekStatus(layar);

    expect(toastTerakhir()?.text2).toMatch(/sudah kami terima/);
    expect(toastTerakhir()?.text2).not.toMatch(/belum kami terima/);
  });

  it('checkout yang masih menunggu: pelanggan diminta menunggu sebentar', async () => {
    jawabCekStatus('PENDING');
    const layar = await renderLayar();

    await tekanCekStatus(layar);

    expect(toastTerakhir()?.text2).toMatch(/belum kami terima/);
  });

  it('tanpa internet: pelanggan diberi tahu, bukan disebut belum membayar', async () => {
    mockPost.mockRejectedValue(new Error('No Internet connection'));
    const layar = await renderLayar();

    await tekanCekStatus(layar);

    expect(toastTerakhir()?.text2).toMatch(/^Tidak ada koneksi internet/);
  });

  it('server lama tanpa endpoint cek status tetap memuat ulang tagihan', async () => {
    mockPost.mockRejectedValue(galatHttp(404, 'Not found'));
    const layar = await renderLayar();

    await tekanCekStatus(layar);

    expect(toastTerakhir()?.text2).toMatch(/belum kami terima/);
  });

  it('checkout yang kedaluwarsa di gateway diberi tahu', async () => {
    jawabCekStatus('EXPIRED');
    const layar = await renderLayar();

    mockGet.mockImplementation(jawabanServer([buatTagihan({ lastPayment: { ...CHECKOUT_QRIS, gatewayStatus: 'EXPIRED' } })]));
    await tekanCekStatus(layar);

    expect(toastTerakhir()?.text2).toMatch(/Waktu pembayaran habis/);
  });
});

describe('status akhir dari SSE', () => {
  it('transfer manual yang ditolak menyebut alasan admin', async () => {
    mockGet.mockImplementation(jawabanServer([buatTagihan({ lastPayment: CHECKOUT_MANUAL })]));
    await renderLayar();

    mockGet.mockImplementation(
      jawabanServer([buatTagihan({ lastPayment: { ...CHECKOUT_MANUAL, gatewayStatus: 'FAILED', rejectionReason: 'Nominal tidak sesuai' } })]),
    );
    await kirimSse({ status: 'FAILED', gatewayStatus: 'FAILED' });

    expect(toastTerakhir()).toMatchObject({ text1: 'Bukti Transfer Ditolak', text2: 'Alasan: Nominal tidak sesuai' });
  });

  it('kegagalan gateway tidak disebut ditolak admin', async () => {
    await renderLayar();

    mockGet.mockImplementation(jawabanServer([buatTagihan({ lastPayment: { ...CHECKOUT_QRIS, gatewayStatus: 'FAILED' } })]));
    await kirimSse({ status: 'FAILED', gatewayStatus: 'FAILED' });

    expect(toastTerakhir()?.text2).toMatch(/Pembayaran tidak berhasil/);
    expect(toastTerakhir()?.text2).not.toMatch(/Admin/);
  });

  it('checkout yang dibatalkan karena ganti metode tidak memunculkan pesan gagal', async () => {
    const Toast = jest.requireMock('react-native-toast-message') as { show: jest.Mock };
    await renderLayar();
    Toast.show.mockClear();

    await kirimSse({ status: 'FAILED', gatewayStatus: 'CANCELLED' });

    expect(Toast.show).not.toHaveBeenCalled();
  });
});
