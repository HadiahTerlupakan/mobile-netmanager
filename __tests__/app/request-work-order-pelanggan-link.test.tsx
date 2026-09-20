import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

type MutateCallbacks = { onSuccess?: () => void; onError?: (error: unknown) => void };

const mockMutate = jest.fn<(payload: Record<string, unknown>, callbacks?: MutateCallbacks) => void>();
const mockUseApiQuery = jest.fn();
const mockSearchParams = jest.fn<() => Record<string, string | undefined>>();
const mockPelangganList = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
  useLocalSearchParams: () => mockSearchParams(),
}));
jest.mock('@/hooks/useFeatureGuard', () => ({ useFeatureGuard: jest.fn() }));
jest.mock('@/constants/features', () => ({
  AppFeature: { WORK_ORDER: 'm_work_order', PELANGGAN: 'm_pelanggan' },
}));
jest.mock('@/hooks/queries', () => ({
  useApiQuery: (options: unknown) => mockUseApiQuery(options),
  useCreateWorkOrderRequest: () => ({ mutate: mockMutate }),
  isOfflineMutationQueuedResult: jest.fn(() => false),
}));
jest.mock('@/hooks/queries/usePelangganList', () => ({
  usePelangganList: (params: unknown) => mockPelangganList(params),
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

const emptyPelangganList = {
  data: { pages: [{ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } }] },
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetching: false,
};

describe('request work order — tautan pelanggan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMutate.mockReset();
    mockSearchParams.mockReturnValue({});
    mockPelangganList.mockReturnValue(emptyPelangganList);
    mockUseApiQuery.mockReturnValue({ data: [], isPending: false, isError: false, error: null });
  });

  const renderScreen = () => {
    const RequestWorkOrderScreen = require('../../app/(app)/request-work-order').default;
    return render(<RequestWorkOrderScreen />);
  };

  it('mengisi nama pelanggan dari parameter daftar isolir', () => {
    mockSearchParams.mockReturnValue({ pelangganId: 'plg-1', pelangganNama: 'Budi Santoso' });

    const screen = renderScreen();

    expect(screen.getByLabelText('Nama Pelanggan').props.value).toBe('Budi Santoso');
  });

  it('mengirim pelangganId ketika WO diajukan dari daftar isolir', () => {
    mockSearchParams.mockReturnValue({ pelangganId: 'plg-1', pelangganNama: 'Budi Santoso' });

    const screen = renderScreen();
    fireEvent.press(screen.getByText('FOC / UT'));
    fireEvent.press(screen.getByText('Kirim Request'));

    const [payload] = mockMutate.mock.calls[0];
    expect(payload).toMatchObject({ pelangganId: 'plg-1', contactName: 'Budi Santoso' });
  });

  it('tidak menyertakan pelangganId untuk calon pelanggan yang diketik manual', () => {
    const screen = renderScreen();

    fireEvent.changeText(screen.getByLabelText('Nama Pelanggan'), 'Calon Pelanggan');
    fireEvent.press(screen.getByText('FOC / UT'));
    fireEvent.press(screen.getByText('Kirim Request'));

    const [payload] = mockMutate.mock.calls[0];
    expect(payload.pelangganId).toBeUndefined();
    expect(payload.contactName).toBe('Calon Pelanggan');
  });
});
