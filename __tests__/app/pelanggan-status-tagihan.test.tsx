import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent } from '@testing-library/react-native';
import React from 'react';

import { renderDenganQuery, selesaikanJanji } from '../fixtures/portalPelanggan';

/**
 * Enum `InvoiceStatus` server: DRAFT, SENT, OVERDUE, PAID, PARTIAL_PAID,
 * CANCELLED. Tagihan dan Riwayat dulu hanya mengenal tiga status pertama yang
 * dibayar, sementara filter "Gagal" keduanya mencari `VOID` yang tidak ada.
 */

const mockGet = jest.fn<(url: string) => Promise<{ data: unknown }>>();

jest.mock('@/services/api', () => ({ __esModule: true, default: { get: (url: string) => mockGet(url) } }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});
jest.mock('react-native-sse', () => jest.fn());
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
jest.mock('expo-image-picker', () => ({}));
jest.mock('@/utils/simpanQrisKeGaleri', () => ({ simpanQrisKeGaleri: jest.fn() }));
jest.mock('expo-web-browser', () => ({}));
jest.mock('@/services/TokenService', () => ({ TokenService: { getToken: jest.fn() } }));
jest.mock('@/services/TenantService', () => ({ TenantService: { getTenantUrl: jest.fn() } }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

import CustomerHistoryScreen from '../../app/(customer)/riwayat';

function tagihan(invoiceNumber: string, status: string) {
  return {
    id: invoiceNumber,
    invoiceNumber,
    status,
    totalAmount: 150000,
    remainingAmount: status === 'PARTIAL_PAID' ? 50000 : 0,
    items: [{ description: `Internet ${invoiceNumber}` }],
    issueDate: '2026-10-01T00:00:00.000Z',
    dueDate: '2026-10-10T00:00:00.000Z',
    createdAt: '2026-10-01T00:00:00.000Z',
    lastPayment: null,
  };
}

const DAFTAR_TAGIHAN = [tagihan('INV-LUNAS', 'PAID'), tagihan('INV-BATAL', 'CANCELLED'), tagihan('INV-SEBAGIAN', 'PARTIAL_PAID')];

beforeEach(() => {
  mockGet.mockImplementation(async (url) =>
    url.startsWith('/api/customer/invoices')
      ? { data: { success: true, data: { invoices: DAFTAR_TAGIHAN } } }
      : { data: { success: true, data: [] } },
  );
});

async function renderLayar(Layar: React.ComponentType) {
  const layar = renderDenganQuery(<Layar />);
  await selesaikanJanji();
  return layar;
}

describe.each([['Riwayat', CustomerHistoryScreen, 'Menunggu']])('status tagihan di layar %s', (_nama, Layar, labelChipTerutang) => {
  it('menampilkan label Indonesia, bukan kode mentah atau "Gagal"', async () => {
    const layar = await renderLayar(Layar);

    expect(layar.getByText('Dibayar Sebagian')).toBeTruthy();
    expect(layar.queryByText('CANCELLED')).toBeNull();
    expect(layar.queryByText('PARTIAL_PAID')).toBeNull();
    expect(layar.queryByText('Gagal')).toBeNull();
  });

  it('chip "Dibatalkan" menyaring tagihan CANCELLED', async () => {
    const layar = await renderLayar(Layar);

    // Chip filter dirender di atas daftar, jadi kemunculan pertama adalah chip.
    fireEvent.press(layar.getAllByText('Dibatalkan')[0]);

    expect(layar.getByText(/#INV-BATAL/)).toBeTruthy();
    expect(layar.queryByText(/#INV-LUNAS/)).toBeNull();
    expect(layar.queryByText(/#INV-SEBAGIAN/)).toBeNull();
    expect(layar.getAllByText('Dibatalkan')).toHaveLength(2);
  });

  it('tagihan yang baru dibayar sebagian tetap termasuk yang belum lunas', async () => {
    const layar = await renderLayar(Layar);

    fireEvent.press(layar.getByText(labelChipTerutang));

    expect(layar.getByText(/#INV-SEBAGIAN/)).toBeTruthy();
    expect(layar.queryByText(/#INV-LUNAS/)).toBeNull();
    expect(layar.queryByText(/#INV-BATAL/)).toBeNull();
  });
});
