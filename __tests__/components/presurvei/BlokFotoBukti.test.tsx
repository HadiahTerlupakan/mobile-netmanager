import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => () => ({}));

import { BlokFotoBukti } from '@/components/organisms/presurvei/BlokFotoBukti';

const foto = (jumlah: number) => Array.from({ length: jumlah }, (_, i) => `file:///cache/${i + 1}.jpg`);

describe('BlokFotoBukti', () => {
  it('menampilkan hitungan dan tombol ambil selama belum penuh', () => {
    const onTambah = jest.fn();
    const { getByText } = render(<BlokFotoBukti fotoLokal={foto(2)} onTambah={onTambah} onHapus={jest.fn()} />);

    fireEvent.press(getByText('Ambil Foto'));

    expect(getByText('Foto bukti (2/6)')).toBeTruthy();
    expect(onTambah).toHaveBeenCalledWith();
  });

  it('menyembunyikan tombol ambil saat enam foto', () => {
    const { queryByText } = render(<BlokFotoBukti fotoLokal={foto(6)} onTambah={jest.fn()} onHapus={jest.fn()} />);

    expect(queryByText('Ambil Foto')).toBeNull();
  });

  it('menghapus foto yang ditekan', () => {
    const onHapus = jest.fn();
    const { getByLabelText } = render(<BlokFotoBukti fotoLokal={foto(3)} onTambah={jest.fn()} onHapus={onHapus} />);

    fireEvent.press(getByLabelText('Hapus foto 2'));

    expect(onHapus).toHaveBeenCalledWith('file:///cache/2.jpg');
  });

  it('menampilkan pesan kesalahan dari form', () => {
    const { getByText } = render(
      <BlokFotoBukti fotoLokal={foto(0)} kesalahan="Ambil minimal 1 foto bukti" onTambah={jest.fn()} onHapus={jest.fn()} />,
    );

    expect(getByText('Ambil minimal 1 foto bukti')).toBeTruthy();
  });
});
