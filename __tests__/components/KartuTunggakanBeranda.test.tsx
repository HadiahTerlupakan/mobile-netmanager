import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockTunggakan = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/hooks/queries/useTunggakanPelanggan', () => ({ useTunggakanPelanggan: () => mockTunggakan() }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

import { KartuTunggakanBeranda } from '@/components/organisms/dashboard/KartuTunggakanBeranda';

const pelanggan = (id: string, hariLewat: number) => ({
  id,
  idPelanggan: id,
  nama: `Pelanggan ${id}`,
  username: id,
  paket: '20 Mbps',
  alamat: null,
  noTelp: '0812',
  jatuhTempo: '2026-09-01T00:00:00Z',
  hariLewat,
  siteName: null,
  latitude: null,
  longitude: null,
});

describe('KartuTunggakanBeranda', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tanpa data (gagal/tanpa izin) tidak tampil', () => {
    mockTunggakan.mockReturnValue({ data: undefined });
    expect(render(<KartuTunggakanBeranda isAktif />).toJSON()).toBeNull();
  });

  it('nol tunggakan: pesan aman', () => {
    mockTunggakan.mockReturnValue({ data: { total: 0, kelompok: [] } });
    expect(render(<KartuTunggakanBeranda isAktif />).getByText('Tidak ada pelanggan yang menunggak.')).toBeTruthy();
  });

  it('menampilkan dua terlama lintas sales dan membuka layar tunggakan', () => {
    mockTunggakan.mockReturnValue({
      data: {
        total: 4,
        kelompok: [
          { salesId: 'a', namaSales: 'Ani', pelanggan: [pelanggan('1', 3), pelanggan('2', 40)] },
          { salesId: null, namaSales: 'Belum ada sales', pelanggan: [pelanggan('3', 10), pelanggan('4', 25)] },
        ],
      },
    });
    const { getByText, queryByText, getByLabelText } = render(<KartuTunggakanBeranda isAktif />);

    expect(getByText('4 isolir')).toBeTruthy();
    expect(getByText('Lewat 40 hari')).toBeTruthy();
    expect(getByText('Lewat 25 hari')).toBeTruthy();
    expect(queryByText('Lewat 10 hari')).toBeNull();
    expect(queryByText('Lewat 3 hari')).toBeNull();

    fireEvent.press(getByLabelText('Buka tunggakan pelanggan'));
    expect(mockPush).toHaveBeenCalledWith('/(app)/pelanggan/tunggakan');
  });
});
