import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/theme', () => ({
  useTemaPersona: () => ({ tw: require('twrnc-kosong'), warna: { utama: '#000' } }),
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

import { PeringatanTrackingProvider } from '@/components/providers/PeringatanTrackingProvider';
import { tampilkanPeringatanTracking } from '@/utils/peringatanTracking';

describe('PeringatanTrackingProvider', () => {
  it('membawa karyawan ke layar absensi bila memilih Check-out', async () => {
    const { getByText } = render(<PeringatanTrackingProvider>{null}</PeringatanTrackingProvider>);

    let hasil: Promise<string> = Promise.resolve('');
    act(() => {
      hasil = tampilkanPeringatanTracking({ kendala: 'izin-latar', konteks: 'sesi' });
    });
    fireEvent.press(getByText('Check-out'));

    expect(await hasil).toBe('checkout');
    expect(mockPush).toHaveBeenCalledWith('/absensi');
  });

  it('peringatan yang masih terbuka saat layout ditutup tidak menggantung check-in berikutnya', async () => {
    const pertama = render(<PeringatanTrackingProvider>{null}</PeringatanTrackingProvider>);
    let hasil: Promise<string> = Promise.resolve('');
    act(() => {
      hasil = tampilkanPeringatanTracking({ kendala: 'izin-latar', konteks: 'check-in' });
    });

    pertama.unmount();
    expect(await hasil).toBe('tutup');

    const kedua = render(<PeringatanTrackingProvider>{null}</PeringatanTrackingProvider>);
    let berikutnya: Promise<string> = Promise.resolve('');
    act(() => {
      berikutnya = tampilkanPeringatanTracking({ kendala: 'izin-latar', konteks: 'check-in' });
    });
    fireEvent.press(kedua.getByText('Nanti'));
    expect(await berikutnya).toBe('tutup');
  });
});
