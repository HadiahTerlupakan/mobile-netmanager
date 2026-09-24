import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';

const mockIzin = jest.fn<() => Promise<{ status: string }>>();
const mockPosisi = jest.fn<(opsi: unknown) => Promise<unknown>>();
const mockGeocode = jest.fn<(koordinat: unknown) => Promise<unknown[]>>();

jest.mock('@/utils/locationDisclosure', () => ({
  requestForegroundLocationWithDisclosure: () => mockIzin(),
}));
jest.mock('expo-location', () => ({
  getCurrentPositionAsync: (opsi: unknown) => mockPosisi(opsi),
  reverseGeocodeAsync: (koordinat: unknown) => mockGeocode(koordinat),
  Accuracy: { Balanced: 3, High: 4 },
}));

import { useLocationWithTimeout } from '@/hooks/useLocationWithTimeout';

describe('useLocationWithTimeout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIzin.mockResolvedValue({ status: 'granted' });
    mockPosisi.mockResolvedValue({ coords: { latitude: -6.2, longitude: 106.8, accuracy: 12 } });
    mockGeocode.mockResolvedValue([{ street: 'Jl. Melati', district: 'Cibubur', city: 'Jakarta Timur' }]);
  });

  it('mengembalikan akurasi dan alamat, dengan tingkat akurasi yang diminta', async () => {
    const { result } = renderHook(() => useLocationWithTimeout());

    const hasil = await result.current.getLocationWithTimeout(null, 1_000, 4);

    expect(mockPosisi).toHaveBeenCalledWith({ accuracy: 4 });
    expect(hasil).toEqual({
      latitude: '-6.2',
      longitude: '106.8',
      locationName: 'Jl. Melati Cibubur Jakarta Timur',
      accuracy: 12,
    });
  });

  it('pemanggil lama tetap memakai akurasi Balanced', async () => {
    const { result } = renderHook(() => useLocationWithTimeout());

    await result.current.getLocationWithTimeout(null, 1_000);

    expect(mockPosisi).toHaveBeenCalledWith({ accuracy: 3 });
  });

  it('izin ditolak tanpa cache memberi koordinat kosong dan akurasi null', async () => {
    mockIzin.mockResolvedValue({ status: 'denied' });
    const { result } = renderHook(() => useLocationWithTimeout());

    const hasil = await result.current.getLocationWithTimeout(null, 1_000);

    expect(hasil).toEqual({ latitude: '', longitude: '', locationName: '', accuracy: null });
  });

  // Amandemen preflight (task-10, G11): timer batas waktu wajib dibersihkan
  // agar tidak menggantung setelah GPS berhasil lebih dulu.
  it('membersihkan timer batas waktu setelah GPS berhasil sebelum waktu habis', async () => {
    const spySetTimeout = jest.spyOn(global, 'setTimeout');
    const spyClearTimeout = jest.spyOn(global, 'clearTimeout');
    const { result } = renderHook(() => useLocationWithTimeout());

    await result.current.getLocationWithTimeout(null, 5_000);

    expect(spySetTimeout).toHaveBeenCalledTimes(1);
    const idTimer = spySetTimeout.mock.results[0]?.value;
    expect(spyClearTimeout).toHaveBeenCalledWith(idTimer);

    spySetTimeout.mockRestore();
    spyClearTimeout.mockRestore();
  });
});
