import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

import type { MobilePelanggan } from '@/services/PelangganService';

type MutateCallbacks = { onSuccess?: () => void; onError?: (error: unknown) => void };
type PelangganPickerProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (pelanggan: MobilePelanggan) => void;
};

const mockMutate = jest.fn<(payload: Record<string, unknown>, callbacks?: MutateCallbacks) => void>();
const mockUseApiQuery = jest.fn();
const mockSearchParams = jest.fn<() => Record<string, string | undefined>>();
const mockSetParams = jest.fn();
const mockUseAuth = jest.fn<() => { user: { role: string; features: string[] } | null }>();
// expo-router mengembalikan objek router singleton yang identitasnya stabil di
// semua render; mock ini harus stabil juga supaya dependency effect layar
// berperilaku sama seperti di aplikasi.
const mockRouter = { back: jest.fn(), setParams: mockSetParams };

// Menangkap props yang diterima PelangganPicker setiap kali komponen ini
// di-mount, supaya `onSelect` bisa dipanggil langsung dari tes tanpa perlu
// mengetahui detail internal modal/FlashList-nya.
let mockPelangganPickerProps: PelangganPickerProps | null = null;

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockSearchParams(),
}));
jest.mock('@/hooks/useFeatureGuard', () => ({ useFeatureGuard: jest.fn() }));
jest.mock('@/context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
jest.mock('@/constants/features', () => ({
  AppFeature: { WORK_ORDER: 'm_work_order', PELANGGAN: 'm_pelanggan' },
}));
jest.mock('@/hooks/queries', () => ({
  useApiQuery: (options: unknown) => mockUseApiQuery(options),
  useCreateWorkOrderRequest: () => ({ mutate: mockMutate }),
  isOfflineMutationQueuedResult: jest.fn(() => false),
}));
jest.mock('@/components/molecules/PelangganPicker', () => ({
  PelangganPicker: (props: PelangganPickerProps) => {
    mockPelangganPickerProps = props;
    return null;
  },
}));
jest.mock('@/utils/errorPresenter', () => ({
  presentAppError: jest.fn(),
  presentInfoMessage: jest.fn(),
  presentSuccessMessage: jest.fn(),
}));
jest.mock('@/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('@/components/molecules/LoadingModal', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/molecules/SelectionModal', () => ({ __esModule: true, default: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@shopify/flash-list', () => ({ FlashList: () => null }));
// Layar memakai banyak ikon; proxy ini mengembalikan komponen kosong untuk ikon apa pun.
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => () => ({}));

const FIXTURE_PELANGGAN: MobilePelanggan = {
  id: 'plg-9',
  idPelanggan: 'PLG-009',
  nama: 'Siti Aminah',
  username: 'siti9',
  status: 'AKTIF',
  paket: 'Paket 20 Mbps',
  alamat: 'Jl. Melati No. 9',
  noTelp: '081298765432',
  jatuhTempo: '2026-01-01',
  siteId: 'site-1',
  siteName: 'POP Melati',
  latitude: null,
  longitude: null,
};

describe('request work order — tautan pelanggan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMutate.mockReset();
    mockSearchParams.mockReturnValue({});
    mockUseApiQuery.mockReturnValue({ data: [], isPending: false, isError: false, error: null });
    mockUseAuth.mockReturnValue({ user: { role: 'TEKNISI', features: ['m_pelanggan'] } });
    mockPelangganPickerProps = null;
  });

  const renderScreen = () => {
    const RequestWorkOrderScreen = require('../../app/(app)/request-work-order').default;
    return render(<RequestWorkOrderScreen />);
  };

  // Masuk ulang ke layar yang sama: <Tabs> mempertahankan instance komponen dan
  // hanya memperbarui route params, jadi tes ini me-render ulang elemen yang
  // sama alih-alih memanggil render() lagi (yang akan mem-mount ulang dan
  // menyembunyikan bug params).
  const rerenderScreen = (screen: ReturnType<typeof renderScreen>) => {
    const RequestWorkOrderScreen = require('../../app/(app)/request-work-order').default;
    screen.rerender(<RequestWorkOrderScreen />);
  };

  const submitFocUt = (screen: ReturnType<typeof renderScreen>) => {
    fireEvent.press(screen.getByText('FOC / UT'));
    fireEvent.press(screen.getByText('Kirim Request'));
  };

  it('mengisi nama pelanggan dari parameter daftar isolir', () => {
    mockSearchParams.mockReturnValue({ pelangganId: 'plg-1', pelangganNama: 'Budi Santoso' });

    const screen = renderScreen();

    expect(screen.getByLabelText('Nama Pelanggan').props.value).toBe('Budi Santoso');
  });

  it('mengirim pelangganId ketika WO diajukan dari daftar isolir', () => {
    mockSearchParams.mockReturnValue({ pelangganId: 'plg-1', pelangganNama: 'Budi Santoso' });

    const screen = renderScreen();
    submitFocUt(screen);

    const [payload] = mockMutate.mock.calls[0];
    expect(payload).toMatchObject({ pelangganId: 'plg-1', contactName: 'Budi Santoso' });
  });

  it('tidak menyertakan pelangganId untuk calon pelanggan yang diketik manual', () => {
    const screen = renderScreen();

    fireEvent.changeText(screen.getByLabelText('Nama Pelanggan'), 'Calon Pelanggan');
    submitFocUt(screen);

    const [payload] = mockMutate.mock.calls[0];
    expect(payload.pelangganId).toBeUndefined();
    expect(payload.contactName).toBe('Calon Pelanggan');
  });

  it('tidak mem-mount picker sebelum tombol "Pilih Pelanggan Terdaftar" ditekan', () => {
    renderScreen();

    expect(mockPelangganPickerProps).toBeNull();
  });

  it('menyembunyikan tombol pilih pelanggan dari pengguna tanpa m_pelanggan', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'TEKNISI', features: ['m_work_order'] } });

    const screen = renderScreen();

    expect(screen.queryByText('Pilih Pelanggan Terdaftar')).toBeNull();
    // Kontak manual tetap tersedia: gerbang ini hanya menutup pencarian pelanggan terdaftar.
    expect(screen.getByLabelText('Nama Pelanggan')).toBeTruthy();
  });

  it('menampilkan tombol pilih pelanggan untuk pengguna dengan m_pelanggan', () => {
    const screen = renderScreen();

    expect(screen.getByText('Pilih Pelanggan Terdaftar')).toBeTruthy();
  });

  it('menampilkan tombol pilih pelanggan untuk SUPER_ADMIN tanpa fitur eksplisit', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'SUPER_ADMIN', features: [] } });

    const screen = renderScreen();

    expect(screen.getByText('Pilih Pelanggan Terdaftar')).toBeTruthy();
  });

  it('mengirim pelangganId dan mengisi kontak dari pelanggan yang dipilih lewat picker', () => {
    const screen = renderScreen();

    fireEvent.press(screen.getByText('Pilih Pelanggan Terdaftar'));
    expect(mockPelangganPickerProps).not.toBeNull();

    act(() => {
      mockPelangganPickerProps!.onSelect(FIXTURE_PELANGGAN);
    });
    submitFocUt(screen);

    const [payload] = mockMutate.mock.calls[0];
    expect(payload).toMatchObject({
      pelangganId: FIXTURE_PELANGGAN.id,
      contactName: FIXTURE_PELANGGAN.nama,
      contactPhone: FIXTURE_PELANGGAN.noTelp,
      locationAddress: FIXTURE_PELANGGAN.alamat,
    });
  });

  it('menghapus tautan pelanggan setelah berpindah ke mode Internal lalu kembali ke Customer', () => {
    mockSearchParams.mockReturnValue({ pelangganId: 'plg-1', pelangganNama: 'Budi Santoso' });
    const screen = renderScreen();

    fireEvent.press(screen.getByText('Internal (FOC)'));
    fireEvent.press(screen.getByText('Customer'));
    fireEvent.changeText(screen.getByLabelText('Nama Pelanggan'), 'Budi Santoso');
    submitFocUt(screen);

    const [payload] = mockMutate.mock.calls[0];
    expect(payload.pelangganId).toBeUndefined();
  });

  it('melepas tautan pelanggan saat nama kontak diedit menjadi berbeda', () => {
    mockSearchParams.mockReturnValue({ pelangganId: 'plg-1', pelangganNama: 'Budi Santoso' });
    const screen = renderScreen();

    fireEvent.changeText(screen.getByLabelText('Nama Pelanggan'), 'Orang Lain');
    submitFocUt(screen);

    const [payload] = mockMutate.mock.calls[0];
    expect(payload.pelangganId).toBeUndefined();
    expect(payload.contactName).toBe('Orang Lain');
  });

  it('memakai pelanggan terbaru saat layar dimasuki lagi tanpa remount', () => {
    mockSearchParams.mockReturnValue({ pelangganId: 'plg-1', pelangganNama: 'Budi Santoso' });
    const screen = renderScreen();

    mockSearchParams.mockReturnValue({ pelangganId: 'plg-2', pelangganNama: 'Siti Aminah' });
    rerenderScreen(screen);
    submitFocUt(screen);

    const [payload] = mockMutate.mock.calls[0];
    expect(payload).toMatchObject({ pelangganId: 'plg-2', contactName: 'Siti Aminah' });
  });

  it('menerapkan lagi pelanggan yang sama saat diajukan ulang setelah WO pertama terkirim', () => {
    mockMutate.mockImplementation((_payload, callbacks) => callbacks?.onSuccess?.());
    mockSearchParams.mockReturnValue({ pelangganId: 'plg-1', pelangganNama: 'Budi Santoso' });
    const screen = renderScreen();

    submitFocUt(screen);

    // Params sudah dikonsumsi -> expo-router mengosongkannya, lalu pengguna
    // masuk lagi dari daftar isolir untuk pelanggan yang sama.
    mockSearchParams.mockReturnValue({});
    rerenderScreen(screen);
    mockSearchParams.mockReturnValue({ pelangganId: 'plg-1', pelangganNama: 'Budi Santoso' });
    rerenderScreen(screen);
    submitFocUt(screen);

    expect(mockMutate).toHaveBeenCalledTimes(2);
    const [secondPayload] = mockMutate.mock.calls[1];
    expect(secondPayload).toMatchObject({ pelangganId: 'plg-1', contactName: 'Budi Santoso' });
  });

  it('mengosongkan params setelah dikonsumsi supaya pelanggan yang sama bisa dikirim lagi', () => {
    mockSearchParams.mockReturnValue({ pelangganId: 'plg-1', pelangganNama: 'Budi Santoso' });

    renderScreen();

    expect(mockSetParams).toHaveBeenCalledWith({
      pelangganId: undefined,
      pelangganNama: undefined,
    });
  });

  it('mengembalikan mode ke Customer saat masuk dari daftar isolir', () => {
    const screen = renderScreen();

    fireEvent.press(screen.getByText('Internal (FOC)'));
    expect(screen.getByText('1. Pilih Department *')).toBeTruthy();

    mockSearchParams.mockReturnValue({ pelangganId: 'plg-1', pelangganNama: 'Budi Santoso' });
    rerenderScreen(screen);

    expect(screen.getByText('1. Data Pelanggan *')).toBeTruthy();
  });

  it('mempertahankan tautan pelanggan saat hanya No. HP yang diedit', () => {
    mockSearchParams.mockReturnValue({ pelangganId: 'plg-1', pelangganNama: 'Budi Santoso' });
    const screen = renderScreen();

    fireEvent.changeText(screen.getByLabelText('No. HP'), '081211112222');
    submitFocUt(screen);

    const [payload] = mockMutate.mock.calls[0];
    expect(payload).toMatchObject({ pelangganId: 'plg-1', contactPhone: '081211112222' });
  });
});
