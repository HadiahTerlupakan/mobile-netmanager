import { act, fireEvent, render } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';

const mockApiGet = jest.fn<(url: string) => Promise<any>>();
const mockRouterBack = jest.fn();
const mockMutate = jest.fn();
const mockUseApiQuery = jest.fn();
const mockUseCreateWorkOrderRequest = jest.fn();

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
  useCreateWorkOrderRequest: (options?: unknown) => mockUseCreateWorkOrderRequest(options),
  isOfflineMutationQueuedResult: jest.fn(() => false),
}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: mockApiGet,
  },
}));

jest.mock('@/utils/errorPresenter', () => ({
  presentAppError: jest.fn(),
  presentInfoMessage: jest.fn(),
  presentSuccessMessage: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

jest.mock('@/utils/validation', () => ({
  RequestWorkOrderSchema: {},
  sanitizeInput: jest.fn((value: string) => value),
  validateData: jest.fn(() => ({ success: true, data: { title: 'ok', description: 'ok', notes: '' } })),
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
  Search: () => null,
  Truck: () => null,
  User: () => null,
  Wifi: () => null,
  Wrench: () => null,
  X: () => null,
  Zap: () => null,
}));

jest.mock('twrnc', () => () => ({}));

describe('request work order search boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockUseApiQuery.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      error: null,
    });

    mockUseCreateWorkOrderRequest.mockReturnValue({
      mutate: mockMutate,
    });

    mockApiGet.mockResolvedValue({
      data: {
        success: true,
        data: {
          draw: 1,
          recordsTotal: 1,
          recordsFiltered: 1,
          data: [],
        },
      },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('membatalkan pencarian pelanggan yang tertunda saat input dibersihkan', () => {
    const RequestWorkOrderScreen = require('../../app/(app)/request-work-order').default;
    const screen = render(<RequestWorkOrderScreen />);

    const input = screen.getByPlaceholderText('Cari nama / username / ID pelanggan...');

    fireEvent.changeText(input, 'an');
    fireEvent.changeText(input, '');

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it('membersihkan pencarian pelanggan yang tertunda saat screen di-unmount', () => {
    const RequestWorkOrderScreen = require('../../app/(app)/request-work-order').default;
    const screen = render(<RequestWorkOrderScreen />);

    const input = screen.getByPlaceholderText('Cari nama / username / ID pelanggan...');

    fireEvent.changeText(input, 'an');
    screen.unmount();

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockApiGet).not.toHaveBeenCalled();
  });
});
