import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { buatRencanaUji } from '../fixtures/presurvei/rencana';

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => () => ({}));

import { KartuRencanaHariIni } from '@/components/organisms/dashboard/KartuRencanaHariIni';

describe('KartuRencanaHariIni', () => {
  it('kosong: pesan dan tautan Buat Rencana; tanpa badge terlewat bila nol', () => {
    const onBuat = jest.fn();
    const { getByText, queryByText } = render(
      <KartuRencanaHariIni rencanaHariIni={[]} jumlahTerlewat={0} onBuka={jest.fn()} onBuat={onBuat} />,
    );

    expect(getByText('Belum ada rencana hari ini')).toBeTruthy();
    expect(queryByText(/Terlewat/)).toBeNull();
    fireEvent.press(getByText('Buat Rencana'));
    expect(onBuat).toHaveBeenCalledTimes(1);
  });

  it('hanya tiga rencana tertunda berikutnya yang ditampilkan dan bisa dibuka', () => {
    const onBuka = jest.fn();
    const rencana = ['a', 'b', 'c', 'd'].map((id) => buatRencanaUji(id, { tujuan: `Kunjungan ${id}` }));
    const { getByText, queryByText } = render(
      <KartuRencanaHariIni rencanaHariIni={rencana} jumlahTerlewat={2} onBuka={onBuka} onBuat={jest.fn()} />,
    );

    expect(getByText('0 dari 4 selesai · 4 belum dikunjungi')).toBeTruthy();
    expect(getByText('Terlewat: 2')).toBeTruthy();
    expect(queryByText('Kunjungan d')).toBeNull();
    fireEvent.press(getByText('Kunjungan c'));
    expect(onBuka).toHaveBeenCalledWith('c');
  });
});
