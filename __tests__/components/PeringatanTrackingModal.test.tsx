import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('@/theme', () => ({
  useTemaPersona: () => ({ tw: require('twrnc-kosong'), warna: { utama: '#000' } }),
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

import { PeringatanTrackingModal } from '@/components/organisms/attendance/PeringatanTrackingModal';

describe('PeringatanTrackingModal', () => {
  it('menjelaskan izin "sepanjang waktu" dan menahan check-in', () => {
    const onPilih = jest.fn();
    const { getByText } = render(
      <PeringatanTrackingModal permintaan={{ kendala: 'izin-latar', konteks: 'check-in' }} onPilih={onPilih} />,
    );

    expect(getByText(/Izinkan sepanjang waktu/)).toBeTruthy();
    expect(getByText('Check-in tidak bisa dilakukan sebelum ini diaktifkan.')).toBeTruthy();
    fireEvent.press(getByText('Nanti'));
    expect(onPilih).toHaveBeenCalledWith('tutup');
  });

  it('di tengah jam kerja menawarkan check-out, bukan Nanti', () => {
    const onPilih = jest.fn();
    const { getByText, queryByText } = render(
      <PeringatanTrackingModal permintaan={{ kendala: 'gps-mati', konteks: 'sesi' }} onPilih={onPilih} />,
    );

    expect(getByText('GPS Tidak Aktif')).toBeTruthy();
    expect(queryByText('Nanti')).toBeNull();
    fireEvent.press(getByText('Check-out'));
    expect(onPilih).toHaveBeenCalledWith('checkout');
    fireEvent.press(getByText('Buka Pengaturan'));
    expect(onPilih).toHaveBeenCalledWith('pengaturan');
  });

  it('tidak tampil tanpa permintaan', () => {
    const { queryByText } = render(<PeringatanTrackingModal permintaan={null} onPilih={jest.fn()} />);

    expect(queryByText('Buka Pengaturan')).toBeNull();
  });
});
