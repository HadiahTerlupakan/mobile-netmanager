import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

import { KartuKeluhan } from '@/components/organisms/keluhan/KartuKeluhan';
import type { KeluhanRingkas } from '@/types/keluhan';

const keluhan = (ubah: Partial<KeluhanRingkas> = {}): KeluhanRingkas => ({
  id: 'tk1',
  nomor: 'TKT-1',
  subjek: 'Internet mati',
  kategori: 'TECHNICAL',
  prioritas: 'HIGH',
  status: 'OPEN',
  dibuatPada: '2026-10-02T01:00:00.000Z',
  diperbaruiPada: '2026-10-02T01:00:00.000Z',
  pelanggan: { id: 'p1', nama: 'Bu Sari', idPelanggan: '77001' },
  namaSales: 'Ani',
  namaPelapor: 'Ani',
  wo: null,
  ...ubah,
});

describe('KartuKeluhan', () => {
  it('nama sales hanya tampil bila diminta', () => {
    const { getByText, rerender, queryByText } = render(<KartuKeluhan keluhan={keluhan()} isTampilkanSales onTekan={jest.fn()} />);
    expect(getByText(/TKT-1 · Ani/)).toBeTruthy();
    rerender(<KartuKeluhan keluhan={keluhan()} isTampilkanSales={false} onTekan={jest.fn()} />);
    expect(queryByText(/· Ani/)).toBeNull();
  });

  it('menampilkan WO penanganan dengan teknisi dan membuka detail saat ditekan', () => {
    const onTekan = jest.fn();
    const data = keluhan({ wo: { nomor: 'WO-1', status: 'ASSIGNED', namaTeknisi: 'Budi', jadwal: null } });
    const { getByText, getByLabelText } = render(<KartuKeluhan keluhan={data} isTampilkanSales={false} onTekan={onTekan} />);

    expect(getByText(/^WO-1 · .* · Budi$/)).toBeTruthy();
    fireEvent.press(getByLabelText('Keluhan Bu Sari: Internet mati'));
    expect(onTekan).toHaveBeenCalledWith(data);
  });
});
