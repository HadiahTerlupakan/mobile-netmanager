import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockPost = jest.fn();
const mockInfo = jest.fn();
const mockWarn = jest.fn();
const mockError = jest.fn();

const mockPlatform = { OS: 'ios' };

const mockGetMessaging = jest.fn(() => 'mock-messaging');
const mockRequestPermission = jest.fn();
const mockIsDeviceRegisteredForRemoteMessages = jest.fn();
const mockRegisterDeviceForRemoteMessages = jest.fn();
const mockGetToken = jest.fn();
const mockOnTokenRefresh = jest.fn();

jest.mock('react-native', () => ({
  Platform: mockPlatform,
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
  },
}));

jest.mock('@react-native-firebase/messaging', () => ({
  AuthorizationStatus: {
    NOT_DETERMINED: -1,
    DENIED: 0,
    AUTHORIZED: 1,
    PROVISIONAL: 2,
    EPHEMERAL: 3,
  },
  getMessaging: mockGetMessaging,
  requestPermission: mockRequestPermission,
  isDeviceRegisteredForRemoteMessages: mockIsDeviceRegisteredForRemoteMessages,
  registerDeviceForRemoteMessages: mockRegisterDeviceForRemoteMessages,
  getToken: mockGetToken,
  onTokenRefresh: mockOnTokenRefresh,
}));

const { AuthorizationStatus } = jest.requireMock('@react-native-firebase/messaging');

describe('FirebaseMessagingService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockPlatform.OS = 'ios';
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
    expect(mockPost).toHaveBeenCalledWith('/api/mobile/mitra/fcm-token', {
      fcmToken: 'fcm-token-123',
      action: 'add',
    });
  });

  it('removes the current token without requesting notification permission again', async () => {
    mockIsDeviceRegisteredForRemoteMessages.mockReturnValue(true);
    mockGetToken.mockResolvedValue('fcm-token-123');
    mockPost.mockResolvedValue({});

    const fcmService = loadService();

    await expect(fcmService.syncFCMTokenToBackend('remove')).resolves.toBe('fcm-token-123');
    expect(mockRequestPermission).not.toHaveBeenCalled();
    expect(mockPost).toHaveBeenCalledWith('/api/mobile/mitra/fcm-token', {
      fcmToken: 'fcm-token-123',
      action: 'remove',
    });
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

    expect(mockPost).toHaveBeenCalledWith('/api/mobile/mitra/fcm-token', {
      fcmToken: 'fcm-token-refreshed',
      action: 'add',
    });
    expect(cleanup).toBe(unsubscribe);
  });
});
