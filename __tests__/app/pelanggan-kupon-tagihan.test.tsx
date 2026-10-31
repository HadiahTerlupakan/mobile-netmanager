import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent } from '@testing-library/react-native';
import React from 'react';

import { galatHttp, renderDenganQuery, selesaikanJanji } from '../fixtures/portalPelanggan';
import { buatTagihan, CHECKOUT_QRIS, jawabanServer } from '../fixtures/tagihanPelanggan';

/**
 * Aplikasi dulu memverifikasi kupon ke `/api/coupons/verify`, rute khusus staf
 * yang selalu 401 untuk token pelanggan. Interceptor API lalu menganggap sesi
 * habis dan mengeluarkan pelanggan ("Sesi Berakhir") hanya karena mengetik kupon.
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

const URL_KUPON_PELANGGAN = '/api/customer/coupons/verify';
const KUPON_SAH = { success: true, data: { valid: true, code: 'HEMAT10', discountAmount: 1110, finalAmount: 9990 } };

async function bukaPanelDanCekKupon(kode: string) {
  const layar = renderDenganQuery(<CustomerTagihanScreen />);
  await selesaikanJanji();
  fireEvent.press(layar.getByText('Bayar Sekarang'));
  fireEvent.changeText(layar.getByPlaceholderText('MASUKKAN KODE'), kode);
  fireEvent.press(layar.getByText('CEK'));
  await selesaikanJanji();
  return layar;
}

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockGet.mockImplementation(jawabanServer([buatTagihan()]));
});

describe('kupon di layar Tagihan', () => {
  it('diverifikasi ke endpoint pelanggan dengan kode dan total tagihan', async () => {
    mockPost.mockResolvedValue({ status: 200, data: KUPON_SAH });

    const layar = await bukaPanelDanCekKupon('hemat10');

    expect(mockPost).toHaveBeenCalledWith(URL_KUPON_PELANGGAN, { code: 'HEMAT10', amount: 11100 });
    expect(mockPost).not.toHaveBeenCalledWith('/api/coupons/verify', expect.anything());
    expect(layar.getByText('Diskon (HEMAT10)')).toBeTruthy();
    expect(layar.getByText('Rp 9.990')).toBeTruthy();
  });

  it.each(['Kupon tidak ditemukan', 'Kuota kupon habis', 'Kupon tidak aktif'])(
    'penolakan server "%s" ditampilkan di bawah isian kupon',
    async (pesan) => {
      mockPost.mockRejectedValue(galatHttp(400, pesan));

      const layar = await bukaPanelDanCekKupon('PROMO');

      expect(layar.getByText(pesan)).toBeTruthy();
      expect(layar.queryByText(/Diskon \(/)).toBeNull();
    },
  );

  it('pesan penolakan hilang saat kode diketik ulang', async () => {
    mockPost.mockRejectedValue(galatHttp(400, 'Kupon tidak ditemukan'));
    const layar = await bukaPanelDanCekKupon('PROMO');

    fireEvent.changeText(layar.getByPlaceholderText('MASUKKAN KODE'), 'PROMO2');

    expect(layar.queryByText('Kupon tidak ditemukan')).toBeNull();
  });

  // Ganti metode membuat checkout baru; tanpa kupon, pelanggan membayar penuh.
  it('kupon yang sudah dipakai tetap terpasang saat ganti metode', async () => {
    mockPost.mockImplementation(async (url) =>
      url === URL_KUPON_PELANGGAN
        ? { status: 200, data: KUPON_SAH }
        : { status: 200, data: { success: true, data: { vaNumber: '7007', paymentUrl: 'https://gw' } } },
    );
    const layar = await bukaPanelDanCekKupon('HEMAT10');

    mockGet.mockImplementation(jawabanServer([buatTagihan({ lastPayment: { ...CHECKOUT_QRIS, amount: 9990 } })]));
    fireEvent.press(layar.getByText('BCA Virtual Account'));
    fireEvent.press(layar.getByText('Konfirmasi & Bayar'));
    await selesaikanJanji();
    fireEvent.press(layar.getByText('Ganti Metode Pembayaran'));

    expect(layar.getByText('Diskon (HEMAT10)')).toBeTruthy();
    fireEvent.press(layar.getByText('QRIS'));
    fireEvent.press(layar.getByText('Konfirmasi & Bayar'));
    await selesaikanJanji();

    expect(mockPost).toHaveBeenLastCalledWith('/api/customer/payments', expect.objectContaining({ couponCode: 'HEMAT10', paymentMethod: 'SP' }));
  });
});
