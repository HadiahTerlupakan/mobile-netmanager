import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, waitFor } from '@testing-library/react-native';
// Dimuat sebelum testing-library-nya: router lebih dulu memakai mock
// `expo-linking` milik repo, bukan versi asli yang butuh modul native.
import 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import React from 'react';

/**
 * Pelanggan tidak pernah diminta izin notifikasi: pre-prompt hanya dipasang di
 * layout karyawan, dan sinkron token sengaja tidak memunculkan dialog sistem.
 * Di Android 13+ dan iOS izin itu tidak pernah diberikan, token FCM pelanggan
 * tidak pernah terdaftar, dan push tagihan tidak pernah sampai. Layout
 * pelanggan kini menjelaskan sekali, lalu meminta izin dan mendaftarkan token.
 */

const mockPerluTanya = jest.fn<() => Promise<boolean>>();
const mockCatatSudahDitanya = jest.fn<() => Promise<void>>();
const mockAktifkan = jest.fn<() => Promise<boolean>>();

jest.mock('@/services/izinNotifikasi', () => ({
  perluTanyaIzinNotifikasi: () => mockPerluTanya(),
  catatIzinNotifikasiSudahDitanya: () => mockCatatSudahDitanya(),
  aktifkanNotifikasi: () => mockAktifkan(),
}));
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'cust-1', role: 'CUSTOMER' } }),
}));
// `expo` dan `expo-modules-core` asli butuh modul native; router hanya
// menyentuh tiga fungsi ini dan `Platform` saat dimuat.
jest.mock('expo', () => ({
  requireOptionalNativeModule: () => null,
  requireNativeView: () => () => null,
  registerRootComponent: () => undefined,
}));
jest.mock('expo-modules-core', () => ({ Platform: { OS: 'android' } }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));
jest.mock('@/theme', () => ({
  useTemaPersona: () => ({ tw: require('twrnc-kosong'), warna: { utama: '#2563eb' } }),
}));

import CustomerLayout from '../../app/(customer)/_layout';

const Kosong = () => null;

function renderPortalPelanggan() {
  return renderRouter(
    {
      '(customer)/_layout': CustomerLayout,
      '(customer)/dashboard': Kosong,
      '(customer)/koneksi/index': Kosong,
      '(customer)/tagihan/index': Kosong,
      '(customer)/paket/index': Kosong,
      '(customer)/profile': Kosong,
    },
    { initialUrl: '/dashboard' },
  );
}

describe('izin notifikasi pelanggan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCatatSudahDitanya.mockResolvedValue(undefined);
    mockAktifkan.mockResolvedValue(true);
  });

  it('menjelaskan alasannya, lalu "Aktifkan" meminta izin dan mendaftarkan token', async () => {
    mockPerluTanya.mockResolvedValue(true);
    const layar = renderPortalPelanggan();

    expect(await layar.findByText('Aktifkan Notifikasi')).toBeTruthy();
    expect(layar.getByText('Tagihan baru dan pengingat jatuh tempo')).toBeTruthy();

    fireEvent.press(layar.getByText('Aktifkan'));

    await waitFor(() => expect(mockAktifkan).toHaveBeenCalledTimes(1));
    expect(mockCatatSudahDitanya).toHaveBeenCalledTimes(1);
    expect(layar.queryByText('Aktifkan Notifikasi')).toBeNull();
  });

  it('"Nanti saja" menutupnya untuk seterusnya tanpa memunculkan dialog sistem', async () => {
    mockPerluTanya.mockResolvedValue(true);
    const layar = renderPortalPelanggan();

    fireEvent.press(await layar.findByText('Nanti saja'));

    await waitFor(() => expect(mockCatatSudahDitanya).toHaveBeenCalledTimes(1));
    expect(mockAktifkan).not.toHaveBeenCalled();
    expect(layar.queryByText('Aktifkan Notifikasi')).toBeNull();
  });

  it('tidak bertanya bila izin sudah ada atau pertanyaannya sudah pernah dijawab', async () => {
    mockPerluTanya.mockResolvedValue(false);
    const layar = renderPortalPelanggan();

    await waitFor(() => expect(mockPerluTanya).toHaveBeenCalledTimes(1));
    expect(layar.queryByText('Aktifkan Notifikasi')).toBeNull();
  });
});
