import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

// Mode Customer pada Request WO memakai kontak yang diketik manual; pencarian
// pelanggan ke panel billing eksternal sudah dihapus karena panelnya tidak bisa dipakai.

type MutateCallbacks = {
  onSuccess: (result: unknown) => void;
  onError: (error: unknown) => void;
};

const mockRouterBack = jest.fn();
const mockMutate = jest.fn<(payload: Record<string, unknown>, callbacks: MutateCallbacks) => void>();
const mockUseApiQuery = jest.fn();
const mockPresentInfoMessage = jest.fn();
const mockPresentSuccessMessage = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockRouterBack }),
}));

jest.mock('@/hooks/useFeatureGuard', () => ({
  useFeatureGuard: jest.fn(),
}));

jest.mock('@/constants/features', () => ({
  AppFeature: {
    WORK_ORDER: 'work_order',
  },
}));

jest.mock('@/hooks/queries', () => ({
  useApiQuery: (options: unknown) => mockUseApiQuery(options),
  useCreateWorkOrderRequest: () => ({ mutate: mockMutate }),
  isOfflineMutationQueuedResult: jest.fn(() => false),
}));

jest.mock('@/utils/errorPresenter', () => ({
  presentAppError: jest.fn(),
  presentInfoMessage: (...args: unknown[]) => mockPresentInfoMessage(...args),
  presentSuccessMessage: (...args: unknown[]) => mockPresentSuccessMessage(...args),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

jest.mock('@/components/molecules/LoadingModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/molecules/SelectionModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
}));

jest.mock('lucide-react-native', () => ({
  AlertTriangle: () => null,
  ArrowLeft: () => null,
  Building2: () => null,
  Cable: () => null,
  ChevronDown: () => null,
  Truck: () => null,
  User: () => null,
  Wifi: () => null,
  Wrench: () => null,
  Zap: () => null,
}));

jest.mock('twrnc', () => () => ({}));

const renderScreen = () => {
  const RequestWorkOrderScreen = require('../../app/(app)/request-work-order').default;
  return render(<RequestWorkOrderScreen />);
};

describe('request work order — kontak pelanggan manual (mode Customer)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMutate.mockReset();
    mockUseApiQuery.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      error: null,
    });
  });

  it('menampilkan input kontak manual, bukan pencarian pelanggan', () => {
    const screen = renderScreen();

    expect(screen.queryByPlaceholderText('Cari nama / username / ID pelanggan...')).toBeNull();
    expect(screen.getByText('1. Data Pelanggan *')).toBeTruthy();
    expect(screen.getByLabelText('Nama Pelanggan')).toBeTruthy();
    expect(screen.getByLabelText('No. HP')).toBeTruthy();
    expect(screen.getByLabelText('Alamat')).toBeTruthy();
  });

  it('menampilkan template masalah hanya setelah nama pelanggan minimal 3 karakter', () => {
    const screen = renderScreen();
    const nameInput = screen.getByLabelText('Nama Pelanggan');

    fireEvent.changeText(nameInput, ' ab ');
    expect(screen.queryByText('FOC / UT')).toBeNull();

    fireEvent.changeText(nameInput, 'Budi');
    expect(screen.getByText('FOC / UT')).toBeTruthy();
  });

  it('mengirim payload kontak manual yang sudah dipangkas tanpa field tambahan', () => {
    const screen = renderScreen();

    fireEvent.changeText(screen.getByLabelText('Nama Pelanggan'), '  Budi Santoso ');
    fireEvent.changeText(screen.getByLabelText('No. HP'), ' 081234567890 ');
    fireEvent.changeText(screen.getByLabelText('Alamat'), 'Jl. Mawar No. 1');
    fireEvent.press(screen.getByText('FOC / UT'));
    fireEvent.press(screen.getByText('Kirim Request'));

    expect(mockMutate).toHaveBeenCalledTimes(1);
    const [payload] = mockMutate.mock.calls[0];
    expect(payload).toStrictEqual({
      type: 'TROUBLESHOOT',
      priority: 'URGENT',
      title: 'FOC / UT - Budi Santoso',
      description: 'Fiber Optic Cut / Unscheduled Troubleshoot - Pelanggan tidak bisa konek sama sekali',
      isInternal: false,
      contactName: 'Budi Santoso',
      contactPhone: '081234567890',
      locationAddress: 'Jl. Mawar No. 1',
      notes: undefined,
    });
  });

  it('tidak mengirim No. HP dan alamat yang dikosongkan', () => {
    const screen = renderScreen();

    fireEvent.changeText(screen.getByLabelText('Nama Pelanggan'), 'Budi');
    fireEvent.changeText(screen.getByLabelText('No. HP'), '   ');
    fireEvent.press(screen.getByText('Internet Lambat'));
    fireEvent.press(screen.getByText('Kirim Request'));

    const [payload] = mockMutate.mock.calls[0];
    expect(payload).toMatchObject({ contactName: 'Budi', title: 'Internet Lambat - Budi', isInternal: false });
    expect(payload.contactPhone).toBeUndefined();
    expect(payload.locationAddress).toBeUndefined();
  });

  it('menolak kontak tidak valid dengan pesan "Data Tidak Valid" tanpa mengirim request', () => {
    const screen = renderScreen();

    fireEvent.changeText(screen.getByLabelText('Nama Pelanggan'), 'Budi');
    fireEvent.changeText(screen.getByLabelText('No. HP'), '0812-3456-7890-1234-5678');
    fireEvent.press(screen.getByText('Relokasi'));
    fireEvent.press(screen.getByText('Kirim Request'));

    expect(mockPresentInfoMessage).toHaveBeenCalledWith('No. HP maksimal 20 karakter', 'Data Tidak Valid');
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('mengunci input kontak selama request sedang dikirim', () => {
    const screen = renderScreen();

    fireEvent.changeText(screen.getByLabelText('Nama Pelanggan'), 'Budi');
    fireEvent.press(screen.getByText('FOC / UT'));
    fireEvent.press(screen.getByText('Kirim Request'));

    expect(screen.getByLabelText('Nama Pelanggan').props.editable).toBe(false);
    expect(screen.getByLabelText('No. HP').props.editable).toBe(false);
    expect(screen.getByLabelText('Alamat').props.editable).toBe(false);
  });

  it('mengosongkan kontak pelanggan setelah request berhasil dikirim', () => {
    mockMutate.mockImplementation((_payload, callbacks) => callbacks.onSuccess({ data: {} }));
    const screen = renderScreen();

    fireEvent.changeText(screen.getByLabelText('Nama Pelanggan'), 'Budi');
    fireEvent.changeText(screen.getByLabelText('Alamat'), 'Jl. Mawar No. 1');
    fireEvent.press(screen.getByText('FOC / UT'));
    fireEvent.press(screen.getByText('Kirim Request'));

    expect(mockPresentSuccessMessage).toHaveBeenCalledTimes(1);
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Nama Pelanggan').props.value).toBe('');
    expect(screen.getByLabelText('Alamat').props.value).toBe('');
  });

  it('mengosongkan kontak pelanggan saat berpindah mode', () => {
    const screen = renderScreen();

    fireEvent.changeText(screen.getByLabelText('Nama Pelanggan'), 'Budi');
    fireEvent.press(screen.getByText('Internal (FOC)'));
    fireEvent.press(screen.getByText('Customer'));

    expect(screen.getByLabelText('Nama Pelanggan').props.value).toBe('');
  });
});
