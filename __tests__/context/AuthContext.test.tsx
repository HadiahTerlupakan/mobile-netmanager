// @ts-nocheck
const mockLogger = {
  auth: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
  setTenantId: jest.fn(),
  sync: jest.fn(),
  db: jest.fn(),
  socket: jest.fn(),
};

const mockSecureStorage = {
  getItem: jest.fn(),
  setItemStrict: jest.fn(),
  setItem: jest.fn(),
  removeItemStrict: jest.fn(),
  removeItem: jest.fn(),
};

const mockStorage = {
  getItem: jest.fn(),
  setItemStrict: jest.fn(),
  setItem: jest.fn(),
  removeItemStrict: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

const mockQueryClient = { clear: jest.fn() };
const mockErrorReportingService = { captureException: jest.fn() };
const mockApi = { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() };
const mockPushNotificationService = {
  registerForPushNotificationsAsync: jest.fn(),
  addNotificationListeners: jest.fn(() => jest.fn()),
};
const mockFcmService = {
  syncFCMTokenToBackend: jest.fn(),
  onTokenRefresh: jest.fn(),
};
const mockDatabaseService = { clearSessionData: jest.fn() };
const mockRefreshTokenService = {
  saveRefreshToken: jest.fn(),
  clearRefreshToken: jest.fn(),
};
const mockTokenService = { setToken: jest.fn() };

jest.mock('@/utils/logger', () => ({ __esModule: true, default: mockLogger, logger: mockLogger }));
jest.mock('@/utils/storage', () => ({ SecureStorage: mockSecureStorage, Storage: mockStorage, secureStorage: null }));
jest.mock('@/lib/queryClient', () => ({ queryClient: mockQueryClient }));
jest.mock('@/services/ErrorReportingService', () => ({ errorReportingService: mockErrorReportingService }));
jest.mock('@/services/api', () => ({ __esModule: true, default: mockApi }));
jest.mock('@/services/PushNotificationService', () => mockPushNotificationService);
jest.mock('@/services/FirebaseMessagingService', () => ({ fcmService: mockFcmService }));
jest.mock('@/services/RefreshTokenService', () => ({ RefreshTokenService: mockRefreshTokenService }));
jest.mock('@/services/TokenService', () => ({ TokenService: mockTokenService }));
jest.mock('@/services/DatabaseService', () => ({ DatabaseService: mockDatabaseService }));
jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  DeviceEventEmitter: { addListener: jest.fn(() => ({ remove: jest.fn() })) },
  Platform: { OS: 'ios', select: jest.fn((values) => values.ios) },
}));

const React = require('react');
const { act, render, waitFor } = require('@testing-library/react-native');
const { AuthProvider, useAuth } = require('../../src/context/AuthContext');

beforeEach(() => {
  jest.clearAllMocks();
  mockSecureStorage.getItem.mockResolvedValue(null);
  mockSecureStorage.setItemStrict.mockResolvedValue(undefined);
  mockSecureStorage.removeItemStrict.mockResolvedValue(undefined);
  mockStorage.removeItemStrict.mockResolvedValue(undefined);
  mockStorage.clear.mockResolvedValue(undefined);
  mockApi.delete.mockResolvedValue(undefined);
  mockApi.get.mockResolvedValue({ data: { data: null } });
  mockRefreshTokenService.clearRefreshToken.mockResolvedValue(undefined);
  mockRefreshTokenService.saveRefreshToken.mockResolvedValue(undefined);
  mockDatabaseService.clearSessionData.mockResolvedValue(undefined);
  mockPushNotificationService.registerForPushNotificationsAsync.mockResolvedValue(undefined);
  mockFcmService.syncFCMTokenToBackend.mockResolvedValue(null);
  mockFcmService.onTokenRefresh.mockReturnValue(jest.fn());
  mockQueryClient.clear.mockClear();
  mockErrorReportingService.captureException.mockClear();
  mockTokenService.setToken.mockClear();
  mockLogger.setTenantId.mockClear();
});

const TestConsumer = ({ onRender }) => {
  const auth = useAuth();
  onRender(auth);
  return null;
};

const renderAuth = () => {
  let authContext;

  render(
    React.createElement(AuthProvider, null, React.createElement(TestConsumer, { onRender: (auth) => {
      authContext = auth;
    } }))
  );

  const waitForReady = () => waitFor(() => {
    expect(authContext?.isLoading).toBe(false);
  });

  return {
    getAuthContext: () => authContext,
    waitForReady,
    then: (resolve, reject) => waitForReady().then(() => resolve(authContext), reject),
  };
};

const loadStoredUser = (storedUser) => {
  mockSecureStorage.getItem.mockResolvedValueOnce('stored-token').mockResolvedValueOnce(JSON.stringify(storedUser));
};

const renderLoadedAuth = async (storedUser) => {
  if (storedUser) {
    loadStoredUser(storedUser);
  }

  const auth = renderAuth();
  await auth.waitForReady();
  return auth.getAuthContext();
};

describe('AuthContext', () => {
  describe('initial state', () => {
    it('should start in loading state', async () => {
      const auth = renderAuth();

      expect(auth.getAuthContext()?.isLoading).toBe(true);

      await auth.waitForReady();
      expect(auth.getAuthContext()?.isLoading).toBe(false);
    });

    it('should load stored session on mount', async () => {
      const storedUser = { id: '1', tenantId: 'tenant-1', name: 'Test User', email: 'test@test.com', role: 'employee' };
      mockSecureStorage.getItem.mockResolvedValueOnce('stored-token').mockResolvedValueOnce(JSON.stringify(storedUser));

      const auth = renderAuth();
      await auth.waitForReady();
      const authContext = auth.getAuthContext();

      expect(authContext?.token).toBe('stored-token');
      expect(authContext?.user).toEqual(storedUser);
    });
  });

  describe('signIn', () => {
    it('should save token to secure store', async () => {
      const authContext = await renderAuth();
      const newUser = { id: '2', tenantId: 'tenant-1', name: 'New User', email: 'new@test.com', role: 'admin' };

      await act(async () => {
        await authContext.signIn('new-token', newUser);
      });

      expect(mockSecureStorage.setItemStrict).toHaveBeenCalledWith('session_token', 'new-token');
      expect(mockSecureStorage.setItemStrict).toHaveBeenCalledWith('user_data', JSON.stringify(newUser));
    });

    it('resolves signIn before FCM token sync finishes for mobile users and does not call Expo push registration', async () => {
      const authContext = await renderAuth();
      const mobileUser = { id: '3', tenantId: 'tenant-1', name: 'Admin Mobile', email: 'admin@test.com', role: 'ADMIN' };

      let resolveFcmSync: (() => void) | undefined;
      let fcmSyncFinished = false;
      const fcmSyncPromise = new Promise<void>((resolve) => {
        resolveFcmSync = () => {
          fcmSyncFinished = true;
          resolve();
        };
      });
      mockFcmService.syncFCMTokenToBackend.mockReturnValue(fcmSyncPromise);

      let signInResolved = false;
      let signInPromise: Promise<void>;

      await act(async () => {
        signInPromise = authContext.signIn('mobile-token', mobileUser);
        signInPromise.then(() => {
          signInResolved = true;
        });
      });

      await waitFor(() => {
        expect(signInResolved).toBe(true);
      });

      expect(mockPushNotificationService.registerForPushNotificationsAsync).not.toHaveBeenCalled();
      expect(mockFcmService.syncFCMTokenToBackend).toHaveBeenCalledWith('add');
      expect(fcmSyncFinished).toBe(false);
      expect(mockFcmService.onTokenRefresh).toHaveBeenCalledTimes(1);

      resolveFcmSync?.();
      await expect(signInPromise!).resolves.toBeUndefined();
    });

    it('rolls back local session state when persistence fails mid-signIn', async () => {
      mockSecureStorage.setItemStrict.mockImplementation(async (key) => {
        if (key === 'user_data') throw new Error('disk full');
      });

      const authContext = await renderAuth();
      const newUser = { id: '2', tenantId: 'tenant-1', name: 'New User', email: 'new@test.com', role: 'admin' };

      await act(async () => {
        await authContext.signIn('new-token', newUser, 'refresh-token');
      });

      expect(mockTokenService.setToken).toHaveBeenLastCalledWith(null);
      expect(mockDatabaseService.clearSessionData).toHaveBeenCalled();
      expect(mockSecureStorage.removeItemStrict).toHaveBeenCalledWith('session_token');
      expect(mockSecureStorage.removeItemStrict).toHaveBeenCalledWith('user_data');

    });
  });

  describe('signOut', () => {
    it('should clear session from secure store', async () => {
      const storedUser = { id: '1', tenantId: 'tenant-1', name: 'Test User', email: 'test@test.com', role: 'employee' };
      mockSecureStorage.getItem.mockResolvedValueOnce('stored-token').mockResolvedValueOnce(JSON.stringify(storedUser));

      const authContext = await renderAuth();

      await act(async () => {
        await authContext.signOut();
      });

      expect(mockDatabaseService.clearSessionData).toHaveBeenCalled();
      expect(mockSecureStorage.removeItemStrict).toHaveBeenCalledWith('session_token');
      expect(mockSecureStorage.removeItemStrict).toHaveBeenCalledWith('user_data');
    });

    it('triggers FCM remove on sign out without calling the legacy mobile push-token endpoint', async () => {
      const storedUser = { id: '1', tenantId: 'tenant-1', name: 'Mitra User', email: 'mitra@test.com', role: 'MITRA' };
      mockSecureStorage.getItem.mockResolvedValueOnce('stored-token').mockResolvedValueOnce(JSON.stringify(storedUser));

      const authContext = await renderAuth();

      await act(async () => {
        await authContext.signOut();
      });

      expect(mockApi.delete).not.toHaveBeenCalledWith('/api/mobile/push-token');
      expect(mockFcmService.syncFCMTokenToBackend).toHaveBeenCalledWith('remove');
    });

    it('still clears local session when refresh-token cleanup fails', async () => {
      const storedUser = { id: '1', tenantId: 'tenant-1', name: 'Test User', email: 'test@test.com', role: 'employee' };
      mockSecureStorage.getItem.mockResolvedValueOnce('stored-token').mockResolvedValueOnce(JSON.stringify(storedUser));
      mockRefreshTokenService.clearRefreshToken.mockRejectedValueOnce(new Error('storage failure'));

      const authContext = await renderAuth();

      await act(async () => {
        await authContext.signOut({ skipApi: true });
      });

      expect(mockTokenService.setToken).toHaveBeenLastCalledWith(null);
      expect(mockDatabaseService.clearSessionData).toHaveBeenCalled();
      expect(mockSecureStorage.removeItemStrict).toHaveBeenCalledWith('session_token');
      expect(mockSecureStorage.removeItemStrict).toHaveBeenCalledWith('user_data');

    });
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside provider', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(React.createElement(TestConsumer, { onMount: () => {} }));
      }).toThrow('useAuth must be used within an AuthProvider');

      spy.mockRestore();
    });
  });
});
