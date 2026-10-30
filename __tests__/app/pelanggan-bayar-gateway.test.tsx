import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { shouldRetryMutation } from '@/lib/queryErrorReporting';
import { galatHttp, selesaikanJanji } from '../fixtures/portalPelanggan';

/**
 * Aplikasi dulu selalu membuka halaman gateway setelah checkout dibuat, tidak
 * menyediakan ganti metode selama checkout menunggu, dan mengulang POST
 * pembayaran yang dijawab 5xx sehingga satu ketukan bisa membuat dua checkout.
 */

const mockGet = jest.fn<(url: string) => Promise<{ data: unknown }>>();
const mockPost = jest.fn<(url: string, body: unknown) => Promise<{ status: number; data: unknown }>>();
const mockBukaBrowser = jest.fn(async () => ({}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: (url: string) => mockGet(url), post: (url: string, body: unknown) => mockPost(url, body) },
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));
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
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: (...args: unknown[]) => mockBukaBrowser(...(args as [])),
  WebBrowserPresentationStyle: { PAGE_SHEET: 'pageSheet' },
}));
jest.mock('@/services/TokenService', () => ({ TokenService: { getToken: jest.fn() } }));
jest.mock('@/services/TenantService', () => ({ TenantService: { getTenantUrl: jest.fn() } }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

import CustomerTagihanScreen from '../../app/(customer)/tagihan';

const METODE = [
  { id: 'BC', name: 'BCA Virtual Account', provider: 'Duitku', type: 'VA', code: 'BC', group: 'Virtual Account' },
  { id: 'SP', name: 'QRIS', provider: 'Duitku', type: 'QRIS', code: 'SP', group: 'E-Wallet & QRIS' },
];

function tagihan(lastPayment: Record<string, unknown> | null) {
  return {
    id: 'inv-1',
    invoiceNumber: 'INV-1',
    status: 'OVERDUE',
    totalAmount: 11100,
    remainingAmount: 11100,
    items: [{ description: 'Internet' }],
    dueDate: '2026-10-30T00:00:00.000Z',
    createdAt: '2026-10-01T00:00:00.000Z',
    lastPayment,
  };
}

const CHECKOUT_QRIS = {
  amount: 11100,
  date: '2026-10-30T00:00:00.000Z',
  method: 'Duitku',
  gatewayStatus: 'PENDING',
  gatewayProvider: 'SP',
  paymentUrl: 'https://sandbox.duitku.com/bayar',
  qrString: '000201QRIS',
  vaNumber: null,
  expiresAt: '2099-01-01T00:00:00.000Z',
};

function siapkanTagihan(lastPayment: Record<string, unknown> | null) {
  mockGet.mockImplementation(async (url) =>
    url.startsWith('/api/customer/invoices')
      ? { data: { success: true, data: { invoices: [tagihan(lastPayment)] } } }
      : { data: { success: true, data: METODE } },
  );
}

async function renderLayar() {
  // Aturan retry mutasi yang sama dengan aplikasi, agar pengulangan POST terlihat.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: shouldRetryMutation, retryDelay: 0, gcTime: 0 } },
  });
  const layar = render(
    <QueryClientProvider client={client}>
      <CustomerTagihanScreen />
    </QueryClientProvider>,
  );
  await selesaikanJanji();
  return layar;
}

beforeEach(() => {
  mockPost.mockReset();
  mockBukaBrowser.mockClear();
});

describe('pembayaran gateway di aplikasi pelanggan', () => {
  it('checkout QRIS yang menunggu ditampilkan di aplikasi', async () => {
    siapkanTagihan(CHECKOUT_QRIS);
    const layar = await renderLayar();

    expect(layar.getByText('QR:000201QRIS')).toBeTruthy();
    expect(mockBukaBrowser).not.toHaveBeenCalled();
  });

  it('checkout yang menunggu bisa diganti metodenya', async () => {
    siapkanTagihan(CHECKOUT_QRIS);
    mockPost.mockResolvedValue({ status: 200, data: { success: true, data: { vaNumber: '7007', paymentUrl: 'https://gw' } } });
    const layar = await renderLayar();

    fireEvent.press(layar.getByText('Ganti Metode Pembayaran'));
    fireEvent.press(layar.getByText('BCA Virtual Account'));
    fireEvent.press(layar.getByText('Konfirmasi & Bayar'));
    await selesaikanJanji();

    expect(mockPost).toHaveBeenCalledWith('/api/customer/payments', expect.objectContaining({ invoiceIds: ['inv-1'], paymentMethod: 'BC' }));
  });

  it('checkout baru dengan nomor VA tidak membuka halaman gateway', async () => {
    siapkanTagihan(null);
    mockPost.mockResolvedValue({ status: 200, data: { success: true, data: { vaNumber: '7007', paymentUrl: 'https://gw' } } });
    const layar = await renderLayar();

    fireEvent.press(layar.getByText('Bayar Sekarang'));
    fireEvent.press(layar.getByText('Konfirmasi & Bayar'));
    await selesaikanJanji();

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockBukaBrowser).not.toHaveBeenCalled();
  });

  it('POST pembayaran yang dijawab 5xx tidak diulang', async () => {
    siapkanTagihan(null);
    mockPost.mockRejectedValue(galatHttp(502, 'Gagal menghubungi payment gateway.'));
    const layar = await renderLayar();

    fireEvent.press(layar.getByText('Bayar Sekarang'));
    fireEvent.press(layar.getByText('Konfirmasi & Bayar'));
    await selesaikanJanji();

    expect(mockPost).toHaveBeenCalledTimes(1);
  });
});
