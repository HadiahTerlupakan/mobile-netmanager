import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import { Linking } from 'react-native';

jest.mock('@/components/organisms/presurvei/PetaTitik', () => ({ PetaTitik: () => null }));
jest.mock('twrnc', () => () => ({}));

import { BlokLokasiGps } from '@/components/organisms/presurvei/BlokLokasiGps';

const TITIK = { latitude: -6.2, longitude: 106.8, akurasiMeter: 12 };

describe('BlokLokasiGps', () => {
  it('GPS gagal menawarkan coba lagi', () => {
    const onCobaLagi = jest.fn();
    const { getByText } = render(<BlokLokasiGps status="gagal" titik={null} onCobaLagi={onCobaLagi} />);

    fireEvent.press(getByText('Coba lagi'));

    expect(getByText('GPS gagal. Pastikan GPS aktif lalu coba lagi.')).toBeTruthy();
    expect(onCobaLagi).toHaveBeenCalledWith();
  });

  it('saat mencari tidak menawarkan coba lagi', () => {
    const { queryByText, getByText } = render(<BlokLokasiGps status="mencari" titik={null} onCobaLagi={jest.fn()} />);

    expect(getByText('Mencari lokasi GPS…')).toBeTruthy();
    expect(queryByText('Coba lagi')).toBeNull();
  });

  it('titik didapat menampilkan akurasi tanpa isian manual', () => {
    const { getByText, queryByText, UNSAFE_queryAllByType } = render(
      <BlokLokasiGps status="siap" titik={TITIK} onCobaLagi={jest.fn()} />,
    );
    const { TextInput } = require('react-native');

    expect(getByText('±12 m')).toBeTruthy();
    expect(queryByText('Coba lagi')).toBeNull();
    expect(UNSAFE_queryAllByType(TextInput)).toHaveLength(0);
  });

  it('menampilkan pesan kesalahan dari form', () => {
    const { getByText } = render(
      <BlokLokasiGps status="gagal" titik={null} kesalahan="Lokasi GPS belum didapat" onCobaLagi={jest.fn()} />,
    );

    expect(getByText('Lokasi GPS belum didapat')).toBeTruthy();
  });

  // Carry Task 10 (StatusLokasi 'izin_ditolak'): izin ditolak WAJIB tampil
  // beda dari kegagalan GPS biasa — pesan izin + "Buka Pengaturan", bukan
  // "Coba lagi".
  it('izin ditolak menawarkan Buka Pengaturan, bukan Coba lagi', () => {
    const spyOpenSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    const onCobaLagi = jest.fn();
    const { getByText, queryByText } = render(
      <BlokLokasiGps status="izin_ditolak" titik={null} onCobaLagi={onCobaLagi} />,
    );

    expect(
      getByText('Izin lokasi ditolak. Buka Pengaturan untuk mengizinkan lokasi, lalu coba lagi.'),
    ).toBeTruthy();
    expect(queryByText('Coba lagi')).toBeNull();

    fireEvent.press(getByText('Buka Pengaturan'));

    expect(spyOpenSettings).toHaveBeenCalledWith();
    expect(onCobaLagi).not.toHaveBeenCalled();

    spyOpenSettings.mockRestore();
  });
});
