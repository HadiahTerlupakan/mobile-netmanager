import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent } from '@testing-library/react-native';
import React from 'react';

import { renderDenganQuery, selesaikanJanji } from '../fixtures/portalPelanggan';
import { buatTagihan, CHECKOUT_QRIS, jawabanServer } from '../fixtures/tagihanPelanggan';

/**
 * Checkout yang lewat batas waktunya dulu tetap menampilkan QR/VA lama dan
 * "Nominal yang harus dibayar (tepat)", dengan lencana "Sisa Kadaluarsa".
 */

const mockGet = jest.fn<(url: string) => Promise<{ data: unknown }>>();
const mockSumberSse = jest.fn(() => ({ addEventListener: jest.fn(), close: jest.fn() }));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: (url: string) => mockGet(url), post: jest.fn() },
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }), useFocusEffect: jest.fn() }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});
jest.mock('react-native-sse', () => (...args: unknown[]) => mockSumberSse(...(args as [])));
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

const QRIS_KEDALUWARSA = { ...CHECKOUT_QRIS, expiresAt: '2020-01-01T00:00:00.000Z' };

async function renderLayar() {
  const layar = renderDenganQuery(<CustomerTagihanScreen />);
  await selesaikanJanji();
  return layar;
}

beforeEach(() => {
  mockSumberSse.mockClear();
  mockGet.mockImplementation(jawabanServer([buatTagihan({ lastPayment: QRIS_KEDALUWARSA })]));
});

describe('checkout yang kedaluwarsa', () => {
  it('menyembunyikan QRIS dan nominal lama, lalu menawarkan pilih metode lagi', async () => {
    const layar = await renderLayar();

    expect(layar.getByText('Waktu Pembayaran Habis')).toBeTruthy();
    expect(layar.getByText('Pilih Metode Lagi')).toBeTruthy();
    expect(layar.queryByText('QR:000201QRIS')).toBeNull();
    expect(layar.queryByText('Rp 11.100')).toBeNull();
    expect(layar.queryByText(/Sisa/)).toBeNull();
    expect(layar.queryByText('Saya Sudah Bayar, Cek Status')).toBeNull();
  });

  it('"Pilih Metode Lagi" membuka pilihan metode tanpa peringatan VA lama masih bisa dibayar', async () => {
    const layar = await renderLayar();

    fireEvent.press(layar.getByText('Pilih Metode Lagi'));

    expect(layar.getByText('Konfirmasi & Bayar')).toBeTruthy();
    expect(layar.queryByText(/Bayar hanya yang baru/)).toBeNull();
  });

  it('tidak membuka koneksi status untuk checkout yang sudah lewat batas', async () => {
    await renderLayar();

    expect(mockSumberSse).not.toHaveBeenCalled();
  });

  it('checkout yang masih berjalan tetap menampilkan sisa waktunya', async () => {
    mockGet.mockImplementation(jawabanServer([buatTagihan({ lastPayment: CHECKOUT_QRIS })]));

    const layar = await renderLayar();

    expect(layar.getByText('Selesaikan Pembayaran')).toBeTruthy();
    expect(layar.getByText(/^Sisa \d+:\d\d:\d\d$/)).toBeTruthy();
    expect(mockSumberSse).toHaveBeenCalled();
  });
});
