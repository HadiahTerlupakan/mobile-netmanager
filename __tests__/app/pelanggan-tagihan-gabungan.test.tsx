import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act } from '@testing-library/react-native';
import React from 'react';

import { renderDenganQuery, selesaikanJanji } from '../fixtures/portalPelanggan';
import { buatTagihan, CHECKOUT_MANUAL, CHECKOUT_QRIS, jawabanServer } from '../fixtures/tagihanPelanggan';

/**
 * Satu checkout bisa mencakup beberapa tagihan; tiap tagihan menyimpan
 * bagiannya sendiri di `lastPayment.amount`. Layar dulu menampilkan bagian
 * satu tagihan sebagai nominal yang harus ditransfer "tepat", dan memuat
 * `?limit=20` tanpa filter status sehingga tagihan lama yang belum dibayar
 * bisa tidak terhitung.
 */

const mockGet = jest.fn<(url: string) => Promise<{ data: unknown }>>();
const mockPost = jest.fn<(url: string, body?: unknown) => Promise<{ status: number; data: unknown }>>();
let mockEfekFokus: (() => void) | undefined;

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: (url: string) => mockGet(url),
    post: (url: string, body?: unknown) => mockPost(url, body),
  },
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useFocusEffect: (efek: () => void) => {
    mockEfekFokus = efek;
  },
}));
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

const URL_TAGIHAN_TERBUKA = '/api/customer/invoices?status=SENT,OVERDUE,PARTIAL_PAID&limit=50';

/** Checkout VA untuk INV-1 (Rp 11.100) dan INV-2 (Rp 22.200), dibuat sekaligus. */
const CHECKOUT_GABUNGAN = {
  ...CHECKOUT_QRIS,
  gatewayProvider: 'BC',
  qrString: null,
  vaNumber: '7007014001',
  checkoutId: 'co-1',
  checkoutTotal: 33300,
  checkoutInvoiceNumbers: ['INV-1', 'INV-2'],
};

function tagihanGabungan(pembayaran: Record<string, unknown>, status = 'OVERDUE') {
  return [
    buatTagihan({ status, lastPayment: { ...pembayaran, amount: 11100 } }),
    buatTagihan({ id: 'inv-2', invoiceNumber: 'INV-2', status, totalAmount: 22200, remainingAmount: 22200, lastPayment: { ...pembayaran, amount: 22200 } }),
  ];
}

async function renderLayar() {
  const layar = renderDenganQuery(<CustomerTagihanScreen />);
  await selesaikanJanji();
  return layar;
}

async function fokuskanUlang() {
  act(() => mockEfekFokus?.());
  await selesaikanJanji();
}

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
});

describe('tagihan terbuka', () => {
  it('memuat semua tagihan terbuka lewat filter status, termasuk yang terbit lama', async () => {
    const tagihanLunasTerbaru = Array.from({ length: 20 }, (_, i) =>
      buatTagihan({ id: `lunas-${i}`, invoiceNumber: `LUNAS-${i}`, status: 'PAID', remainingAmount: 0 }),
    );
    mockGet.mockImplementation(jawabanServer([...tagihanLunasTerbaru, buatTagihan({ invoiceNumber: 'INV-LAMA' })]));

    const layar = await renderLayar();

    expect(mockGet).toHaveBeenCalledWith(URL_TAGIHAN_TERBUKA);
    expect(layar.getByText('Rp 11.100')).toBeTruthy();
    expect(layar.getByText('Bayar Sekarang')).toBeTruthy();
  });
});

describe('nominal checkout gabungan', () => {
  it('VA menampilkan total seluruh checkout dan nomor semua tagihannya', async () => {
    mockGet.mockImplementation(jawabanServer(tagihanGabungan(CHECKOUT_GABUNGAN)));

    const layar = await renderLayar();

    expect(layar.getByText('Rp 33.300')).toBeTruthy();
    expect(layar.queryByText('Rp 11.100')).toBeNull();
    expect(layar.getByText(/#INV-1, #INV-2/)).toBeTruthy();
  });

  it('transfer manual meminta total seluruh checkout', async () => {
    const manualGabungan = { ...CHECKOUT_MANUAL, checkoutId: 'co-2', checkoutTotal: 33300, checkoutInvoiceNumbers: ['INV-1', 'INV-2'] };
    mockGet.mockImplementation(jawabanServer(tagihanGabungan(manualGabungan)));

    const layar = await renderLayar();

    expect(layar.getByText('Nominal Transfer (Transfer Tepat!)')).toBeTruthy();
    expect(layar.getByText('Rp 33.300')).toBeTruthy();
  });

  it('server lama tanpa checkoutTotal memakai nominal pembayaran itu sendiri', async () => {
    mockGet.mockImplementation(jawabanServer([buatTagihan({ lastPayment: CHECKOUT_QRIS })]));

    const layar = await renderLayar();

    expect(layar.getByText('Rp 11.100')).toBeTruthy();
  });
});

describe('lembar pembayaran berhasil', () => {
  it('menyebut total yang dibayar untuk checkout dan semua nomor tagihannya', async () => {
    mockGet.mockImplementation(jawabanServer(tagihanGabungan(CHECKOUT_GABUNGAN)));
    const layar = await renderLayar();

    // Tagihan lunas keluar dari daftar terbuka; hanya daftar terbaru yang memuatnya.
    mockGet.mockImplementation(jawabanServer(tagihanGabungan({ ...CHECKOUT_GABUNGAN, gatewayStatus: 'PAID' }, 'PAID')));
    await fokuskanUlang();

    expect(layar.getByText('Pembayaran Berhasil')).toBeTruthy();
    expect(layar.getByText('Rp 33.300')).toBeTruthy();
    expect(layar.getByText('#INV-1, #INV-2')).toBeTruthy();
  });

  it('memakai total setelah diskon kupon', async () => {
    const denganKupon = { ...CHECKOUT_GABUNGAN, checkoutTotal: 29970 };
    mockGet.mockImplementation(jawabanServer(tagihanGabungan(denganKupon)));
    const layar = await renderLayar();

    mockGet.mockImplementation(jawabanServer(tagihanGabungan({ ...denganKupon, gatewayStatus: 'PAID' }, 'PAID')));
    await fokuskanUlang();

    expect(layar.getByText('Rp 29.970')).toBeTruthy();
  });

  it('tagihan yang dibatalkan saat checkout menunggu tidak disebut lunas', async () => {
    mockGet.mockImplementation(jawabanServer([buatTagihan({ lastPayment: CHECKOUT_QRIS })]));
    const layar = await renderLayar();

    mockGet.mockImplementation(jawabanServer([buatTagihan({ status: 'CANCELLED', lastPayment: { ...CHECKOUT_QRIS, gatewayStatus: 'CANCELLED' } })]));
    await fokuskanUlang();

    expect(layar.queryByText('Pembayaran Berhasil')).toBeNull();
  });
});
