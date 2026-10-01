import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 48, bottom: 24, left: 0, right: 0 }),
}));

import { PilihAnggotaTimModal } from '@/components/organisms/presurvei/PilihAnggotaTimModal';

import { ANGGOTA_TIM_BESAR } from '../../fixtures/presurvei/timBesar';

const onPilih = jest.fn();
const onTutup = jest.fn();

const tampilkan = (props: Partial<React.ComponentProps<typeof PilihAnggotaTimModal>> = {}) =>
  render(
    <PilihAnggotaTimModal
      judul="Pilih Anggota"
      daftar={ANGGOTA_TIM_BESAR}
      terpilih={null}
      penggunaId="k-1"
      isBolehSemua
      onPilih={onPilih}
      onTutup={onTutup}
      {...props}
    />,
  );

describe('PilihAnggotaTimModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('isi modal memakai inset area aman supaya Tutup tidak di bawah status bar', () => {
    const { getByTestId, getByText } = tampilkan();

    const gaya = StyleSheet.flatten(getByTestId('isi-pilih-anggota-tim').props.style);
    expect(gaya.paddingTop).toBe(48 + 16);
    expect(gaya.paddingBottom).toBe(24 + 16);
    fireEvent.press(getByText('Tutup'));
    expect(onTutup).toHaveBeenCalledTimes(1);
  });

  it('menampilkan semua anggota (diri sendiri bertanda Saya) dan opsi Semua anggota di atas', () => {
    const { getByLabelText } = tampilkan();

    expect(getByLabelText('Semua anggota').props.accessibilityState).toEqual({ selected: true });
    expect(getByLabelText('Kepala Andi (Saya)')).toBeTruthy();
    for (const sales of ANGGOTA_TIM_BESAR.slice(1)) expect(getByLabelText(sales.nama)).toBeTruthy();
  });

  it('pencarian menyaring nama tanpa beda huruf besar/kecil; tidak ada hasil → pesan', () => {
    const { getByLabelText, queryByLabelText, getByText } = tampilkan();

    fireEvent.changeText(getByLabelText('Cari anggota'), 'dI');
    expect(getByLabelText('Budi')).toBeTruthy();
    expect(getByLabelText('Rudi')).toBeTruthy();
    expect(getByLabelText('Kepala Andi (Saya)')).toBeTruthy();
    expect(queryByLabelText('Sinta')).toBeNull();
    expect(queryByLabelText('Wati')).toBeNull();

    fireEvent.changeText(getByLabelText('Cari anggota'), 'zzz');
    expect(getByText('Anggota tidak ditemukan.')).toBeTruthy();
  });

  it('memilih anggota mengirim id lalu menutup; Semua anggota mengirim null', () => {
    const { getByLabelText } = tampilkan();

    fireEvent.press(getByLabelText('Wati'));
    fireEvent.press(getByLabelText('Semua anggota'));

    expect(onPilih).toHaveBeenNthCalledWith(1, 's-5');
    expect(onPilih).toHaveBeenNthCalledWith(2, null);
    expect(onTutup).toHaveBeenCalledTimes(2);
  });

  it('progres hari ini tampil bila ada; tanpa opsi Semua di layar Tugaskan', () => {
    const { getByText, queryByLabelText, getByLabelText } = tampilkan({
      isBolehSemua: false,
      terpilih: 's-2',
      progres: new Map([['s-2', { selesai: 1, total: 3 }]]),
    });

    expect(getByText('1/3')).toBeTruthy();
    expect(queryByLabelText('Semua anggota')).toBeNull();
    expect(getByLabelText('Sinta').props.accessibilityState).toEqual({ selected: true });
  });
});
