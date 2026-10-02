import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

import { KartuTimHariIni } from '@/components/organisms/dashboard/KartuTimHariIni';

import { namaAnggota } from '../fixtures/presurvei/timBesar';

const onBuka = jest.fn();
const onCobaLagi = jest.fn();

const tampilkan = (props: Partial<React.ComponentProps<typeof KartuTimHariIni>>) =>
  render(<KartuTimHariIni baris={[]} isGagal={false} onCobaLagi={onCobaLagi} onBuka={onBuka} {...props} />);

describe('KartuTimHariIni', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('per anggota: nama dan selesai/total; lencana terlewat hanya bila ada', () => {
    const { getByText, queryAllByText } = tampilkan({
      baris: [
        { salesId: 's-2', namaSales: 'Sinta', total: 3, selesai: 1, terlewat: 2 },
        { salesId: 's-3', namaSales: 'Tono', total: 2, selesai: 2, terlewat: 0 },
      ],
    });

    expect(getByText('Tim hari ini')).toBeTruthy();
    expect(getByText('Sinta')).toBeTruthy();
    expect(getByText('1/3 selesai')).toBeTruthy();
    expect(getByText('2/2 selesai')).toBeTruthy();
    expect(queryAllByText(/^Terlewat:/)).toHaveLength(1);
    expect(getByText('Terlewat: 2')).toBeTruthy();
  });

  it('ketuk anggota membuka tampilan Tim anggota itu; "Lihat semua" membuka semua', () => {
    const { getByLabelText, getByText } = tampilkan({
      baris: [{ salesId: 's-2', namaSales: 'Sinta', total: 1, selesai: 0, terlewat: 0 }],
    });

    fireEvent.press(getByLabelText('Rencana Sinta'));
    fireEvent.press(getByText('Lihat semua (1 anggota)'));

    expect(onBuka).toHaveBeenNthCalledWith(1, 's-2');
    expect(onBuka).toHaveBeenNthCalledWith(2, null);
  });

  it('tanpa rencana hari ini: pesan kosong, anggota dengan terlewat tetap tampil', () => {
    const { getByText } = tampilkan({
      baris: [{ salesId: 's-5', namaSales: 'Budi', total: 0, selesai: 0, terlewat: 1 }],
    });

    expect(getByText('Belum ada rencana tim hari ini')).toBeTruthy();
    expect(getByText('Budi')).toBeTruthy();
    expect(getByText('Terlewat: 1')).toBeTruthy();
  });

  it('kosong sama sekali: hanya pesan kosong dan tautan Lihat tim', () => {
    const { getByText, queryByText } = tampilkan({ baris: [] });

    expect(getByText('Belum ada rencana tim hari ini')).toBeTruthy();
    expect(queryByText(/^Tim: /)).toBeNull();
    fireEvent.press(getByText('Lihat tim'));
    expect(onBuka).toHaveBeenCalledWith(null);
  });

  describe('tim besar (8 anggota)', () => {
    const baris = (salesId: string, total: number, selesai: number, terlewat: number) => ({
      salesId,
      namaSales: namaAnggota(salesId),
      total,
      selesai,
      terlewat,
    });
    const TIM = [
      baris('s-2', 3, 3, 0),
      baris('s-3', 4, 1, 0),
      baris('s-4', 2, 0, 1),
      baris('s-5', 1, 1, 0),
      baris('s-6', 2, 0, 0),
      baris('s-7', 3, 2, 4),
      baris('s-8', 1, 0, 0),
      baris('s-9', 0, 0, 1),
    ];

    it('ringkasan tim: selesai/total, persen, dan jumlah terlewat', () => {
      const { getByText } = tampilkan({ baris: TIM });

      expect(getByText('Tim: 7/16 selesai · 44%')).toBeTruthy();
      expect(getByText('6 terlewat')).toBeTruthy();
    });

    it('hanya 3 anggota paling perlu perhatian, urut terlewat lalu belum selesai', () => {
      const { getAllByLabelText, queryByText } = tampilkan({ baris: TIM });

      const label = getAllByLabelText(/^Rencana /).map((el) => el.props.accessibilityLabel);
      expect(label).toEqual(['Rencana Dewi', 'Rencana Budi', 'Rencana Fajar']);
      expect(queryByText('Sinta')).toBeNull();
      expect(queryByText('Wati')).toBeNull();
    });

    it('"Lihat semua (n anggota)" membuka tampilan Tim semua anggota', () => {
      const { getByText } = tampilkan({ baris: TIM });

      fireEvent.press(getByText('Lihat semua (8 anggota)'));

      expect(onBuka).toHaveBeenCalledWith(null);
    });

    it('tanpa terlewat: pil terlewat tim tidak tampil', () => {
      const { queryByText } = tampilkan({ baris: TIM.map((item) => ({ ...item, terlewat: 0 })) });

      expect(queryByText(/terlewat$/)).toBeNull();
    });
  });

  it('gagal tanpa data: pesan gagal yang bisa diketuk untuk coba lagi', () => {
    const { getByLabelText, queryByText } = tampilkan({ baris: undefined, isGagal: true });

    fireEvent.press(getByLabelText('Muat ulang rencana tim'));

    expect(onCobaLagi).toHaveBeenCalledTimes(1);
    expect(queryByText('Belum ada rencana tim hari ini')).toBeNull();
  });
});
