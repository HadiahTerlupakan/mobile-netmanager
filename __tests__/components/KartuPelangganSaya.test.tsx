import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

const mockHubungi = jest.fn();
const mockBukaPeta = jest.fn();

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));
jest.mock('@/utils/kontak', () => ({
  ...(jest.requireActual('@/utils/kontak') as object),
  hubungiKontak: (...args: unknown[]) => mockHubungi(...args),
  bukaAlamatDiPeta: (...args: unknown[]) => mockBukaPeta(...args),
}));

import { KartuPelangganSaya } from '@/components/organisms/sales/KartuPelangganSaya';
import type { PelangganSaya } from '@/types/pelangganSaya';

const pelanggan = (ubah: Partial<PelangganSaya> = {}): PelangganSaya => ({
  id: 'p1',
  idPelanggan: '77001',
  nama: 'Bu Sari',
  status: 'AKTIF',
  paket: '20 Mbps',
  alamat: 'Jl. Mawar 1',
  noTelp: '0812',
  jatuhTempo: '2026-10-10T00:00:00.000Z',
  siteName: null,
  latitude: null,
  longitude: null,
  namaSales: 'Ani',
  woTerbuka: null,
  jumlahKeluhanTerbuka: 0,
  ...ubah,
});

describe('KartuPelangganSaya', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('menampilkan WO berjalan, keluhan terbuka, dan nama sales bila diminta', () => {
    const { getByText } = render(
      <KartuPelangganSaya
        pelanggan={pelanggan({ woTerbuka: { nomor: 'WO-1', status: 'ASSIGNED', jenis: 'TROUBLESHOOT' }, jumlahKeluhanTerbuka: 2 })}
        isTampilkanSales
        onLaporKeluhan={jest.fn()}
      />,
    );
    expect(getByText(/^WO-1 · /)).toBeTruthy();
    expect(getByText('2 keluhan terbuka')).toBeTruthy();
    expect(getByText('Sales: Ani')).toBeTruthy();
  });

  it('aksi lapor keluhan, telepon, dan peta', () => {
    const onLapor = jest.fn();
    const data = pelanggan();
    const { getByLabelText, queryByText } = render(<KartuPelangganSaya pelanggan={data} isTampilkanSales={false} onLaporKeluhan={onLapor} />);

    expect(queryByText('Sales: Ani')).toBeNull();
    fireEvent.press(getByLabelText('Lapor keluhan untuk Bu Sari'));
    fireEvent.press(getByLabelText('Hubungi 0812'));
    fireEvent.press(getByLabelText('Buka peta Bu Sari'));

    expect(onLapor).toHaveBeenCalledWith(data);
    expect(mockHubungi).toHaveBeenCalledWith('0812');
    expect(mockBukaPeta).toHaveBeenCalledWith('Jl. Mawar 1');
  });

  it('tanpa nomor HP & lokasi: tombol telepon dan peta disembunyikan', () => {
    const { queryByLabelText } = render(
      <KartuPelangganSaya pelanggan={pelanggan({ noTelp: null, alamat: null })} isTampilkanSales={false} onLaporKeluhan={jest.fn()} />,
    );
    expect(queryByLabelText(/^Hubungi/)).toBeNull();
    expect(queryByLabelText(/^Buka peta/)).toBeNull();
  });
});
