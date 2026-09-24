import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import type { ProspekDetail } from '@/types/presurvei';

const mockPush = jest.fn();
const mockUbah = jest.fn();
const mockRefetch = jest.fn();
let mockProspek: ProspekDetail;
let mockIsOnline = true;
let mockIsErrorRincian = false;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'p-1' }),
}));
const mockUseFeatureGuard = jest.fn<(...args: unknown[]) => boolean>();
const mockUseRincianProspek = jest.fn<(...args: unknown[]) => void>();
jest.mock('@/hooks/useFeatureGuard', () => ({ useFeatureGuard: (...a: unknown[]) => mockUseFeatureGuard(...a) }));
jest.mock('@/hooks/queries/usePresurveiProspek', () => ({
  useRincianProspek: (...a: unknown[]) => {
    mockUseRincianProspek(...a);
    return { data: mockProspek, isPending: false, isError: mockIsErrorRincian, refetch: mockRefetch };
  },
}));
jest.mock('@/hooks/useIsOnline', () => ({ useIsOnline: () => mockIsOnline }));
jest.mock('@/hooks/presurvei/useUbahStatusProspek', () => ({
  useUbahStatusProspek: () => ({ mutate: mockUbah, isPending: false }),
}));
jest.mock('@/components/organisms/presurvei/RiwayatKegiatanProspek', () => ({ RiwayatKegiatanProspek: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => () => ({}));

const prospek = (over: Partial<ProspekDetail>): ProspekDetail => ({
  id: 'p-1',
  nama: 'Budi Santoso',
  noTelp: '081234567890',
  alamat: 'Jl. Kenanga 1',
  sumber: 'LAPANGAN',
  status: 'TERTARIK',
  pemilikId: 'sales-a',
  namaPemilik: null,
  paketDiminati: null,
  canvasingId: null,
  createdAt: '2026-09-20T00:00:00.000Z',
  email: null,
  latitude: null,
  longitude: null,
  shareloc: null,
  iklanId: null,
  registrationId: null,
  referralNama: null,
  catatan: null,
  konversiAt: null,
  isSiapDipromosikan: false,
  updatedAt: '2026-09-20T00:00:00.000Z',
  ...over,
});

const renderLayar = () => {
  const Layar = require('../../app/(app)/presurvei/prospek/[id]/index').default;
  return render(<Layar />);
};

describe('Rincian prospek', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProspek = prospek({});
    mockIsOnline = true;
    mockIsErrorRincian = false;
    mockUseFeatureGuard.mockReturnValue(true);
  });

  it('Ubah Status hanya menawarkan transisi sah', () => {
    const { getByText, queryByText } = renderLayar();

    fireEvent.press(getByText('Ubah Status'));

    expect(getByText('Negosiasi')).toBeTruthy();
    expect(getByText('Tidak minat')).toBeTruthy();
    expect(getByText('Tidak layak')).toBeTruthy();
    expect(queryByText('Deal')).toBeNull();
    expect(queryByText('Baru')).toBeNull();
  });

  it('memilih Negosiasi mengirim status itu', () => {
    const { getByText } = renderLayar();

    fireEvent.press(getByText('Ubah Status'));
    fireEvent.press(getByText('Negosiasi'));

    expect(mockUbah).toHaveBeenCalledWith('NEGOSIASI');
  });

  it('memilih Deal membuka form Jadikan Canvasing, bukan menulis status', () => {
    mockProspek = prospek({ status: 'NEGOSIASI' });
    const { getByText } = renderLayar();

    fireEvent.press(getByText('Ubah Status'));
    fireEvent.press(getByText('Deal'));

    expect(mockUbah).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(app)/presurvei/prospek/[id]/jadikan-canvasing',
      params: { id: 'p-1' },
    });
  });

  it('offline menonaktifkan Ubah Status dan menampilkan alasannya', () => {
    mockIsOnline = false;
    const { getByText, getByRole, queryByText } = renderLayar();

    fireEvent.press(getByText('Ubah Status'));

    expect(queryByText('Negosiasi')).toBeNull();
    expect(getByRole('button', { name: 'Ubah Status' }).props.accessibilityState).toEqual({ disabled: true });
    expect(getByText('Ubah Status dan Jadikan Canvasing butuh koneksi internet.')).toBeTruthy();
  });

  // Amandemen preflight: tombol Jadikan Canvasing juga wajib nonaktif saat
  // offline (`AksiProspek` sudah menerapkan `isAktif={isOnline}`), tapi
  // belum ada test yang membuktikannya — mutasi "isAktif Jadikan Canvasing →
  // true" lolos tanpa test ini (preflight-scan.md baris 99, tabel per-task
  // Task 15 — bukan S6, yang bertag Task 16).
  it('offline menonaktifkan Jadikan Canvasing', () => {
    mockIsOnline = false;
    mockProspek = prospek({ status: 'DEAL' });
    const { getByRole } = renderLayar();

    expect(getByRole('button', { name: 'Jadikan Canvasing' }).props.accessibilityState).toEqual({
      disabled: true,
    });
  });

  it('Jadikan Canvasing hanya untuk Deal yang belum punya canvasing', () => {
    mockProspek = prospek({ status: 'DEAL' });
    const deal = renderLayar();
    expect(deal.getByText('Jadikan Canvasing')).toBeTruthy();
    deal.unmount();

    mockProspek = prospek({ status: 'DEAL', canvasingId: 'cv-1' });
    const sudah = renderLayar();
    expect(sudah.queryByText('Jadikan Canvasing')).toBeNull();
  });

  it('Catat Follow-up membawa prospek ke form catat', () => {
    const { getByText } = renderLayar();

    fireEvent.press(getByText('Catat Follow-up'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(app)/presurvei/kegiatan/catat',
      params: { prospekId: 'p-1', prospekNama: 'Budi Santoso' },
    });
  });

  // Amandemen preflight (S4): data cache tidak boleh disembunyikan hanya
  // karena refetch offline gagal — layar harus tetap tampil selama ada
  // data, walau `isError` benar (refetch background yang gagal).
  it('menampilkan data cache walau refetch gagal (isError true, data ada)', () => {
    mockIsErrorRincian = true;
    const { getByText, queryByText } = renderLayar();

    expect(getByText('Budi Santoso')).toBeTruthy();
    expect(queryByText('Rincian prospek gagal dimuat.')).toBeNull();
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
