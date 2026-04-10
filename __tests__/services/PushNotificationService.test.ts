import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockPost = jest.fn<() => Promise<void>>();
const mockGetPermissionsAsync = jest.fn<() => Promise<{ status: string }>>();
const mockRequestPermissionsAsync = jest.fn<() => Promise<{ status: string }>>();
const mockGetExpoPushTokenAsync = jest.fn<() => Promise<{ data: string }>>();

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    post: mockPost,
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('axios', () => ({
  isAxiosError: (error: unknown) => Boolean((error as { isAxiosError?: boolean })?.isAxiosError),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        eas: {
          projectId: 'project-1',
        },
      },
    },
    easConfig: {
      projectId: 'project-1',
    },
  },
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: mockGetPermissionsAsync,
  requestPermissionsAsync: mockRequestPermissionsAsync,
  getExpoPushTokenAsync: mockGetExpoPushTokenAsync,
  setNotificationChannelAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  AndroidImportance: { MAX: 'MAX' },
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

describe('PushNotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[test]' });
    mockPost.mockResolvedValue(undefined);
  });

  it('does not register the same push token twice for the same session token', async () => {
    const { registerForPushNotificationsAsync } = require('@/services/PushNotificationService');

    await registerForPushNotificationsAsync('session-token');
    await registerForPushNotificationsAsync('session-token');

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith(
      '/api/mobile/push-token',
      { pushToken: 'ExponentPushToken[test]' },
      {
        skipGlobalAuthHandler: true,
        headers: { Authorization: 'Bearer session-token' },
      }
    );
  });
});
