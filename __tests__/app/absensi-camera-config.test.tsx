import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockUseApiQuery = jest.fn();
const mockUseApiMutation = jest.fn();
const mockRequestPermission = jest.fn();
const mockUseCameraFormat = jest.fn();
const mockCameraView: any = jest.fn((_props?: unknown) => null);

const mockCameraDevice = {
  formats: [{ id: 'device-format-0' }, { id: 'device-format-1' }],
  supportsLowLightBoost: true,
};

let geofenceQueryResult: any;
let statusQueryResult: any;

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    token: 'token-1',
  }),
}));

jest.mock('@/hooks/queries', () => ({
  useApiQuery: (options: unknown) => mockUseApiQuery(options),
  useApiMutation: (options: unknown) => mockUseApiMutation(options),
  isOfflineMutationQueuedResult: () => false,
}));

jest.mock('@/lib/queryClient', () => ({
  queryKeys: {
    attendance: {
      status: (userId?: string) => ['attendance', 'status', userId],
      geofence: (userId?: string) => ['attendance', 'geofence', userId],
    },
  },
}));

jest.mock('@/services/AttendanceTelemetryService', () => ({
  AttendanceTelemetryService: { track: jest.fn() },
}));

jest.mock('@/services/LocationTrackingService', () => ({
  LocationTrackingService: {
    startTracking: jest.fn(async () => true),
    stopTracking: jest.fn(async () => undefined),
  },
}));

jest.mock('@/services/SyncService', () => ({
  SyncService: {
    isOnline: jest.fn(async () => true),
  },
}));

jest.mock('@/services/UploadService', () => ({
  uploadService: {
    uploadBatch: jest.fn(),
    deleteUploadedFile: jest.fn(),
  },
}));

jest.mock('@/utils/attendanceIdempotency', () => ({
  ensureAttendanceRequestId: (payload: Record<string, unknown>) => ({
    ...payload,
    requestId: 'request-1',
  }),
}));

jest.mock('@/utils/attendanceCaptureState', () => ({
  getAttendanceCaptureState: () => ({
    disabled: false,
    hasActiveSession: false,
  }),
}));

jest.mock('@/utils/date', () => ({
  formatDate: () => '08:00:00',
}));

jest.mock('@/utils/errorPresenter', () => ({
  presentAppError: jest.fn(),
  presentInfoMessage: jest.fn(),
  presentSuccessMessage: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/hooks/useFeatureGuard', () => ({
  useFeatureGuard: jest.fn(),
}));

jest.mock('@/constants/features', () => ({
  AppFeature: {
    ABSENSI: 'absensi',
  },
}));

jest.mock('@/components/atoms/ImageWithCache', () => ({
  ImageWithCache: () => null,
}));

jest.mock('@/components/molecules/AttendanceSkeleton', () => ({
  AttendanceSkeleton: () => null,
}));

jest.mock('@/components/molecules/LoadingModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
}));

jest.mock('react-native-vision-camera', () => ({
  Camera: (props: unknown) => mockCameraView(props),
  useCameraDevice: () => mockCameraDevice,
  useCameraFormat: (...args: unknown[]) => (mockUseCameraFormat as any)(...args),
  useCameraPermission: () => ({ hasPermission: true, requestPermission: mockRequestPermission }),
  useFrameProcessor: () => undefined,
}));

jest.mock('react-native-vision-camera-face-detector', () => ({
  useFaceDetector: () => ({ detectFaces: () => [] }),
}));

jest.mock('react-native-worklets-core', () => ({
  Worklets: {
    createRunOnJS: (fn: unknown) => fn,
  },
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success' },
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getLastKnownPositionAsync: jest.fn(async () => ({
    coords: { latitude: -6.2, longitude: 106.8 },
  })),
  getCurrentPositionAsync: jest.fn(async () => ({
    coords: { latitude: -6.2, longitude: 106.8 },
  })),
  reverseGeocodeAsync: jest.fn(async () => [{ street: 'Jl. Test', district: 'Test', city: 'Jakarta' }]),
  Accuracy: { Balanced: 'balanced' },
}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
  },
}));

jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn(async () => 'file:///photo.jpg'),
}));

jest.mock('lucide-react-native', () => ({
  AlertTriangle: 'AlertTriangle',
  CalendarOff: 'CalendarOff',
  Camera: 'Camera',
  Clock: 'Clock',
  MapPin: 'MapPin',
  RefreshCw: 'RefreshCw',
  RotateCcw: 'RotateCcw',
  X: 'X',
}));

jest.mock('twrnc', () => () => ({}));

describe('absensi camera configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    geofenceQueryResult = {
      data: {
        policy: 'WARN',
        zones: [],
      },
    };

    statusQueryResult = {
      data: {
        success: true,
        today: {
          isHoliday: false,
          holidayName: null,
          isOffDay: false,
          isTukarLiburWorkDay: false,
          isTukarLiburLeaveDay: false,
        },
        data: {
          status: 'idle',
          checkInTime: null,
          checkOutTime: null,
          warningMessage: null,
          sourceAttendanceId: null,
          checkInAt: null,
          checkOutAt: null,
          attendanceStatus: null,
        },
      },
      refetch: jest.fn(),
    };

    mockUseCameraFormat.mockReturnValue({ id: 'stable-format' });
    mockUseApiQuery.mockImplementation((options: any) => {
      if (options?.endpoint === '/api/mobile/attendance/geofence') {
        return geofenceQueryResult;
      }

      return statusQueryResult;
    });

    mockUseApiMutation.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
    });
  });

  it('memakai format stabil dan low-light boost saat membuka kamera absensi', async () => {
    const AbsensiScreen = require('../../app/(app)/absensi').default;
    const { getByText } = render(<AbsensiScreen />);

    fireEvent.press(getByText('Ambil Foto Masuk'));

    await waitFor(() => {
      expect(mockUseCameraFormat).toHaveBeenCalledWith(mockCameraDevice, [
        { photoResolution: 'max' },
        { videoResolution: { width: 1280, height: 720 } },
        { fps: 30 },
      ]);
    });

    expect(mockCameraView).toHaveBeenCalledWith(
      expect.objectContaining({
        device: mockCameraDevice,
        format: { id: 'stable-format' },
        lowLightBoost: true,
      }),
    );
  });
});
