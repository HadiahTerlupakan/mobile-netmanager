// @ts-nocheck
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockUseSegments = jest.fn<() => string[]>();
const mockUseAuth = jest.fn();
const mockAddBreadcrumb = jest.fn();
const mockGetInitialNotificationData = jest.fn();
const mockAddNotificationListeners = jest.fn(() => jest.fn());
const mockInvalidateQueries = jest.fn();
const mockPresentForegroundNotification = jest.fn(() => Promise.resolve());
const mockToastShow = jest.fn();
const mockStopMonitoring = jest.fn();

jest.mock('@/components/atoms/EnvironmentIndicator', () => ({
  EnvironmentIndicator: () => null,
}));

jest.mock('@/components/atoms/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/molecules/UpdateAvailableModal', () => ({
  UpdateAvailableModal: () => null,
}));

jest.mock('@/components/templates/UpdateRequiredScreen', () => ({
  UpdateRequiredScreen: () => null,
}));

jest.mock('@/context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/context/RealtimeProvider', () => ({
  RealtimeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/context/TenantContext', () => ({
  TenantProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/hooks/useAppVersion', () => ({
  useAppVersion: () => ({
    isChecking: false,
    downloadStatus: 'idle',
    downloadProgress: null,
    updateAvailable: false,
    isForceUpdate: false,
    latestVersion: null,
    error: null,
    checkForUpdate: jest.fn(),
    startUpdate: jest.fn(),
    applyVersionRequirement: jest.fn(),
    dismissError: jest.fn(),
    ignoreUpdate: jest.fn(),
  }),
}));

jest.mock('@/lib/queryClient', () => ({
  asyncStoragePersister: {},
  queryClient: {
    invalidateQueries: mockInvalidateQueries,
  },
  queryKeys: {
    notifications: {
      list: () => ['notifications', 'list'],
      unread: () => ['notifications', 'unread'],
    },
  },
}));


jest.mock('@/services/DatabaseService', () => ({
  DatabaseService: {
    initDatabase: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('@/services/ErrorReportingService', () => ({
  errorReportingService: {
    init: jest.fn(),
    captureException: jest.fn(),
    setUser: jest.fn(),
    clearUser: jest.fn(),
    addBreadcrumb: mockAddBreadcrumb,
  },
}));

jest.mock('@/services/PerformanceMonitor', () => ({
  performanceMonitor: {
    start: jest.fn(),
    stop: jest.fn(),
  },
}));

jest.mock('@/services/SyncService', () => ({
  SyncService: {
    startMonitoring: jest.fn(),
    stopMonitoring: mockStopMonitoring,
  },
}));

jest.mock('@/constants/appVersion', () => ({
  CURRENT_VERSION_CODE: 35,
  CURRENT_VERSION_NAME: '1.0.34',
}));

jest.mock('@/constants/Config', () => ({
  Config: {
    CAN_AUTO_CHECK_APP_UPDATES: false,
  },
}));

jest.mock('@/constants/Events', () => ({
  Events: {
    APP_VERSION_UNSUPPORTED: 'APP_VERSION_UNSUPPORTED',
  },
}));

jest.mock('@/utils/EventManager', () => ({
  eventManager: {
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    auth: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/config/toastConfig', () => ({
  toastConfig: {},
}));

jest.mock('@tanstack/react-query-persist-client', () => ({
  PersistQueryClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/services/PushNotificationService', () => ({
  getInitialNotificationData: mockGetInitialNotificationData,
  addNotificationListeners: mockAddNotificationListeners,
}));

jest.mock('@/services/ForegroundNotificationService', () => ({
  ensureForegroundNotificationChannel: jest.fn(() => Promise.resolve('high-priority')),
  presentForegroundNotification: mockPresentForegroundNotification,
}));

jest.mock('expo-router', () => ({
  Slot: () => null,
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  useSegments: () => mockUseSegments(),
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: Object.assign(() => null, {
    show: mockToastShow,
  }),
}));

describe('RootLayout privacy route guard', () => {
  it('uses the FCM notification bridge instead of the legacy Expo notification APIs', () => {
    const rootLayoutSource = readFileSync(
      join(__dirname, '../../src/hooks/useNotificationSetup.ts'),
      'utf8'
    );

    expect(rootLayoutSource).toContain('getInitialNotificationData');
    expect(rootLayoutSource).not.toContain('expo-notifications');
    expect(rootLayoutSource).not.toContain('getLastNotificationResponseAsync');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockGetInitialNotificationData.mockResolvedValue(null);
  });

  it('does not redirect logged-out users away from kebijakan-privasi', async () => {
    mockUseSegments.mockReturnValue(['kebijakan-privasi']);
    mockUseAuth.mockReturnValue({
      user: null,
      token: null,
      isLoading: false,
    });

    const RootLayout = require('../../app/_layout').default;

    render(<RootLayout />);

    await act(async () => {
      jest.advanceTimersByTime(150);
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not redirect logged-in employee users away from kebijakan-privasi', async () => {
    mockUseSegments.mockReturnValue(['kebijakan-privasi']);
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        role: 'SUPER_ADMIN',
        name: 'Test User',
        email: 'test@example.com',
      },
      token: null,
      isLoading: false,
    });

    const RootLayout = require('../../app/_layout').default;

    render(<RootLayout />);

    await act(async () => {
      jest.advanceTimersByTime(150);
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows a foreground toast when a push notification arrives while the app is open', async () => {
    let onForegroundNotification: ((notification: { title?: string | null; body?: string | null }) => void) | undefined;

    mockUseSegments.mockReturnValue(['(app)', 'dashboard']);
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        role: 'SUPER_ADMIN',
        name: 'Test User',
        email: 'test@example.com',
      },
      token: 'token-123',
      isLoading: false,
    });

    mockAddNotificationListeners.mockImplementation((onReceived) => {
      onForegroundNotification = onReceived;
      return jest.fn();
    });

    const RootLayout = require('../../app/_layout').default;

    render(<RootLayout />);

    await act(async () => {
      jest.advanceTimersByTime(150);
    });

    await act(async () => {
      onForegroundNotification?.({
        title: 'Work Order Baru',
        body: 'WO-20260415-0002',
      });
    });

    expect(mockToastShow).toHaveBeenCalledWith(expect.objectContaining({
      type: 'info',
      text1: 'Work Order Baru',
      text2: 'WO-20260415-0002',
    }));
  });

  it('refreshes both notification list and unread badge when a foreground push arrives', async () => {
    let onForegroundNotification: ((notification: { title?: string | null; body?: string | null; data?: Record<string, string> }) => void) | undefined;

    mockUseSegments.mockReturnValue(['(app)', 'dashboard']);
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        role: 'SUPER_ADMIN',
        name: 'Test User',
        email: 'test@example.com',
      },
      token: 'token-123',
      isLoading: false,
    });

    mockAddNotificationListeners.mockImplementation((onReceived) => {
      onForegroundNotification = onReceived;
      return jest.fn();
    });

    const RootLayout = require('../../app/_layout').default;

    render(<RootLayout />);

    await act(async () => {
      jest.advanceTimersByTime(150);
    });

    await act(async () => {
      await onForegroundNotification?.({
        title: 'Work Order Baru',
        body: 'WO-20260415-0002',
        data: {
          url: '/(app)/work-order-detail/wo-1',
        },
      });
    });

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['notifications', 'list'],
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['notifications', 'unread'],
    });
  });

  it('keeps refreshing notification caches even when Android heads-up rendering fails', async () => {
    let onForegroundNotification: ((notification: { title?: string | null; body?: string | null; data?: Record<string, string> }) => void) | undefined;

    mockUseSegments.mockReturnValue(['(app)', 'dashboard']);
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        role: 'SUPER_ADMIN',
        name: 'Test User',
        email: 'test@example.com',
      },
      token: 'token-123',
      isLoading: false,
    });
    mockPresentForegroundNotification.mockRejectedValueOnce(new Error('native display failed'));

    mockAddNotificationListeners.mockImplementation((onReceived) => {
      onForegroundNotification = onReceived;
      return jest.fn();
    });

    const RootLayout = require('../../app/_layout').default;

    render(<RootLayout />);

    await act(async () => {
      jest.advanceTimersByTime(150);
    });

    await act(async () => {
      await onForegroundNotification?.({
        title: 'Work Order Baru',
        body: 'WO-20260415-0002',
        data: {
          url: '/(app)/work-order-detail/wo-1',
        },
      });
    });

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['notifications', 'list'],
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['notifications', 'unread'],
    });
  });

  it('routes Android foreground notifications through the dedicated native foreground notification service', () => {
    const rootLayoutSource = readFileSync(
      join(__dirname, '../../src/hooks/useNotificationSetup.ts'),
      'utf8'
    );

    expect(rootLayoutSource).toContain('ForegroundNotificationService');
    expect(rootLayoutSource).toContain('presentForegroundNotification');
  });

  it('stops sync monitoring when the root layout unmounts after startup', async () => {
    mockUseSegments.mockReturnValue(['(app)', 'dashboard']);
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        role: 'SUPER_ADMIN',
        name: 'Test User',
        email: 'test@example.com',
      },
      token: 'token-123',
      isLoading: false,
    });

    const RootLayout = require('../../app/_layout').default;

    const { unmount } = render(<RootLayout />);

    await act(async () => {
      jest.advanceTimersByTime(1500);
    });

    unmount();

    expect(mockStopMonitoring).toHaveBeenCalled();
  });
});
