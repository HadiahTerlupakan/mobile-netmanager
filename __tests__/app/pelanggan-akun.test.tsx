import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent } from '@testing-library/react-native';
import React from 'react';

import { galatHttp, renderDenganQuery, selesaikanJanji, toastTerakhir } from '../fixtures/portalPelanggan';

const mockGet = jest.fn<(url: string) => Promise<{ data: unknown }>>();
const mockPatch = jest.fn<(url: string, body?: unknown) => Promise<{ data: unknown }>>();
const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: (url: string) => mockGet(url), patch: (url: string, body?: unknown) => mockPatch(url, body) },
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: mockBack }) }));
jest.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'p-1', name: 'Budi' }, signOut: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

import EditProfilPelangganScreen from '../../app/(customer)/edit-profil';
import GantiPasswordPelangganScreen from '../../app/(customer)/ganti-password';
import CustomerProfileScreen from '../../app/(customer)/profile';

const URL_PROFIL = '/api/customer/profile';

describe('menu profil pelanggan', () => {
  it('Edit Profil dan Ganti Password membuka layarnya', () => {
    const layar = renderDenganQuery(<CustomerProfileScreen />);

    fireEvent.press(layar.getByText('Edit Profil'));
    fireEvent.press(layar.getByText('Ganti Password'));

    expect(mockPush.mock.calls).toEqual([['/(customer)/edit-profil'], ['/(customer)/ganti-password']]);
  });
});

describe('ganti password pelanggan', () => {
  beforeEach(() => {
    mockPatch.mockReset();
  });

  async function isiDanSimpan(lama: string, baru: string, konfirmasi: string) {
    const layar = renderDenganQuery(<GantiPasswordPelangganScreen />);
    fireEvent.changeText(layar.getByPlaceholderText('Masukkan password saat ini'), lama);
    fireEvent.changeText(layar.getByPlaceholderText('Masukkan password baru'), baru);
    fireEvent.changeText(layar.getByPlaceholderText('Ulangi password baru'), konfirmasi);
    fireEvent.press(layar.getByText('Simpan Password'));
    await selesaikanJanji();
    return layar;
  }

  it('mengirim PATCH profil hanya dengan password lama dan baru', async () => {
    mockPatch.mockResolvedValue({ data: { success: true, data: null, message: 'Password berhasil diubah' } });

    await isiDanSimpan('rahasia1', 'rahasia2', 'rahasia2');

    expect(mockPatch).toHaveBeenCalledWith(URL_PROFIL, { currentPassword: 'rahasia1', newPassword: 'rahasia2' });
    expect(toastTerakhir()?.text2).toBe('Password berhasil diubah');
    expect(mockBack).toHaveBeenCalled();
  });

  // Toast hilang dalam ±1 detik, sebelum pelanggan sempat membaca kenapa
  // passwordnya ditolak; pesan server harus menetap di bawah form.
  it('password lama salah (400) menampilkan pesan server di bawah form dan tetap di layar', async () => {
    mockPatch.mockRejectedValue(galatHttp(400, 'Password saat ini salah'));

    const layar = await isiDanSimpan('keliru', 'rahasia2', 'rahasia2');

    expect(layar.getByText('Password saat ini salah')).toBeTruthy();
    expect(toastTerakhir()).toBeUndefined();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('pesan penolakan hilang begitu pelanggan mengubah isian', async () => {
    mockPatch.mockRejectedValue(galatHttp(400, 'Password saat ini salah'));
    const layar = await isiDanSimpan('keliru', 'rahasia2', 'rahasia2');
    expect(layar.getByText('Password saat ini salah')).toBeTruthy();

    fireEvent.changeText(layar.getByPlaceholderText('Masukkan password saat ini'), 'rahasia1');
    await selesaikanJanji();

    expect(layar.queryByText('Password saat ini salah')).toBeNull();
  });

  it('galat server (500) tetap lewat toast, bukan pesan di bawah form', async () => {
    mockPatch.mockRejectedValue(galatHttp(500, 'Terjadi kesalahan server'));

    const layar = await isiDanSimpan('rahasia1', 'rahasia2', 'rahasia2');

    expect(toastTerakhir()).toBeDefined();
    expect(layar.queryByText('Terjadi kesalahan server')).toBeNull();
  });

  it('konfirmasi yang berbeda ditolak tanpa memanggil server', async () => {
    const layar = await isiDanSimpan('rahasia1', 'rahasia2', 'rahasia3');

    expect(layar.getByText('Password baru dan konfirmasi tidak cocok')).toBeTruthy();
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('password baru kurang dari 6 karakter ditolak tanpa memanggil server', async () => {
    const layar = await isiDanSimpan('rahasia1', '12345', '12345');

    expect(layar.getByText('Password baru minimal 6 karakter')).toBeTruthy();
    expect(mockPatch).not.toHaveBeenCalled();
  });
});

describe('edit profil pelanggan', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPatch.mockReset();
    mockGet.mockResolvedValue({
      data: {
        success: true,
        data: {
          profile: {
            id: 'p-1',
            idPelanggan: 'PLG-1',
            nama: 'Budi',
            noTelp: '081234567890',
            preferences: { is2FAEnabled: false, isBillNotifEnabled: true, isPromoEnabled: false },
          },
        },
      },
    });
  });

  async function renderLayar() {
    const layar = renderDenganQuery(<EditProfilPelangganScreen />);
    await selesaikanJanji();
    return layar;
  }

  it('mengisi form dari profil dan tidak menawarkan 2FA', async () => {
    const layar = await renderLayar();

    expect(mockGet).toHaveBeenCalledWith(URL_PROFIL);
    expect(layar.getByPlaceholderText('Contoh: 0812 3456 7890').props.value).toBe('081234567890');
    expect(layar.getByLabelText('Pengingat Tagihan').props.value).toBe(true);
    expect(layar.getByLabelText('Info Promo').props.value).toBe(false);
    expect(layar.queryByText(/2FA|dua langkah/i)).toBeNull();
  });

  it('menyimpan nomor baru dan preferensi lewat PATCH profil', async () => {
    mockPatch.mockResolvedValue({ data: { success: true, message: 'Profil berhasil diupdate' } });
    const layar = await renderLayar();

    fireEvent.changeText(layar.getByPlaceholderText('Contoh: 0812 3456 7890'), ' 0813-1111-2222 ');
    fireEvent(layar.getByLabelText('Info Promo'), 'valueChange', true);
    fireEvent.press(layar.getByText('Simpan Perubahan'));
    await selesaikanJanji();

    expect(mockPatch).toHaveBeenCalledWith(URL_PROFIL, { noTelp: '0813-1111-2222', isBillNotifEnabled: true, isPromoEnabled: true });
    expect(toastTerakhir()?.text2).toBe('Profil berhasil diupdate');
    expect(mockBack).toHaveBeenCalled();
  });

  it('nomor telepon yang terlalu pendek tidak dikirim', async () => {
    const layar = await renderLayar();

    fireEvent.changeText(layar.getByPlaceholderText('Contoh: 0812 3456 7890'), '0812');
    fireEvent.press(layar.getByText('Simpan Perubahan'));
    await selesaikanJanji();

    expect(layar.getByText('Nomor telepon harus 10–15 digit')).toBeTruthy();
    expect(mockPatch).not.toHaveBeenCalled();
  });
});
