import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import { Alert, type AlertButton } from 'react-native';

import { galatHttp, renderDenganQuery, selesaikanJanji, toastTerakhir } from '../fixtures/portalPelanggan';
import { buatTagihan, CHECKOUT_MANUAL, jawabanServer } from '../fixtures/tagihanPelanggan';

/**
 * Transfer manual yang menunggu dulu tidak bisa dibatalkan atau diganti
 * metodenya, bukti yang sudah terkirim tidak bisa diganti, bukti hanya bisa
 * dipilih dari galeri dengan pemotongan paksa, dan penolakan admin tidak
 * pernah dijelaskan kepada pelanggan.
 */

const mockGet = jest.fn<(url: string) => Promise<{ data: unknown }>>();
const mockPost = jest.fn<(url: string, body?: unknown, config?: unknown) => Promise<{ status: number; data: unknown }>>();
const mockKamera = jest.fn<(opsi: unknown) => Promise<unknown>>();

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: (url: string) => mockGet(url),
    post: (url: string, body?: unknown, config?: unknown) => mockPost(url, body, config),
  },
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }), useFocusEffect: jest.fn() }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});
jest.mock('react-native-sse', () => jest.fn(() => ({ addEventListener: jest.fn(), close: jest.fn() })));
jest.mock('react-native-qrcode-svg', () => () => null);
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: async () => ({ granted: true }),
  launchCameraAsync: (opsi: unknown) => mockKamera(opsi),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('@/utils/perkecilFoto', () => ({ perkecilFoto: jest.fn() }));
jest.mock('@/utils/simpanQrisKeGaleri', () => ({ simpanQrisKeGaleri: jest.fn() }));
jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: jest.fn() }));
jest.mock('@/services/TokenService', () => ({ TokenService: { getToken: jest.fn() } }));
jest.mock('@/services/TenantService', () => ({ TenantService: { getTenantUrl: jest.fn() } }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

import CustomerTagihanScreen from '../../app/(customer)/tagihan';

const URL_BATAL = '/api/customer/payments/cancel';
const URL_UNGGAH = '/api/customer/payments/upload-receipt';

/** Tekan tombol berlabel `teks` pada Alert berikutnya. */
function pilihDiAlert(teks: string) {
  jest.spyOn(Alert, 'alert').mockImplementationOnce((_judul, _pesan, tombol?: AlertButton[]) => {
    tombol?.find((item) => item.text === teks)?.onPress?.();
  });
}

async function renderLayar() {
  const layar = renderDenganQuery(<CustomerTagihanScreen />);
  await selesaikanJanji();
  return layar;
}

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockGet.mockImplementation(jawabanServer([buatTagihan({ lastPayment: CHECKOUT_MANUAL })]));
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('transfer manual yang menunggu', () => {
  it('menampilkan rekening tujuan dengan tombol salin yang berlabel', async () => {
    const layar = await renderLayar();

    expect(layar.getByText('PT Radpro')).toBeTruthy();
    expect(layar.getByLabelText('Salin Nomor Rekening')).toBeTruthy();
    expect(layar.getByLabelText('Salin Nominal Transfer')).toBeTruthy();
  });

  it('"Batalkan / Ganti Metode" membatalkan checkout lalu membuka pilihan metode', async () => {
    mockPost.mockResolvedValue({ status: 200, data: { success: true } });
    const layar = await renderLayar();

    mockGet.mockImplementation(jawabanServer([buatTagihan({ lastPayment: { ...CHECKOUT_MANUAL, gatewayStatus: 'CANCELLED' } })]));
    pilihDiAlert('Batalkan');
    fireEvent.press(layar.getByText('Batalkan / Ganti Metode'));
    await selesaikanJanji();

    expect(mockPost).toHaveBeenCalledWith(URL_BATAL, { invoiceId: 'inv-1' }, undefined);
    expect(layar.getByText('Konfirmasi & Bayar')).toBeTruthy();
    expect(layar.queryByText('Batalkan / Ganti Metode')).toBeNull();
  });

  it('pembatalan yang ditolak server menampilkan alasannya', async () => {
    mockPost.mockRejectedValue(galatHttp(409, 'Transfer ini sudah diverifikasi admin.'));
    const layar = await renderLayar();

    pilihDiAlert('Batalkan');
    fireEvent.press(layar.getByText('Batalkan / Ganti Metode'));
    await selesaikanJanji();

    expect(toastTerakhir()?.text2).toBe('Transfer ini sudah diverifikasi admin.');
  });

  it('bukti yang belum diverifikasi bisa diganti', async () => {
    mockGet.mockImplementation(jawabanServer([buatTagihan({ lastPayment: { ...CHECKOUT_MANUAL, receiptUrl: '/uploads/bukti.jpg' } })]));
    const layar = await renderLayar();

    expect(layar.getByText('Menunggu Verifikasi Admin')).toBeTruthy();
    expect(layar.getByText('Ganti Bukti Transfer')).toBeTruthy();
  });

  it('bukti bisa difoto dari kamera dan dikirim dengan MIME aslinya', async () => {
    const tambah = jest.spyOn(FormData.prototype, 'append');
    mockKamera.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///dcim/IMG_9.jpg', fileName: 'IMG_9.jpg', mimeType: 'image/jpeg', width: 1080, fileSize: 300_000 }],
    });
    mockPost.mockResolvedValue({ status: 200, data: { success: true, data: { receiptUrl: '/uploads/x.jpg' } } });
    const layar = await renderLayar();

    pilihDiAlert('Ambil Foto');
    fireEvent.press(layar.getByText('Unggah Bukti Transfer'));
    await selesaikanJanji();

    expect(mockPost).toHaveBeenCalledWith(URL_UNGGAH, expect.any(FormData), expect.anything());
    expect(tambah).toHaveBeenCalledWith('invoiceId', 'inv-1');
    expect(tambah).toHaveBeenCalledWith('file', { uri: 'file:///dcim/IMG_9.jpg', name: 'IMG_9.jpg', type: 'image/jpeg' });
  });
});

describe('transfer manual yang ditolak', () => {
  it('menampilkan alasan admin dan pelanggan bisa membayar lagi', async () => {
    mockGet.mockImplementation(
      jawabanServer([buatTagihan({ lastPayment: { ...CHECKOUT_MANUAL, gatewayStatus: 'FAILED', rejectionReason: 'Nominal kurang' } })]),
    );

    const layar = await renderLayar();

    expect(layar.getByText('Bukti transfer ditolak')).toBeTruthy();
    expect(layar.getByText('Alasan: Nominal kurang')).toBeTruthy();
    expect(layar.getByText('Bayar Sekarang')).toBeTruthy();
  });
});
