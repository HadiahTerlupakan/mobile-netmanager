import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react-native';

import { useSocketEvent, useSocketRoom } from '@/context/SocketContext';

jest.mock('@/constants/features', () => ({
  AppFeature: {
    WORK_ORDER: 'work_order',
  },
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(() => ({ id: undefined })),
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

jest.mock('@/context/SocketContext', () => ({
  useSocketRoom: jest.fn(),
  useSocketEvent: jest.fn(),
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

const mockUseSocketRoom = useSocketRoom as unknown as jest.MockedFunction<typeof useSocketRoom>;
const mockUseSocketEvent = useSocketEvent as unknown as jest.MockedFunction<typeof useSocketEvent>;

describe('mobile work order detail realtime boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not join a work order room or subscribe realtime events before the route id is available', () => {
    const WorkOrderDetailScreen = require('../../app/(app)/work-order-detail/[id]').default;

    render(<WorkOrderDetailScreen />);

    expect(mockUseSocketRoom).not.toHaveBeenCalledWith('workorder:undefined');
    expect(mockUseSocketEvent).not.toHaveBeenCalledWith('workorder.update', expect.any(Function));
    expect(mockUseSocketEvent).not.toHaveBeenCalledWith('workorder.activity', expect.any(Function));
  });
});
