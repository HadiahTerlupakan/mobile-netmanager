import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';

import { renderDenganQuery, selesaikanJanji } from '../fixtures/portalPelanggan';
import { buatTagihan, jawabanServer } from '../fixtures/tagihanPelanggan';

/**
 * Saldo kredit (kelebihan bayar, prorate) memotong tagihan berikutnya saat
 * terbit; tagihan yang habis terpotong bernominal Rp 0 tetapi berstatus
 * SENT, dan dulu tampil sebagai "Belum Bayar Rp 0" serta ikut terhitung
 * sebagai tagihan yang belum dibayar.
 */

const mockGet = jest.fn<(url: string) => Promise<{ data: unknown }>>();

jest.mock('@/services/api', () => ({ __esModule: true, default: { get: (url: string) => mockGet(url), post: jest.fn() } }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }), useFocusEffect: jest.fn() }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});
jest.mock('react-native-sse', () => jest.fn(() => ({ addEventListener: jest.fn(), close: jest.fn() })));
jest.mock('react-native-qrcode-svg', () => () => null);
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
jest.mock('expo-image-picker', () => ({}));
jest.mock('@/utils/simpanQrisKeGaleri', () => ({ simpanQrisKeGaleri: jest.fn() }));
jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: jest.fn() }));
jest.mock('@/services/TokenService', () => ({ TokenService: { getToken: jest.fn() } }));
jest.mock('@/services/TenantService', () => ({ TenantService: { getTenantUrl: jest.fn() } }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

import CustomerHistoryScreen from '../../app/(customer)/riwayat';
import CustomerTagihanScreen from '../../app/(customer)/tagihan';

const TAGIHAN_TERTUTUP_SALDO = buatTagihan({ id: 'inv-0', invoiceNumber: 'INV-NOL', status: 'SENT', totalAmount: 0, remainingAmount: 0 });

async function renderLayar(Layar: React.ComponentType) {
  const layar = renderDenganQuery(<Layar />);
  await selesaikanJanji();
  return layar;
}

beforeEach(() => {
  mockGet.mockReset();
});

describe('saldo kredit di layar Tagihan', () => {
  it('ringkasan tagihan menyebut saldo kredit pelanggan', async () => {
    mockGet.mockImplementation(jawabanServer([buatTagihan()], { profil: { saldoKredit: 50000 } }));

    const layar = await renderLayar(CustomerTagihanScreen);

    expect(layar.getByText(/Saldo kredit Rp 50\.000/)).toBeTruthy();
  });

  it('tanpa saldo kredit tidak menyebut saldo', async () => {
    mockGet.mockImplementation(jawabanServer([buatTagihan()], { profil: { saldoKredit: 0 } }));

    const layar = await renderLayar(CustomerTagihanScreen);

    expect(layar.queryByText(/Saldo kredit/)).toBeNull();
  });
});

describe('tagihan bernominal Rp 0', () => {
  it('tidak terhitung sebagai tagihan yang belum dibayar', async () => {
    mockGet.mockImplementation(jawabanServer([TAGIHAN_TERTUTUP_SALDO, buatTagihan()]));

    const layar = await renderLayar(CustomerTagihanScreen);

    expect(layar.getByText('Total Tagihan')).toBeTruthy();
    expect(layar.queryByText(/Total 2 Tagihan/)).toBeNull();
  });

  it('satu-satunya tagihan terbuka bernominal Rp 0: tidak ada tunggakan', async () => {
    mockGet.mockImplementation(jawabanServer([TAGIHAN_TERTUTUP_SALDO]));

    const layar = await renderLayar(CustomerTagihanScreen);

    expect(layar.getByText('Tidak ada tagihan tertunggak')).toBeTruthy();
    expect(layar.queryByText('Bayar Sekarang')).toBeNull();
  });

  it('Riwayat tidak menyebutnya "Belum Bayar"', async () => {
    mockGet.mockImplementation(jawabanServer([TAGIHAN_TERTUTUP_SALDO]));

    const layar = await renderLayar(CustomerHistoryScreen);

    expect(layar.getByText(/#INV-NOL/)).toBeTruthy();
    expect(layar.queryByText('Belum Bayar')).toBeNull();
    expect(layar.getByText('Lunas')).toBeTruthy();
  });
});
