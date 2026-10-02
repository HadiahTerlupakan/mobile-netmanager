import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

import { DaftarKosong } from '@/components/molecules/DaftarKosong';

const Ikon = () => null;

describe('DaftarKosong', () => {
  it('kosong biasa: judul & pesan tanpa tombol coba lagi', () => {
    const { getByText, queryByText } = render(
      <DaftarKosong isError={false} onCobaLagi={jest.fn()} ikon={Ikon as never} judul="Belum ada" pesan="Nanti muncul." />,
    );
    expect(getByText('Belum ada')).toBeTruthy();
    expect(queryByText('Coba lagi')).toBeNull();
  });

  it('gagal muat: pesan gagal dan tombol coba lagi', () => {
    const onCobaLagi = jest.fn();
    const { getByText, queryByText } = render(
      <DaftarKosong isError onCobaLagi={onCobaLagi} ikon={Ikon as never} judul="Belum ada" pesan="Nanti muncul." />,
    );
    expect(queryByText('Belum ada')).toBeNull();
    fireEvent.press(getByText('Coba lagi'));
    expect(onCobaLagi).toHaveBeenCalled();
  });
});
