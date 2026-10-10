import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react-native';

import { KartuHariIniStaff } from '@/components/organisms/staff/KartuHariIniStaff';

/**
 * Keterangan hari di kartu sorotan Beranda staff.
 *
 * `workDays` dulu tidak pernah dibaca di sini, sehingga staff Senin–Jumat
 * dijanjikan "Jam kerja 08:00 – 17:00" pada hari Minggu — sementara layar
 * Absensi, yang membaca `today.isOffDay` dari endpoint yang sama, menampilkan
 * "HARI LIBUR ANDA" pada detik yang sama. Ketiga pengujian mengunci urutan
 * prioritasnya: libur nasional, hari libur sendiri, lalu jam kerja.
 */

jest.mock('lucide-react-native', () => ({
  CalendarHeart: 'CalendarHeart',
  Clock: 'Clock',
  LogIn: 'LogIn',
  LogOut: 'LogOut',
}));
jest.mock('twrnc', () => require('twrnc-kosong'));
jest.mock('@/components/molecules/KartuHeroGradien', () => {
  const { View } = require('react-native');
  return { KartuHeroGradien: ({ children }: { children: unknown }) => <View>{children}</View> };
});

const MINGGU = new Date('2026-10-11T06:00:00');

const renderKartu = (props: Partial<React.ComponentProps<typeof KartuHariIniStaff>>) =>
  render(
    <KartuHariIniStaff
      sekarang={MINGGU}
      jamKerja="08:00 – 17:00"
      libur={null}
      isHariLiburSaya={false}
      absen={null}
      onBukaAbsensi={null}
      {...props}
    />,
  );

describe('keterangan hari di kartu Beranda staff', () => {
  it('menyebut hari libur pengguna, bukan jam kerja, saat bukan hari kerjanya', () => {
    const { getByText, queryByText } = renderKartu({ isHariLiburSaya: true });

    expect(getByText('Hari libur Anda')).toBeTruthy();
    expect(queryByText('Jam kerja 08:00 – 17:00')).toBeNull();
  });

  it('menampilkan jam kerja pada hari kerja biasa', () => {
    const { getByText, queryByText } = renderKartu({ isHariLiburSaya: false });

    expect(getByText('Jam kerja 08:00 – 17:00')).toBeTruthy();
    expect(queryByText('Hari libur Anda')).toBeNull();
  });

  // Libur nasional tetap menang: namanya lebih memberi tahu daripada
  // keterangan umum "Hari libur Anda".
  it('mendahulukan libur nasional atas hari libur pengguna', () => {
    const { getByText, queryByText } = renderKartu({
      isHariLiburSaya: true,
      libur: { name: 'Maulid Nabi' } as never,
    });

    expect(getByText('Libur: Maulid Nabi')).toBeTruthy();
    expect(queryByText('Hari libur Anda')).toBeNull();
  });
});
