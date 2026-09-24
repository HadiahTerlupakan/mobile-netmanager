import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

const mockJadikan = jest.fn();
let mockIsOnline = true;
let mockKameraProps: { onAmbil: (uri: string) => void } | null = null;

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'p-1', statusAsal: 'DEAL' }),
}));
const mockUseFeatureGuard = jest.fn<(...args: unknown[]) => boolean>();
const mockUseRincianProspek = jest.fn<(...args: unknown[]) => void>();
jest.mock('@/hooks/useFeatureGuard', () => ({ useFeatureGuard: (...a: unknown[]) => mockUseFeatureGuard(...a) }));
jest.mock('@/hooks/queries/usePresurveiProspek', () => ({
  useRincianProspek: (...a: unknown[]) => {
    mockUseRincianProspek(...a);
    return {
      data: { id: 'p-1', nama: 'Budi Santoso', status: 'NEGOSIASI', canvasingId: null },
      isPending: false,
      isError: false,
      refetch: jest.fn(),
    };
  },
}));
jest.mock('@/hooks/useIsOnline', () => ({ useIsOnline: () => mockIsOnline }));
jest.mock('@/hooks/presurvei/useJadikanCanvasing', () => ({
  useJadikanCanvasing: () => ({ mutate: mockJadikan, isPending: false }),
}));
jest.mock('@/components/organisms/presurvei/KameraBukti', () => ({
  KameraBukti: (props: { onAmbil: (uri: string) => void }) => {
    mockKameraProps = props;
    return null;
  },
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => () => ({}));

const renderLayar = () => {
  const Layar = require('../../app/(app)/presurvei/prospek/[id]/jadikan-canvasing').default;
  return render(<Layar />);
};

const isiForm = (layar: ReturnType<typeof renderLayar>) => {
  fireEvent.changeText(layar.getByLabelText('Nomor KTP'), '3201234567890001');
  fireEvent.changeText(layar.getByLabelText('Paket'), 'Home 20 Mbps');
};

/** Isi form dan lengkapi foto KTP lewat mock `KameraBukti`, sampai siap dikirim. */
const isiFormLengkap = (layar: ReturnType<typeof renderLayar>) => {
  isiForm(layar);
  fireEvent.press(layar.getByText('Ambil Foto KTP'));
  act(() => mockKameraProps?.onAmbil('file:///cache/ktp.jpg'));
};

describe('Jadikan Canvasing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsOnline = true;
    mockKameraProps = null;
    mockUseFeatureGuard.mockReturnValue(true);
  });

  it('memberi tahu bahwa prospek akan dipindah ke Deal lebih dulu', () => {
    const { getByText } = renderLayar();

    expect(getByText('Prospek akan dipindah ke Deal lebih dulu.')).toBeTruthy();
  });

  // Amandemen preflight-scan.md S6/R6: test sebelumnya tidak bergigi karena
  // form belum lengkap (tanpa foto KTP) sudah memblokir kirim duluan lewat
  // validasi klien, bukan lewat status online. Di sini form dilengkapi dulu
  // (termasuk foto KTP) supaya SATU-SATUNYA alasan tombol nonaktif adalah
  // offline, dan itu diperiksa lewat `accessibilityState` — bukan sekadar
  // "mutate tidak terpanggil" (pola sama `presurvei-rincian-prospek.test.tsx`).
  it('offline menonaktifkan tombol Jadikan Canvasing walau form lengkap', () => {
    mockIsOnline = false;
    const layar = renderLayar();
    isiFormLengkap(layar);

    expect(layar.getByRole('button', { name: 'Jadikan Canvasing' }).props.accessibilityState).toEqual({
      disabled: true,
    });
    expect(layar.getByText('Butuh koneksi internet untuk menjadikan canvasing.')).toBeTruthy();

    fireEvent.press(layar.getByText('Jadikan Canvasing'));
    expect(mockJadikan).not.toHaveBeenCalled();
  });

  it('menolak tanpa foto KTP', () => {
    const layar = renderLayar();
    isiForm(layar);

    fireEvent.press(layar.getByText('Jadikan Canvasing'));

    expect(mockJadikan).not.toHaveBeenCalled();
    expect(layar.getByText('Foto KTP belum diambil')).toBeTruthy();
  });

  it('mengirim status asal dari server, bukan dari parameter route', () => {
    const layar = renderLayar();
    isiFormLengkap(layar);

    fireEvent.press(layar.getByText('Jadikan Canvasing'));

    expect(mockJadikan).toHaveBeenCalledWith(
      {
        prospekId: 'p-1',
        statusAsal: 'NEGOSIASI',
        nilai: { noKtp: '3201234567890001', paket: 'Home 20 Mbps', kabel: '' },
        fotoKtpLokal: 'file:///cache/ktp.jpg',
      },
      expect.objectContaining({ onSettled: expect.any(Function) }),
    );
  });

  // Amandemen preflight-scan.md: penjaga kirim-dobel (`isMengirim` di
  // `useLayarJadikanCanvasing`) belum diuji — mutasi bisa dihapus tanpa
  // test merah manapun menangkapnya.
  it('menekan Jadikan Canvasing dua kali sebelum mutasi selesai hanya mengirim satu konversi', () => {
    const layar = renderLayar();
    isiFormLengkap(layar);

    const tombol = layar.getByText('Jadikan Canvasing');
    fireEvent.press(tombol);
    fireEvent.press(tombol);

    expect(mockJadikan).toHaveBeenCalledTimes(1);
  });
  describe('guard fitur sebelum memuat data (review akhir M6)', () => {
    it('tanpa izin presurvei: rincian tidak dimuat dan layar tidak dirender', () => {
      mockUseFeatureGuard.mockReturnValue(false);

      const { toJSON } = renderLayar();

      expect(mockUseFeatureGuard).toHaveBeenCalledWith('m_presurvei');
      expect(mockUseRincianProspek).toHaveBeenCalledWith('p-1', false);
      expect(mockUseRincianProspek).not.toHaveBeenCalledWith('p-1', true);
      expect(toJSON()).toBeNull();
    });

    it('dengan izin: rincian dimuat', () => {
      renderLayar();

      expect(mockUseRincianProspek).toHaveBeenCalledWith('p-1', true);
    });
  });
});
