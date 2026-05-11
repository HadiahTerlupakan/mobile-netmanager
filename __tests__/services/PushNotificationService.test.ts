// @ts-nocheck
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockOnMessage = jest.fn();
const mockOnNotificationOpenedApp = jest.fn();
const mockGetInitialNotification = jest.fn();
const mockGetMessaging = jest.fn(() => 'mock-messaging');

jest.mock('@react-native-firebase/messaging', () => ({
  getMessaging: mockGetMessaging,
  onMessage: mockOnMessage,
  onNotificationOpenedApp: mockOnNotificationOpenedApp,
  getInitialNotification: mockGetInitialNotification,
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('PushNotificationService', () => {
  const foregroundUnsubscribe = jest.fn();
  const openedUnsubscribe = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockOnMessage.mockReturnValue(foregroundUnsubscribe);
    mockOnNotificationOpenedApp.mockReturnValue(openedUnsubscribe);
    mockGetInitialNotification.mockResolvedValue({
      data: { url: '/notifications' },
      notification: { title: 'Inbox', body: 'New item' },
    });
  });

  it('maps initial FCM notification data without using the legacy Expo push-token flow', async () => {
    const { getInitialNotificationData } = require('@/services/PushNotificationService');

    await expect(getInitialNotificationData()).resolves.toEqual({ url: '/notifications' });

    expect(mockGetMessaging).toHaveBeenCalled();
    expect(mockGetInitialNotification).toHaveBeenCalledWith('mock-messaging');
  });

  it('subscribes foreground and opened-app FCM listeners and returns a cleanup function', () => {
    const { addNotificationListeners } = require('@/services/PushNotificationService');

    const onNotificationReceived = jest.fn();
    const onNotificationResponse = jest.fn();

    const cleanup = addNotificationListeners(onNotificationReceived, onNotificationResponse);

    expect(mockOnMessage).toHaveBeenCalledWith('mock-messaging', expect.any(Function));
    expect(mockOnNotificationOpenedApp).toHaveBeenCalledWith('mock-messaging', expect.any(Function));

    const foregroundHandler = mockOnMessage.mock.calls[0][1];
    foregroundHandler({
      data: { url: '/notifications' },
      notification: { title: 'Inbox', body: 'Foreground body' },
    });
    expect(onNotificationReceived).toHaveBeenCalledWith({
      title: 'Inbox',
      body: 'Foreground body',
      data: { url: '/notifications' },
    });

    const openedHandler = mockOnNotificationOpenedApp.mock.calls[0][1];
    openedHandler({
      data: { url: '/dashboard' },
      notification: { title: 'Opened', body: 'Opened body' },
    });
    expect(onNotificationResponse).toHaveBeenCalledWith({
      title: 'Opened',
      body: 'Opened body',
      data: { url: '/dashboard' },
    });

    cleanup();

    expect(foregroundUnsubscribe).toHaveBeenCalledTimes(1);
    expect(openedUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
