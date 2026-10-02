import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockParams = jest.fn<() => Record<string, string | undefined>>();
const mockMutate = jest.fn();
const mockAmbilFoto = jest.fn<(sumber: string) => Promise<unknown>>();
const mockPesanGagal = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
  useLocalSearchParams: () => mockParams(),
  useFocusEffect: () => undefined,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});
jest.mock('@/hooks/queries/useKeluhan', () => ({ useLaporKeluhan: () => ({ mutate: mockMutate, isPending: false }) }));
jest.mock('@/hooks/useIsOnline', () => ({ useIsOnline: () => true }));
jest.mock('@/utils/keluhan/ambilFotoKeluhan', () => ({
  ambilFotoKeluhan: (sumber: string) => mockAmbilFoto(sumber),
  PESAN_IZIN_FOTO_DITOLAK: { kamera: 'izin kamera', galeri: 'izin galeri' },
}));
jest.mock('@/utils/errorPresenter', () => ({
  presentErrorMessage: (...args: unknown[]) => mockPesanGagal(...args),
  presentSuccessMessage: jest.fn(),
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

import LaporKeluhanScreen from '../../app/(app)/keluhan/lapor';

describe('layar lapor keluhan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams.mockReturnValue({ pelangganId: 'p1', nama: 'Bu Sari' });
  });

  it('tanpa pelanggan: arahkan ke Pelanggan saya', () => {
    mockParams.mockReturnValue({});
    const { getByText } = render(<LaporKeluhanScreen />);
    fireEvent.press(getByText('Buka Pelanggan saya'));
    expect(mockReplace).toHaveBeenCalledWith('/(app)/pelanggan/saya');
  });

  it('isian kosong: tidak dikirim dan kesalahan tampil', () => {
    const { getByText } = render(<LaporKeluhanScreen />);
    fireEvent.press(getByText('Kirim ke helpdesk'));
    expect(mockMutate).not.toHaveBeenCalled();
    expect(getByText(/minimal satu foto/)).toBeTruthy();
  });

  it('foto gagal diambil: pesan gagal, bukan penolakan tak tertangani', async () => {
    mockAmbilFoto.mockRejectedValue(new Error('kamera rusak'));
    const { getByText } = render(<LaporKeluhanScreen />);
    await act(async () => {
      fireEvent.press(getByText('Kamera'));
    });
    expect(mockPesanGagal).toHaveBeenCalledWith('Foto gagal diambil. Coba lagi.');
  });

  it('izin ditolak: pesan izin sesuai sumber', async () => {
    mockAmbilFoto.mockResolvedValue({ status: 'izin-ditolak' });
    const { getByText } = render(<LaporKeluhanScreen />);
    await act(async () => {
      fireEvent.press(getByText('Galeri'));
    });
    expect(mockPesanGagal).toHaveBeenCalledWith('izin galeri', 'Izin dibutuhkan');
  });
});
