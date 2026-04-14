import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockTrack = jest.fn();
const mockStartTracking = jest.fn();
const mockStopTracking = jest.fn();
const mockUploadBatch = jest.fn();
const mockDeleteUploadedFile = jest.fn();
const mockSyncIsOnline = jest.fn();
const mockPresentInfoMessage = jest.fn();
const mockPresentSuccessMessage = jest.fn();
const mockPresentAppError = jest.fn();
const mockRefetchStatus = jest.fn();
const mockMutate = jest.fn();
const mockMutateAsync = jest.fn();
const mockUseApiQuery = jest.fn();
const mockUseApiMutation = jest.fn();

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    token: 'token-1',
  }),
}));

jest.mock('@/lib/queryClient', () => ({
  queryKeys: {
    attendance: {
      status: (userId?: string) => ['attendance', 'status', userId],
      geofence: (userId?: string) => ['attendance', 'geofence', userId],
    },
  },
}));

jest.mock('@/hooks/queries', () => ({
  useApiQuery: (options: unknown) => mockUseApiQuery(options),
  useApiMutation: (options: unknown) => mockUseApiMutation(options),
  isOfflineMutationQueuedResult: (value: unknown) => {
    if (!value || typeof value !== 'object') return false;
    const queued = value as { __offline_queued__?: boolean; kind?: string };
    return queued.__offline_queued__ === true && queued.kind === 'offline-queued';
  },
}));

jest.mock('@/services/AttendanceTelemetryService', () => ({
  AttendanceTelemetryService: {
    track: (...args: unknown[]) => mockTrack(...args),
  },
}));

jest.mock('@/services/LocationTrackingService', () => ({
  LocationTrackingService: {
    startTracking: () => Promise.resolve(mockStartTracking()),
    stopTracking: () => Promise.resolve(mockStopTracking()),
  },
}));

jest.mock('@/services/SyncService', () => ({
  SyncService: {
    isOnline: () => mockSyncIsOnline(),
  },
}));

jest.mock('@/services/UploadService', () => ({
  uploadService: {
    uploadBatch: (...args: unknown[]) => mockUploadBatch(...args),
    deleteUploadedFile: (...args: unknown[]) => mockDeleteUploadedFile(...args),
  },
}));

jest.mock('@/utils/attendanceIdempotency', () => ({
  ensureAttendanceRequestId: (payload: Record<string, unknown>) => ({
    ...payload,
    requestId: 'att-offline-queued-1',
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
  presentAppError: (...args: unknown[]) => mockPresentAppError(...args),
  presentInfoMessage: (...args: unknown[]) => mockPresentInfoMessage(...args),
  presentSuccessMessage: (...args: unknown[]) => mockPresentSuccessMessage(...args),
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
  Camera: () => null,
  useCameraDevice: () => ({ formats: [{}] }),
  useCameraPermission: () => ({ hasPermission: true, requestPermission: jest.fn() }),
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
  captureRef: jest.fn(async () => 'file:///watermarked-attendance-photo.jpg'),
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

describe('absensi offline queue boundary', () => {
  const actualUseState = React.useState;
  let useStateCallCount = 0;

  beforeEach(() => {
    jest.clearAllMocks();
    useStateCallCount = 0;

    const geofenceQueryResult = {
      data: {
        policy: 'WARN',
        zones: [],
      },
    };

    const statusQueryResult = {
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
      refetch: mockRefetchStatus,
    };

    mockUseApiQuery.mockImplementation((options: any) => {
      if (options?.endpoint === '/api/mobile/attendance/geofence') {
        return geofenceQueryResult;
      }

      return statusQueryResult;
    });

    mockUseApiMutation.mockImplementation(() => ({
      mutate: mockMutate,
      mutateAsync: mockMutateAsync,
      isPending: false,
    }));

    mockSyncIsOnline.mockResolvedValue(false as never);
    mockUploadBatch.mockResolvedValue(['https://cdn.radpro.id/attendance/photo-1.jpg'] as never);
    mockMutate.mockResolvedValue(undefined as never);
    mockMutateAsync.mockResolvedValue({
      __offline_queued__: true,
      kind: 'offline-queued',
      endpoint: '/api/mobile/attendance/check-in',
      method: 'POST',
      queuedAt: '2026-04-13T10:00:00.000Z',
    } as never);

    const firstRenderOverrides = new Map<number, unknown>([
      [4, 'file:///attendance-photo.jpg'],
      [5, { coords: { latitude: -6.2, longitude: 106.8 } }],
      [6, 'Kantor Pusat'],
      [7, new Date('2026-04-13T08:00:00.000Z')],
    ]);

    jest.spyOn(React, 'useState').mockImplementation(((initialValue: unknown) => {
      const currentIndex = useStateCallCount;
      useStateCallCount += 1;

      if (currentIndex < 24 && firstRenderOverrides.has(currentIndex)) {
        return actualUseState(firstRenderOverrides.get(currentIndex));
      }

      return actualUseState(initialValue);
    }) as typeof React.useState);
  });

  it('tetap mengantre absensi saat offline sejak awal tanpa sukses final', async () => {
    const AbsensiScreen = require('../../app/(app)/absensi').default;
    const { getByText } = render(<AbsensiScreen />);

    mockMutateAsync.mockRejectedValueOnce(new Error('queue persist failed') as never);

    fireEvent.press(getByText('Kirim Absensi'));

    await waitFor(() => {
      expect(mockUploadBatch).not.toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockPresentAppError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          screen: 'AttendanceScreen',
          route: '/(app)/absensi',
        }),
      );
    });

    expect(mockPresentInfoMessage).not.toHaveBeenCalledWith(
      'Absensi disimpan untuk dikirim otomatis saat internet kembali.',
      'Offline',
    );
    expect(mockPresentSuccessMessage).not.toHaveBeenCalled();
    expect(mockStartTracking).not.toHaveBeenCalled();
    expect(mockRefetchStatus).not.toHaveBeenCalled();
  });

  it('membersihkan upload foto attendance online saat mutation gagal setelah upload sukses', async () => {
    const AbsensiScreen = require('../../app/(app)/absensi').default;
    const { getByText } = render(<AbsensiScreen />);

    mockSyncIsOnline.mockResolvedValue(true as never);
    mockMutateAsync.mockRejectedValueOnce(new Error('mutation failed after upload') as never);

    fireEvent.press(getByText('Kirim Absensi'));

    await waitFor(() => {
      expect(mockUploadBatch).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          photoUrl: 'https://cdn.radpro.id/attendance/photo-1.jpg',
        }),
      );
    });

    await waitFor(() => {
      expect(mockPresentAppError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          screen: 'AttendanceScreen',
          route: '/(app)/absensi',
        }),
      );
    });

    expect(mockTrack).toHaveBeenCalledWith(
      'attendance_photo_upload_failed',
      expect.objectContaining({
        requestId: 'att-offline-queued-1',
        reason: 'mutation failed after upload',
      }),
    );
    expect(mockDeleteUploadedFile).toHaveBeenCalledWith(
      'https://cdn.radpro.id/attendance/photo-1.jpg',
    );
    expect(mockPresentInfoMessage).not.toHaveBeenCalled();
  });
});
