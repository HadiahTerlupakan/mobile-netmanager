import { act, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockUseSegments = jest.fn<() => string[]>();
const mockUseAuth = jest.fn();
const mockAddBreadcrumb = jest.fn();

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
    invalidateQueries: jest.fn(),
  },
}));

jest.mock('@/services/AppVersionService', () => ({
  appVersionService: {
    reportVersion: jest.fn(() => Promise.resolve()),
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

jest.mock('expo-notifications', () => ({
  getLastNotificationResponseAsync: jest.fn(() => Promise.resolve(null)),
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
  default: () => null,
}));

describe('RootLayout privacy route guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
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
});
