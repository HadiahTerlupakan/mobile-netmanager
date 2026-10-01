import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

type PesanSukses = (muatan: { salesId: string }) => string;

const mockMutate = jest.fn();
const mockUseSalesTersedia = jest.fn();
let mockParam: Record<string, string> = {};
let mockPesanSukses: PesanSukses | undefined;

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
    useLocalSearchParams: () => mockParam,
    useFocusEffect: (efek: () => void) => React.useEffect(() => efek(), [efek]),
  };
});
jest.mock('@/hooks/useFeatureGuard', () => ({ useFeatureGuard: () => true }));
jest.mock('@/hooks/useIsOnline', () => ({ useIsOnline: () => true }));
jest.mock('@/hooks/presurvei/useLingkupRencana', () => ({
  useLingkupRencana: () => ({ isPemberiTugas: true, penggunaId: 'k-1' }),
}));
jest.mock('@/hooks/queries/usePresurveiRencana', () => ({
  useRincianRencana: jest.fn(),
  useSalesTersediaRencana: (isAktif: boolean) => mockUseSalesTersedia(isAktif),
}));
jest.mock('@/hooks/presurvei/useMutasiRencana', () => ({
  useBuatRencana: (_onSelesai: () => void, pesanSukses: PesanSukses) => {
    mockPesanSukses = pesanSukses;
    return { mutate: mockMutate, isPending: false };
  },
}));
jest.mock('@/components/molecules/CustomDatePickerModal', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/organisms/presurvei/PilihProspekModal', () => ({ PilihProspekModal: () => null }));
jest.mock('@react-native-community/datetimepicker', () => ({ __esModule: true, default: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

import { keTanggalKalender } from '@/utils/presurvei/rencana';

import { ANGGOTA_TIM_BESAR } from '../fixtures/presurvei/timBesar';

const SALES_TIM = ANGGOTA_TIM_BESAR;

const renderLayar = () => {
  const Layar = require('../../app/(app)/presurvei/rencana/tugaskan').default;
  return render(<Layar />);
};

type Layar = ReturnType<typeof renderLayar>;

/** Buka pemilih sales, (opsional) cari, lalu ketuk anggota berlabel `label`. */
const pilihSales = (layar: Layar, label: string, kataKunci?: string) => {
  fireEvent.press(layar.getByLabelText('Pilih sales'));
  if (kataKunci !== undefined) fireEvent.changeText(layar.getByLabelText('Cari anggota'), kataKunci);
  fireEvent.press(layar.getByLabelText(label));
};

describe('Tugaskan Rencana', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParam = {};
    mockPesanSukses = undefined;
    mockUseSalesTersedia.mockReturnValue({ data: SALES_TIM, isError: false, refetch: jest.fn() });
  });

  it('sales wajib dipilih; tanpa sales tidak ada yang dikirim', () => {
    const { getByText, getByLabelText } = renderLayar();

    fireEvent.changeText(getByLabelText('Tujuan kunjungan'), 'Demo paket');
    fireEvent.press(getByText('Kirim Penugasan'));

    expect(mockUseSalesTersedia).toHaveBeenCalledWith(true);
    expect(getByText('Pilih sales yang ditugasi')).toBeTruthy();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('muatan penugasan menyertakan salesId sales terpilih; toast menyebut namanya', () => {
    const layar = renderLayar();
    const { getByText, getByLabelText, queryByText } = layar;

    pilihSales(layar, 'Sinta', 'sin');
    expect(queryByText('Pilih Sales')).toBeNull();
    expect(getByLabelText('Pilih sales').props.accessibilityValue).toEqual({ text: 'Sinta' });
    fireEvent.changeText(getByLabelText('Tujuan kunjungan'), '  Demo paket ');
    fireEvent.press(getByText('Kirim Penugasan'));

    expect(queryByText('Pilih sales yang ditugasi')).toBeNull();
    expect(mockMutate).toHaveBeenCalledWith({
      tanggal: keTanggalKalender(new Date()),
      jam: null,
      jenis: 'KUNJUNGAN',
      tujuan: 'Demo paket',
      prospekId: null,
      alamat: null,
      salesId: 's-2',
    });
    expect(mockPesanSukses?.({ salesId: 's-2' })).toBe('Penugasan terkirim ke Sinta');
  });

  it('diri sendiri ditandai (Saya) dan boleh dipilih', () => {
    const layar = renderLayar();
    const { getByText, getByLabelText } = layar;

    pilihSales(layar, 'Kepala Andi (Saya)');
    expect(getByText('Kepala Andi (Saya)')).toBeTruthy();
    fireEvent.changeText(getByLabelText('Tujuan kunjungan'), 'Survei tiang');
    fireEvent.press(getByText('Kirim Penugasan'));

    expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({ salesId: 'k-1' }));
  });

  it('dibuka dari filter tim: anggota itu langsung terpilih', () => {
    mockParam = { salesId: 's-2' };
    const { getByLabelText } = renderLayar();

    expect(getByLabelText('Pilih sales').props.accessibilityValue).toEqual({ text: 'Sinta' });
    fireEvent.press(getByLabelText('Pilih sales'));
    expect(getByLabelText('Sinta').props.accessibilityState).toEqual({ selected: true });
  });

  it('pemilih sales bercari tanpa opsi Semua; menutup tanpa memilih tidak mengubah apa pun', () => {
    const { getByLabelText, queryByLabelText, getByText } = renderLayar();

    expect(getByLabelText('Pilih sales').props.accessibilityValue).toEqual({ text: 'Belum dipilih' });
    fireEvent.press(getByLabelText('Pilih sales'));
    expect(queryByLabelText('Semua anggota')).toBeNull();
    fireEvent.changeText(getByLabelText('Cari anggota'), 'wat');
    expect(getByLabelText('Wati')).toBeTruthy();
    expect(queryByLabelText('Sinta')).toBeNull();

    fireEvent.press(getByText('Tutup'));
    expect(queryByLabelText('Cari anggota')).toBeNull();
    expect(getByLabelText('Pilih sales').props.accessibilityValue).toEqual({ text: 'Belum dipilih' });
  });

  it('daftar sales gagal dimuat: pesan yang bisa diketuk untuk coba lagi', () => {
    const refetch = jest.fn();
    mockUseSalesTersedia.mockReturnValue({ data: undefined, isError: true, refetch });
    const { getByLabelText } = renderLayar();

    fireEvent.press(getByLabelText('Muat ulang daftar sales'));

    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
