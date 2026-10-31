import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent } from '@testing-library/react-native';
import React from 'react';

import type { PaketPelanggan, PilihanUpgrade } from '@/types/portalPelanggan';
import { galatHttp, renderDenganQuery, selesaikanJanji, toastTerakhir } from '../fixtures/portalPelanggan';

const mockGet = jest.fn<(url: string) => Promise<{ data: unknown }>>();
const mockPost = jest.fn<(url: string, body?: unknown) => Promise<{ data: unknown }>>();
const mockDelete = jest.fn<(url: string) => Promise<{ data: unknown }>>();

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: (url: string) => mockGet(url),
    post: (url: string, body?: unknown) => mockPost(url, body),
    delete: (url: string) => mockDelete(url),
  },
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

import UpgradePaketScreen from '../../app/(customer)/upgrade-paket';

const URL_PAKET = '/api/customer/package';
const URL_UPGRADE = '/api/customer/package/upgrade';

function buatPilihan(id: string, nama: string, ubah: Partial<PilihanUpgrade> = {}): PilihanUpgrade {
  return { id, nama, harga: 250000, durasi: 1, durasiUnit: 'BULAN', isFeatured: false, priceDifference: 100000, bandwidth: null, ...ubah };
}

function sajikanPaket(ubah: Partial<PaketPelanggan> = {}) {
  mockGet.mockResolvedValue({
    data: {
      success: true,
      package: { id: 'pk-10', nama: 'Home 10 Mbps', harga: 150000, durasi: 1, durasiUnit: 'BULAN', bandwidth: null },
      subscription: { jatuhTempo: '2026-11-20T00:00:00.000Z', status: 'AKTIF' },
      pendingUpgrade: null,
      upgradeOptions: [
        buatPilihan('pk-20', 'Home 20 Mbps', { bandwidth: { nama: '20M', download: '20M', upload: '5M' } }),
        buatPilihan('pk-30', 'Home 30 Mbps', { harga: 300000, priceDifference: 150000, isFeatured: true }),
      ],
      ...ubah,
    },
  });
}

async function renderLayar() {
  const layar = renderDenganQuery(<UpgradePaketScreen />);
  await selesaikanJanji();
  return layar;
}

describe('upgrade paket pelanggan', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockDelete.mockReset();
  });

  it('menampilkan paket aktif dan memilih paket unggulan sejak awal', async () => {
    sajikanPaket();

    const layar = await renderLayar();

    expect(mockGet).toHaveBeenCalledWith(URL_PAKET);
    expect(layar.getByText('Home 10 Mbps')).toBeTruthy();
    expect(layar.getByText('Kecepatan 20M (20M turun / 5M naik)')).toBeTruthy();
    expect(layar.getByLabelText('Paket Home 30 Mbps').props.accessibilityState).toEqual({ selected: true });
    expect(layar.getByLabelText('Paket Home 20 Mbps').props.accessibilityState).toEqual({ selected: false });
  });

  it('mengajukan paket yang dipilih pelanggan lalu memuat ulang paket', async () => {
    sajikanPaket();
    mockPost.mockResolvedValue({ data: { success: true, data: {}, message: 'Pengajuan upgrade berhasil dijadwalkan' } });
    const layar = await renderLayar();

    fireEvent.press(layar.getByLabelText('Paket Home 20 Mbps'));
    fireEvent.press(layar.getByText('Ajukan Upgrade'));
    await selesaikanJanji();

    expect(mockPost).toHaveBeenCalledWith(URL_UPGRADE, { packageId: 'pk-20' });
    expect(toastTerakhir()?.text2).toBe('Pengajuan upgrade berhasil dijadwalkan');
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('penolakan server (409) ditampilkan dengan pesannya', async () => {
    sajikanPaket();
    mockPost.mockRejectedValue(galatHttp(409, 'Sudah ada pengajuan upgrade yang menunggu diterapkan'));
    const layar = await renderLayar();

    fireEvent.press(layar.getByText('Ajukan Upgrade'));
    await selesaikanJanji();

    expect(toastTerakhir()?.text2).toBe('Sudah ada pengajuan upgrade yang menunggu diterapkan');
  });

  it('pengajuan yang menunggu menyembunyikan tombol ajukan dan bisa dibatalkan', async () => {
    sajikanPaket({ pendingUpgrade: { id: 'pk-30', nama: 'Home 30 Mbps', applyAt: '2026-11-20T00:00:00.000Z' } });
    mockDelete.mockResolvedValue({ data: { success: true, data: { cancelled: true }, message: 'Pengajuan upgrade dibatalkan' } });
    const layar = await renderLayar();

    expect(layar.getByText('Pengajuan upgrade sedang diproses')).toBeTruthy();
    expect(layar.queryByText('Ajukan Upgrade')).toBeNull();
    fireEvent.press(layar.getByText('Batalkan Pengajuan'));
    await selesaikanJanji();

    expect(mockDelete).toHaveBeenCalledWith(URL_UPGRADE);
    expect(toastTerakhir()?.text2).toBe('Pengajuan upgrade dibatalkan');
  });

  it('tanpa pilihan upgrade menampilkan keterangan dan tanpa tombol ajukan', async () => {
    sajikanPaket({ upgradeOptions: [] });

    const layar = await renderLayar();

    expect(layar.getByText('Belum ada paket upgrade')).toBeTruthy();
    expect(layar.queryByText('Ajukan Upgrade')).toBeNull();
  });

  // Server menolak pengajuan dari pelanggan yang tidak AKTIF; tombolnya dulu
  // tetap tampil dan baru gagal setelah ditekan.
  it.each(['ISOLIR', 'NONAKTIF', 'MAINTENANCE'])('layanan %s: tombol ajukan diganti alasannya', async (status) => {
    sajikanPaket({ subscription: { jatuhTempo: '2026-11-20T00:00:00.000Z', status } });

    const layar = await renderLayar();

    expect(layar.queryByText('Ajukan Upgrade')).toBeNull();
    expect(layar.getByText('Upgrade bisa diajukan saat layanan Anda aktif.')).toBeTruthy();
  });

  it('pelanggan tanpa paket melihat pesan server', async () => {
    mockGet.mockRejectedValue(galatHttp(404, 'Paket langganan tidak ditemukan'));

    const layar = await renderLayar();

    expect(layar.getByText('Paket langganan tidak ditemukan')).toBeTruthy();
  });
});
