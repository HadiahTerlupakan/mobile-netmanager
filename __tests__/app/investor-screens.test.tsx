import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockRingkasan = jest.fn();
const mockDaftarProyek = jest.fn();
const mockBagiHasil = jest.fn();
const mockSetoran = jest.fn();
const mockPencairan = jest.fn();
const mockRincian = jest.fn();
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
  useRincianProyekInvestor: (id: string) => mockRincian(id),
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
import RincianProyekInvestorScreen from '../../app/(investor)/proyek/[id]';

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
  totalCapitalReturned: '900000',
  activeProjectsCount: 1,
  projects: [{ id: 'p-1', name: 'Jaringan Desa Sukamaju', status: 'PENJUALAN', siteName: 'Sukamaju' }],
  subscribers: { total: 40, active: 35, paying: 30, paymentRatio: 85.7 },
  balance: { totalDeposit: 50000000, totalPayout: 2000000, activeBalance: 48000000, ownershipPercent: 25 },
  amountAwaitingPayment: 750000,
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

  it('Beranda menampilkan modal di proyek, jumlah proyek, uang masuk, dan proyek', () => {
    const layar = render(<BerandaInvestorScreen />);

    expect(layar.getByText('Budi Santoso')).toBeTruthy();
    expect(layar.getByText(rp('50.000.000'))).toBeTruthy();
    expect(layar.getByText('Modal saya di proyek')).toBeTruthy();
    expect(layar.getByText('Ikut di 1 proyek')).toBeTruthy();
    expect(layar.getByText(rp('2.000.000'))).toBeTruthy();
    expect(layar.getByText(rp('750.000'))).toBeTruthy();
    expect(layar.getByText('35 orang')).toBeTruthy();
    expect(layar.getByText('Bagi hasil saya sejauh ini')).toBeTruthy();
    expect(layar.getByText(rp('1.250.000'))).toBeTruthy();
    expect(layar.getByText(/^Modal kembali Rp.900\.000$/)).toBeTruthy();
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
          projectName: 'Jaringan Desa Sukamaju',
          capitalReturnAmount: 1000000,
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
    expect(layar.getByText('Jaringan Desa Sukamaju')).toBeTruthy();
    expect(layar.getByText('Agustus 2026 · bagian saya 25% dari laba Rp 10.000.000'.replace(/ Rp /, ' Rp\u00a0'))).toBeTruthy();
    expect(layar.getByText(rp('3.500.000'))).toBeTruthy();
    expect(layar.getByText(/^Bagi hasil Rp.2\.500\.000 \+ pengembalian modal Rp.1\.000\.000$/)).toBeTruthy();
    expect(layar.getByText('Siap dibayar')).toBeTruthy();

    fireEvent.press(layar.getByLabelText('Uang diterima'));
    expect(layar.getByText('Belum ada uang yang dikirim ke Anda.')).toBeTruthy();

    fireEvent.press(layar.getByLabelText('Modal'));
    expect(layar.getByText('Modal awal')).toBeTruthy();
    expect(layar.getByText('Ditolak')).toBeTruthy();
    expect(layar.getByText('Alasan ditolak: Bukti transfer buram')).toBeTruthy();
  });

  it('Rincian proyek: bagian saya per bulan memakai hitungan RAB, bulan ke-n berlabel kalender', () => {
    mockParam = { id: 'rab-1' };
    mockRincian.mockReturnValue(
      kueri({
        id: 'rab-1',
        name: 'Jaringan Desa Sukamaju',
        description: null,
        status: 'PENJUALAN',
        siteName: null,
        startDate: '2026-06-01T00:00:00.000Z',
        investmentAmount: '6000000',
        profitSharePercent: 30,
        projectedRevenue: '0',
        totalActualRevenue: '0',
        createdAt: '2026-06-01T00:00:00.000Z',
        targetSubscribers: 100,
        estimatedCurrentRevenue: '0',
        subscribers: { total: 0, active: 0, paying: 0, paymentRatio: 0 },
        myTotalProfitShare: 900000,
        myTotalCapitalReturn: 1800000,
        actualAchievements: [
          { id: 'a2', month: 2, year: 2026, achievedRevenue: '3000000', opex: '0', opexUsed: 1000000, myProfitShare: 300000, myCapitalReturn: 600000 },
          { id: 'a3', month: 3, year: 2026, achievedRevenue: '5000000', opex: '0', opexUsed: 1000000, myProfitShare: 600000, myCapitalReturn: 1200000 },
        ],
      }),
    );

    const layar = render(<RincianProyekInvestorScreen />);

    expect(mockRincian).toHaveBeenCalledWith('rab-1');
    expect(layar.getByText('30%')).toBeTruthy();
    expect(layar.getByText(rp('900.000'))).toBeTruthy();
    expect(layar.getByText(rp('1.800.000'))).toBeTruthy();
    const judulBulan = layar.getAllByText(/^Bulan ke-/).map((t) => t.props.children);
    expect(judulBulan).toEqual(['Bulan ke-3 · Agt 2026', 'Bulan ke-2 · Jul 2026']);
    expect(layar.getByText(/^Bagian saya: bagi hasil Rp.600\.000 \+ modal kembali Rp.1\.200\.000$/)).toBeTruthy();
  });
});
