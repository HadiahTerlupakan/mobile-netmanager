import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockPost = jest.fn<(url: string, body: unknown) => Promise<unknown>>();
const mockInfo = jest.fn<(message: string, ...args: unknown[]) => void>();
const mockWarn = jest.fn<(message: string, ...args: unknown[]) => void>();
const mockError = jest.fn<(message: string, ...args: unknown[]) => void>();
const mockDebug = jest.fn<(message: string, ...args: unknown[]) => void>();

const mockPlatform = { OS: 'ios', Version: 17 };
const mockPermissionsAndroid = {
  PERMISSIONS: {
    POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS',
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
  },
  request: jest.fn<(permission: string) => Promise<string>>(),
};
const mockAuthorizationStatus = {
  NOT_DETERMINED: -1,
  DENIED: 0,
  AUTHORIZED: 1,
  PROVISIONAL: 2,
  EPHEMERAL: 3,
} as const;

type AuthorizationStatusValue = typeof mockAuthorizationStatus[keyof typeof mockAuthorizationStatus];
type TokenRefreshListener = (token: string) => Promise<void> | void;

const mockGetMessaging = jest.fn<() => string>(() => 'mock-messaging');
const mockRequestPermission = jest.fn<(messaging: string) => Promise<AuthorizationStatusValue>>();
const mockIsDeviceRegisteredForRemoteMessages = jest.fn<(messaging: string) => boolean>();
const mockRegisterDeviceForRemoteMessages = jest.fn<(messaging: string) => Promise<void>>();
const mockGetToken = jest.fn<(messaging: string) => Promise<string | null>>();
const mockOnTokenRefresh = jest.fn<(
  messaging: string,
  listener: TokenRefreshListener
) => () => void>();

jest.mock('react-native', () => ({
  Platform: mockPlatform,
  PermissionsAndroid: mockPermissionsAndroid,
}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    post: mockPost,
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: mockInfo,
    warn: mockWarn,
    error: mockError,
    debug: mockDebug,
  },
}));

jest.mock('@react-native-firebase/messaging', () => ({
  AuthorizationStatus: mockAuthorizationStatus,
  getMessaging: mockGetMessaging,
  requestPermission: mockRequestPermission,
  isDeviceRegisteredForRemoteMessages: mockIsDeviceRegisteredForRemoteMessages,
  registerDeviceForRemoteMessages: mockRegisterDeviceForRemoteMessages,
  getToken: mockGetToken,
  onTokenRefresh: mockOnTokenRefresh,
}));

const AuthorizationStatus = mockAuthorizationStatus;

describe('FirebaseMessagingService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockPlatform.OS = 'ios';
    mockPlatform.Version = 17;
  });

  const loadService = () => {
    let fcmService: typeof import('@/services/FirebaseMessagingService').fcmService;

    jest.isolateModules(() => {
      ({ fcmService } = require('@/services/FirebaseMessagingService'));
    });

    return fcmService!;
  };

  it('requests permission on iOS and accepts authorized status', async () => {
    mockRequestPermission.mockResolvedValue(AuthorizationStatus.AUTHORIZED);

    const fcmService = loadService();

    await expect(fcmService.requestUserPermission()).resolves.toBe(true);
    expect(mockRequestPermission).toHaveBeenCalledWith('mock-messaging');
  });

  it('requests Android 13+ notification permission before allowing FCM notifications', async () => {
    mockPlatform.OS = 'android';
    mockPlatform.Version = 34;
    mockPermissionsAndroid.request.mockResolvedValue(mockPermissionsAndroid.RESULTS.GRANTED);

    const fcmService = loadService();

    await expect(fcmService.requestUserPermission()).resolves.toBe(true);
    expect(mockPermissionsAndroid.request).toHaveBeenCalledWith(
      mockPermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    expect(mockRequestPermission).not.toHaveBeenCalled();
  });

  it('registers the device, reads the token, and syncs add actions to the backend', async () => {
    mockRequestPermission.mockResolvedValue(AuthorizationStatus.AUTHORIZED);
    mockIsDeviceRegisteredForRemoteMessages.mockReturnValue(false);
    mockRegisterDeviceForRemoteMessages.mockResolvedValue(undefined);
    mockGetToken.mockResolvedValue('fcm-token-123');
    mockPost.mockResolvedValue({});

    const fcmService = loadService();

    await expect(fcmService.syncFCMTokenToBackend('add')).resolves.toBe('fcm-token-123');
    expect(mockRegisterDeviceForRemoteMessages).toHaveBeenCalledWith('mock-messaging');
    expect(mockGetToken).toHaveBeenCalledWith('mock-messaging');
    expect(mockPost).toHaveBeenCalledWith(
      '/api/mobile/fcm-token',
      {
        fcmToken: 'fcm-token-123',
        action: 'add',
      },
      expect.any(Object)
    );
  });

  it('does not write the raw token to logs while syncing to the backend', async () => {
    mockRequestPermission.mockResolvedValue(AuthorizationStatus.AUTHORIZED);
    mockIsDeviceRegisteredForRemoteMessages.mockReturnValue(false);
    mockRegisterDeviceForRemoteMessages.mockResolvedValue(undefined);
    mockGetToken.mockResolvedValue('fcm-token-123');
    mockPost.mockResolvedValue({});

    const fcmService = loadService();

    await fcmService.syncFCMTokenToBackend('add');

    const loggedOutput = mockInfo.mock.calls.flat().map(String).join(' ');
    expect(loggedOutput).not.toContain('fcm-token-123');
  });

  it('skips duplicate add syncs for the same token in a single runtime session', async () => {
    mockRequestPermission.mockResolvedValue(AuthorizationStatus.AUTHORIZED);
    mockIsDeviceRegisteredForRemoteMessages.mockReturnValue(true);
    mockGetToken.mockResolvedValue('fcm-token-123');
    mockPost.mockResolvedValue({});

    const fcmService = loadService();

    await expect(fcmService.syncFCMTokenToBackend('add')).resolves.toBe('fcm-token-123');
    await expect(fcmService.syncFCMTokenToBackend('add')).resolves.toBe('fcm-token-123');

    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('re-syncs add after the same token was removed previously', async () => {
    mockRequestPermission.mockResolvedValue(AuthorizationStatus.AUTHORIZED);
    mockIsDeviceRegisteredForRemoteMessages.mockReturnValue(true);
    mockGetToken.mockResolvedValue('fcm-token-123');
    mockPost.mockResolvedValue({});

    const fcmService = loadService();

    await fcmService.syncFCMTokenToBackend('add');
    await fcmService.syncFCMTokenToBackend('remove');
    await fcmService.syncFCMTokenToBackend('add');

    expect(mockPost).toHaveBeenCalledTimes(3);
    expect(mockPost).toHaveBeenNthCalledWith(
      1,
      '/api/mobile/fcm-token',
      {
        fcmToken: 'fcm-token-123',
        action: 'add',
      },
      expect.any(Object)
    );
    expect(mockPost).toHaveBeenNthCalledWith(
      2,
      '/api/mobile/fcm-token',
      {
        fcmToken: 'fcm-token-123',
        action: 'remove',
      },
      expect.any(Object)
    );
    expect(mockPost).toHaveBeenNthCalledWith(
      3,
      '/api/mobile/fcm-token',
      {
        fcmToken: 'fcm-token-123',
        action: 'add',
      },
      expect.any(Object)
    );
  });

  it('removes the current token without requesting notification permission again', async () => {
    mockIsDeviceRegisteredForRemoteMessages.mockReturnValue(true);
    mockGetToken.mockResolvedValue('fcm-token-123');
    mockPost.mockResolvedValue({});

    const fcmService = loadService();

    await expect(fcmService.syncFCMTokenToBackend('remove')).resolves.toBe('fcm-token-123');
    expect(mockRequestPermission).not.toHaveBeenCalled();
    expect(mockPost).toHaveBeenCalledWith(
      '/api/mobile/fcm-token',
      {
        fcmToken: 'fcm-token-123',
        action: 'remove',
      },
      expect.any(Object)
    );
  });

  it('subscribes to token refresh and re-syncs refreshed tokens', async () => {
    const unsubscribe = jest.fn();
    let refreshListener: ((token: string) => Promise<void> | void) | undefined;

    mockOnTokenRefresh.mockImplementation((_messaging, listener) => {
      refreshListener = listener;
      return unsubscribe;
    });
    mockPost.mockResolvedValue({});

    const fcmService = loadService();
    const cleanup = fcmService.onTokenRefresh();

    expect(mockOnTokenRefresh).toHaveBeenCalledWith('mock-messaging', expect.any(Function));

    await refreshListener?.('fcm-token-refreshed');

    expect(mockPost).toHaveBeenCalledWith(
      '/api/mobile/fcm-token',
      {
        fcmToken: 'fcm-token-refreshed',
        action: 'add',
      },
      expect.any(Object)
    );
    expect(cleanup).toBe(unsubscribe);
  });

  it('does not write refreshed tokens to logs in clear text', async () => {
    const unsubscribe = jest.fn();
    let refreshListener: ((token: string) => Promise<void> | void) | undefined;

    mockOnTokenRefresh.mockImplementation((_messaging, listener) => {
      refreshListener = listener;
      return unsubscribe;
    });
    mockPost.mockResolvedValue({});

    const fcmService = loadService();
    fcmService.onTokenRefresh();

    await refreshListener?.('fcm-token-refreshed');

    const loggedOutput = mockInfo.mock.calls.flat().map(String).join(' ');
    expect(loggedOutput).not.toContain('fcm-token-refreshed');
  });
});
