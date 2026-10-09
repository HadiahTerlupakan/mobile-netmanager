import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';

/**
 * Absensi dulu memakai kode lokasinya sendiri, bukan `@/utils/labelLokasi`
 * seperti layar Lembur. Akibatnya tiga keadaan dilaporkan keliru: GPS yang
 * menyala tapi belum memberi fix disebut "tidak aktif", posisi yang tak
 * kunjung datang menggantung di "Mencari lokasi..." selamanya, dan geocode
 * kosong menghasilkan label " ,".
 */

const mockUseApiQuery = jest.fn();
const mockUseApiMutation = jest.fn();

let geofenceQueryResult: any;
let statusQueryResult: any;

const mockHasServicesEnabledAsync = jest.fn<() => Promise<boolean>>();
const mockGetLastKnownPositionAsync = jest.fn<() => Promise<unknown>>();
const mockGetCurrentPositionAsync = jest.fn<() => Promise<unknown>>();
const mockReverseGeocodeAsync = jest.fn<() => Promise<unknown[]>>();

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, token: 'token-1' }),
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
  SyncService: { isOnline: jest.fn(async () => true) },
}));

jest.mock('@/services/UploadService', () => ({
  uploadService: { uploadBatch: jest.fn(), deleteUploadedFile: jest.fn() },
}));

jest.mock('@/utils/attendanceIdempotency', () => ({
  ensureAttendanceRequestId: (payload: Record<string, unknown>) => ({
    ...payload,
    requestId: 'request-1',
  }),
}));

jest.mock('@/utils/attendanceCaptureState', () => ({
  getAttendanceCaptureState: () => ({ disabled: false, hasActiveSession: false }),
}));

jest.mock('@/utils/date', () => ({ formatDate: () => '08:00:00' }));

jest.mock('@/utils/errorPresenter', () => ({
  presentAppError: jest.fn(),
  presentInfoMessage: jest.fn(),
  presentSuccessMessage: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/hooks/useFeatureGuard', () => ({ useFeatureGuard: jest.fn() }));

jest.mock('@/constants/features', () => ({ AppFeature: { ABSENSI: 'absensi' } }));

jest.mock('@/components/atoms/ImageWithCache', () => ({ ImageWithCache: () => null }));

jest.mock('@/components/molecules/AttendanceSkeleton', () => ({
  AttendanceSkeleton: () => null,
}));

jest.mock('@/components/molecules/LoadingModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));

jest.mock('react-native-vision-camera', () => ({
  Camera: () => null,
  useCameraDevice: () => ({ formats: [], supportsLowLightBoost: true }),
  useCameraFormat: () => ({ id: 'format' }),
  useCameraPermission: () => ({ hasPermission: true, requestPermission: jest.fn() }),
  useFrameProcessor: () => undefined,
}));

jest.mock('react-native-vision-camera-face-detector', () => ({
  useFaceDetector: () => ({ detectFaces: () => [] }),
}));

jest.mock('react-native-worklets-core', () => ({
  Worklets: { createRunOnJS: (fn: unknown) => fn },
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success' },
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('expo-location', () => ({
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
  getForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted', canAskAgain: true })),
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  hasServicesEnabledAsync: () => mockHasServicesEnabledAsync(),
  getLastKnownPositionAsync: () => mockGetLastKnownPositionAsync(),
  getCurrentPositionAsync: () => mockGetCurrentPositionAsync(),
  reverseGeocodeAsync: () => mockReverseGeocodeAsync(),
  Accuracy: { Balanced: 'balanced' },
}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { addEventListener: jest.fn(() => jest.fn()) },
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

jest.mock('twrnc', () => require('twrnc-kosong'));

const KOORDINAT = { latitude: -6.175, longitude: 106.827 };

function renderAbsensi() {
  const AbsensiScreen = require('../../app/(app)/absensi').default;
  return render(<AbsensiScreen />);
}

describe('label lokasi absensi', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockHasServicesEnabledAsync.mockResolvedValue(true);
    mockGetLastKnownPositionAsync.mockResolvedValue(null);
    mockGetCurrentPositionAsync.mockResolvedValue({ coords: KOORDINAT });
    mockReverseGeocodeAsync.mockResolvedValue([
      { street: 'Jl. Sudirman', district: 'Tanah Abang', city: 'Jakarta' },
    ]);

    geofenceQueryResult = { data: { policy: 'WARN', zones: [] } };
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

    mockUseApiQuery.mockImplementation((options: any) =>
      options?.endpoint === '/api/mobile/attendance/geofence'
        ? geofenceQueryResult
        : statusQueryResult,
    );
    mockUseApiMutation.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
    });
  });

  it('menyebut sinyal belum didapat — bukan GPS mati — saat layanan lokasi menyala tapi posisi gagal', async () => {
    mockGetCurrentPositionAsync.mockRejectedValue(
      new Error('Current location is unavailable. Make sure that location services are enabled'),
    );

    const { getByText, queryByText } = renderAbsensi();

    await waitFor(() => {
      expect(getByText('Sinyal GPS belum didapat')).toBeTruthy();
    });
    expect(queryByText('GPS perangkat tidak aktif')).toBeNull();
  });

  it('tetap menyebut GPS perangkat tidak aktif saat layanan lokasi memang mati', async () => {
    mockHasServicesEnabledAsync.mockResolvedValue(false);

    const { getByText } = renderAbsensi();

    await waitFor(() => {
      expect(getByText('GPS perangkat tidak aktif')).toBeTruthy();
    });
    expect(mockGetCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('jatuh ke koordinat, bukan label " ,", saat geocode mengembalikan entri kosong', async () => {
    mockReverseGeocodeAsync.mockResolvedValue([{ street: '', district: '  ', city: null }]);

    const { getByText, queryByText } = renderAbsensi();

    await waitFor(() => {
      expect(getByText('-6.175000, 106.827000')).toBeTruthy();
    });
    expect(queryByText(' ,')).toBeNull();
  });

  it('berhenti menunggu posisi setelah tenggat, bukan menggantung di "Mencari lokasi..."', async () => {
    jest.useFakeTimers();
    mockGetCurrentPositionAsync.mockReturnValue(new Promise(() => {}));

    const { getByText, queryByText } = renderAbsensi();

    await waitFor(() => {
      expect(mockGetCurrentPositionAsync).toHaveBeenCalled();
    });

    act(() => { jest.advanceTimersByTime(15_000); });

    await waitFor(() => {
      expect(getByText('Sinyal GPS belum didapat')).toBeTruthy();
    });
    expect(queryByText('Mencari lokasi...')).toBeNull();

    jest.useRealTimers();
  });
});
