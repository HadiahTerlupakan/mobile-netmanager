import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react-native';

const mockSubscribeToScope = jest.fn();
const mockUseLocalSearchParams = jest.fn<() => Record<string, string | undefined>>(() => ({ id: undefined }));

jest.mock('@/services/RealtimeService', () => ({
  realtimeService: {
    subscribeToScope: mockSubscribeToScope,
  },
}));

jest.mock('@/constants/features', () => ({
  AppFeature: {
    WORK_ORDER: 'work_order',
  },
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useFocusEffect: jest.fn(),
}));

jest.mock('@/hooks/useFeatureGuard', () => ({
  useFeatureGuard: jest.fn(),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    token: 'token-123',
    user: { id: 'user-1', role: 'USER', employeeType: 'TEKNISI' },
  }),
}));

jest.mock('@/hooks/queries', () => ({
  useWorkOrder: jest.fn(() => ({
    data: undefined,
    isPending: false,
    refetch: jest.fn(),
  })),
  useApiMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
  isOfflineMutationQueuedResult: jest.fn(() => false),
  queryKeys: {
    workOrders: {
      detail: jest.fn(() => ['work-orders', 'detail']),
    },
  },
}));

jest.mock('@/services/TenantService', () => ({
  TenantService: {
    getTenantUrl: jest.fn(() => 'https://tenant.test'),
  },
}));

jest.mock('@/services/UploadService', () => ({
  uploadService: {
    uploadCustom: jest.fn(),
  },
}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    socket: jest.fn(),
  },
}));

jest.mock('@/utils/errorPresenter', () => ({
  presentAppError: jest.fn(),
  presentInfoMessage: jest.fn(),
  presentSuccessMessage: jest.fn(),
}));

jest.mock('@/utils/date', () => ({
  formatDate: jest.fn(() => '2026-04-10'),
}));

jest.mock('@/components/atoms/ImageWithCache', () => ({ ImageWithCache: () => null }));
jest.mock('@/components/molecules/ImageViewerModal', () => ({ ImageViewerModal: () => null }));
jest.mock('@/components/molecules/LoadingModal', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/molecules/WorkOrderDetailSkeleton', () => ({ WorkOrderDetailSkeleton: () => null }));
jest.mock('@shopify/flash-list', () => ({ FlashList: 'FlashList' }));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 'Balanced' },
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('lucide-react-native', () => ({
  ArrowLeft: 'ArrowLeft',
  Calendar: 'Calendar',
  Camera: 'Camera',
  CheckCircle: 'CheckCircle',
  CheckSquare: 'CheckSquare',
  Clock: 'Clock',
  FileText: 'FileText',
  History: 'History',
  Image: 'ImageIcon',
  ListChecks: 'ListChecks',
  MapPin: 'MapPin',
  MessageSquare: 'MessageSquare',
  Package: 'Package',
  Pause: 'Pause',
  Phone: 'Phone',
  Play: 'Play',
  Square: 'Square',
  User: 'User',
  X: 'X',
}));
jest.mock('twrnc', () => () => ({}));

describe('mobile work order detail realtime boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscribeToScope.mockReturnValue(jest.fn());
    mockUseLocalSearchParams.mockReturnValue({ id: undefined });
  });

  it('does not subscribe to workorder realtime scope before the route id is available', () => {
    const WorkOrderDetailScreen = require('../../app/(app)/work-order-detail/[id]').default;

    render(<WorkOrderDetailScreen />);

    expect(mockSubscribeToScope).not.toHaveBeenCalled();
  });

  it('subscribes through the workorder realtime scope when the route id is available', () => {
    mockUseLocalSearchParams.mockReturnValue({ id: 'wo-1' } as { id?: string });
    const WorkOrderDetailScreen = require('../../app/(app)/work-order-detail/[id]').default;

    render(<WorkOrderDetailScreen />);

    expect(mockSubscribeToScope).toHaveBeenCalledWith({ kind: 'workorder', id: 'wo-1' }, expect.any(Function));
  });
});
