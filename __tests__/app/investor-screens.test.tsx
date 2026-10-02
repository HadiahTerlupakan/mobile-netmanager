import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockRingkasan = jest.fn();
const mockDaftarProyek = jest.fn();
const mockBagiHasil = jest.fn();
const mockSetoran = jest.fn();
const mockPencairan = jest.fn();
let mockParam: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => mockParam,
}));
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'inv-1', name: 'Budi Santoso', role: 'INVESTOR' } }),
}));
jest.mock('@/hooks/queries/useInvestor', () => ({
  useRingkasanInvestor: () => mockRingkasan(),
  useDaftarProyekInvestor: () => mockDaftarProyek(),
  useBagiHasilInvestor: () => mockBagiHasil(),
  useSetoranModalInvestor: () => mockSetoran(),
  usePencairanInvestor: () => mockPencairan(),
}));
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock('@/lib/queryClient', () => ({ queryKeys: { investor: { all: ['investor'] } } }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

import BerandaInvestorScreen from '../../app/(investor)/dashboard';
import KeuanganInvestorScreen from '../../app/(investor)/keuangan';
import DaftarProyekInvestorScreen from '../../app/(investor)/proyek';

/** Intl memakai spasi tak putus antara "Rp" dan angka. */
const rp = (angka: string) => new RegExp(`Rp\\s${angka.replace(/\./g, '\\.')}$`);

const kueri = <T,>(data: T, ubah: Record<string, unknown> = {}) => ({
  data,
  isLoading: false,
  isError: false,
  isRefetching: false,
  refetch: jest.fn(),
  ...ubah,
});

const RINGKASAN = {
  totalInvestment: '50000000',
  totalProjectedRevenue: '0',
  totalActualRevenue: '1250000',
  activeProjectsCount: 1,
  projects: [{ id: 'p-1', name: 'Jaringan Desa Sukamaju', status: 'PENJUALAN', siteName: 'Sukamaju' }],
  subscribers: { total: 40, active: 35, paying: 30, paymentRatio: 85.7 },
  balance: { totalDeposit: 50000000, totalPayout: 2000000, activeBalance: 48000000, ownershipPercent: 25 },
  profitShareAwaitingPayment: 750000,
};

describe('layar investor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParam = {};
    mockRingkasan.mockReturnValue(kueri(RINGKASAN));
    mockBagiHasil.mockReturnValue(kueri([]));
    mockSetoran.mockReturnValue(kueri([]));
    mockPencairan.mockReturnValue({ ...kueri(undefined), hasNextPage: false, fetchNextPage: jest.fn() });
  });

  it('Beranda menampilkan modal, bagian kepemilikan, uang masuk, dan proyek', () => {
    const layar = render(<BerandaInvestorScreen />);

    expect(layar.getByText('Budi Santoso')).toBeTruthy();
    expect(layar.getByText(rp('50.000.000'))).toBeTruthy();
    expect(layar.getByText('Bagian saya di usaha ini: 25%')).toBeTruthy();
    expect(layar.getByText(rp('2.000.000'))).toBeTruthy();
    expect(layar.getByText(rp('750.000'))).toBeTruthy();
    expect(layar.getByText('35 orang')).toBeTruthy();
    expect(layar.getByText('Jualan ke pelanggan')).toBeTruthy();

    fireEvent.press(layar.getByLabelText('Proyek Jaringan Desa Sukamaju'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/(investor)/proyek/[id]', params: { id: 'p-1' } });
  });

  it('Beranda gagal memuat menawarkan coba lagi', () => {
    const refetch = jest.fn();
    mockRingkasan.mockReturnValue(kueri(undefined, { isError: true, refetch }));

    const layar = render(<BerandaInvestorScreen />);
    fireEvent.press(layar.getByLabelText('Coba lagi'));

    expect(refetch).toHaveBeenCalled();
  });

  it('daftar proyek kosong memberi kalimat penjelas', () => {
    mockDaftarProyek.mockReturnValue(kueri([]));

    const layar = render(<DaftarProyekInvestorScreen />);

    expect(layar.getByText('Belum ada proyek untuk Anda.')).toBeTruthy();
  });

  it('Uang: tautan notifikasi ?bagian=modal langsung membuka bagian Modal', () => {
    mockParam = { bagian: 'modal' };

    const layar = render(<KeuanganInvestorScreen />);

    expect(layar.getByLabelText('Modal').props.accessibilityState).toEqual({ selected: true });
    expect(layar.getByText('Belum ada setoran modal.')).toBeTruthy();
  });

  it('Uang: bawaan bagi hasil, segmen berpindah ke uang diterima dan modal', () => {
    mockBagiHasil.mockReturnValue(
      kueri([
        {
          id: 'b-1',
          periodStart: '2026-08-01T00:00:00.000Z',
          periodEnd: '2026-08-31T00:00:00.000Z',
          netProfit: 10000000,
          sharePercent: 25,
          shareAmount: 2500000,
          status: 'APPROVED',
          paidAt: null,
        },
      ]),
    );
    mockSetoran.mockReturnValue(
      kueri([
        {
          id: 's-1',
          amount: 50000000,
          depositType: 'MODAL_AWAL',
          date: '2026-06-10T00:00:00.000Z',
          status: 'REJECTED',
          reference: null,
          rejectedReason: 'Bukti transfer buram',
        },
      ]),
    );

    const layar = render(<KeuanganInvestorScreen />);
    expect(layar.getByText('Agustus 2026')).toBeTruthy();
    expect(layar.getByText('Siap dibayar')).toBeTruthy();

    fireEvent.press(layar.getByLabelText('Uang diterima'));
    expect(layar.getByText('Belum ada uang yang dikirim ke Anda.')).toBeTruthy();

    fireEvent.press(layar.getByLabelText('Modal'));
    expect(layar.getByText('Modal awal')).toBeTruthy();
    expect(layar.getByText('Ditolak')).toBeTruthy();
    expect(layar.getByText('Alasan ditolak: Bukti transfer buram')).toBeTruthy();
  });
});
