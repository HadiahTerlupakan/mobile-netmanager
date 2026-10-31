import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, within } from '@testing-library/react-native';
import React from 'react';
import { TouchableOpacity } from 'react-native';

import { renderDenganQuery, selesaikanJanji } from '../fixtures/portalPelanggan';
import { buatTagihan, jawabanServer } from '../fixtures/tagihanPelanggan';

/**
 * Baris Riwayat dulu tampil bisa ditekan tanpa berbuat apa pun, dan sisa
 * tagihan yang baru dibayar sebagian serta kapan dan dengan apa tagihan
 * dilunasi tidak pernah ditampilkan.
 */

const mockGet = jest.fn<(url: string) => Promise<{ data: unknown }>>();
const mockBack = jest.fn();

jest.mock('@/services/api', () => ({ __esModule: true, default: { get: (url: string) => mockGet(url) } }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: mockBack }), useFocusEffect: jest.fn() }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

import CustomerHistoryScreen from '../../app/(customer)/riwayat';

const PEMBAYARAN_TRANSFER = { amount: 150000, date: '2026-10-12T03:00:00.000Z', method: 'BANK_TRANSFER', gatewayStatus: 'PAID', accountId: 'acc-1' };

async function renderLayar() {
  const layar = renderDenganQuery(<CustomerHistoryScreen />);
  await selesaikanJanji();
  return layar;
}

beforeEach(() => {
  mockGet.mockReset();
});

describe('baris Riwayat', () => {
  it('tagihan yang dibayar sebagian menyebut sisanya', async () => {
    mockGet.mockImplementation(
      jawabanServer([buatTagihan({ invoiceNumber: 'INV-SEBAGIAN', status: 'PARTIAL_PAID', totalAmount: 150000, remainingAmount: 50000 })]),
    );

    const layar = await renderLayar();

    expect(layar.getByText('Sisa Rp 50.000')).toBeTruthy();
  });

  it('tagihan lunas menyebut tanggal dan cara pembayarannya', async () => {
    mockGet.mockImplementation(
      jawabanServer([buatTagihan({ invoiceNumber: 'INV-LUNAS', status: 'PAID', remainingAmount: 0, lastPayment: PEMBAYARAN_TRANSFER })]),
    );

    const layar = await renderLayar();

    expect(layar.getByText('Dibayar 12 Okt 2026 · Transfer Bank')).toBeTruthy();
  });

  it('pembayaran lewat gateway disebut pembayaran online', async () => {
    const pembayaranGateway = { ...PEMBAYARAN_TRANSFER, method: 'OTHER', accountId: null, gatewayProvider: 'BC' };
    mockGet.mockImplementation(jawabanServer([buatTagihan({ status: 'PAID', remainingAmount: 0, lastPayment: pembayaranGateway })]));

    const layar = await renderLayar();

    expect(layar.getByText('Dibayar 12 Okt 2026 · Pembayaran online')).toBeTruthy();
  });

  it('baris tidak tampil sebagai tombol', async () => {
    mockGet.mockImplementation(jawabanServer([buatTagihan({ invoiceNumber: 'INV-LUNAS', status: 'PAID', remainingAmount: 0 })]));

    const layar = await renderLayar();

    const tombol = layar.UNSAFE_queryAllByType(TouchableOpacity);
    expect(tombol.some((item) => within(item).queryByText(/#INV-LUNAS/))).toBe(false);
  });

  it('tombol kembali berlabel', async () => {
    mockGet.mockImplementation(jawabanServer([]));
    const layar = await renderLayar();

    fireEvent.press(layar.getByRole('button', { name: 'Kembali' }));

    expect(mockBack).toHaveBeenCalled();
  });
});
