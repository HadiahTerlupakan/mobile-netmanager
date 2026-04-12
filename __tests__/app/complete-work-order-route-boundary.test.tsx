import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

type RouteParams = { id?: string | string[] };

const mockUseLocalSearchParams = jest.fn<() => RouteParams>(() => ({ id: undefined }));
const mockUseApiMutation = jest.fn((options: unknown) => ({ mutate: jest.fn(), isPending: false, options }));
const mockApiGet = jest.fn(async (_url: string) => ({ data: {} }));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  useRouter: () => ({ back: jest.fn(), replace: jest.fn() }),
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
  useApiMutation: (options: unknown) => mockUseApiMutation(options),
}));

jest.mock('@/services/SyncService', () => ({
  SyncService: {
    isOnline: jest.fn(),
  },
}));

jest.mock('@/services/UploadService', () => ({
  uploadService: {
    uploadBatch: jest.fn(),
  },
}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: mockApiGet,
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/utils/errorPresenter', () => ({
  presentAppError: jest.fn(),
  presentErrorMessage: jest.fn(),
  presentInfoMessage: jest.fn(),
  presentSuccessMessage: jest.fn(),
}));

jest.mock('@/utils/date', () => ({
  formatDate: jest.fn(() => '12 Apr 2026 10:00'),
}));

jest.mock('@/utils/validation', () => ({
  CompleteWorkOrderSchema: {},
  sanitizeInput: jest.fn((value: string) => value),
  validateData: jest.fn(() => ({ success: true, data: { action: 'COMPLETE', notes: 'ok' } })),
}));

jest.mock('@/components/atoms/ImageWithCache', () => ({ ImageWithCache: () => null }));
jest.mock('@/components/molecules/LoadingModal', () => ({ __esModule: true, default: () => null }));
jest.mock('expo-image-picker', () => ({
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('expo-location', () => ({
  getLastKnownPositionAsync: jest.fn(async () => null),
  getCurrentPositionAsync: jest.fn(async () => null),
  reverseGeocodeAsync: jest.fn(async () => []),
  Accuracy: { Balanced: 'Balanced' },
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
}));
jest.mock('lucide-react-native', () => ({
  ArrowLeft: 'ArrowLeft',
  Camera: 'Camera',
  CheckCircle: 'CheckCircle',
  X: 'X',
}));
jest.mock('twrnc', () => () => ({}));

describe('complete work order route boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ id: undefined });
    mockApiGet.mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 'wo-route',
          workOrderNumber: 'WO-ROUTE',
        },
      },
    });
  });

  it('tidak mengambil detail atau membuat endpoint update saat route id belum valid', () => {
    const CompleteWorkOrderScreen = require('../../app/(app)/complete-work-order/[id]').default;

    render(<CompleteWorkOrderScreen />);

    expect(mockUseApiMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: '',
      }),
    );
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it('mengganti endpoint update ke work order id canonical dari detail', async () => {
    mockUseLocalSearchParams.mockReturnValue({ id: 'legacy-route-id' });
    mockApiGet.mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 'wo-canonical',
          workOrderNumber: 'WO-001',
        },
      },
    });
    const CompleteWorkOrderScreen = require('../../app/(app)/complete-work-order/[id]').default;

    render(<CompleteWorkOrderScreen />);

    await waitFor(() => {
      expect(mockUseApiMutation).toHaveBeenLastCalledWith(
        expect.objectContaining({
          endpoint: '/api/mobile/work-orders/wo-canonical/update',
        }),
      );
    });
  });
});
