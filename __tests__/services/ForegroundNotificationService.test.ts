import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockCreateChannel = jest.fn<() => Promise<string>>();
const mockDisplayNotification = jest.fn<() => Promise<string>>();
const mockPlatform = {
  OS: 'android',
};

jest.mock('react-native', () => ({
  Platform: mockPlatform,
}));

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel: mockCreateChannel,
    displayNotification: mockDisplayNotification,
  },
  AndroidImportance: {
    HIGH: 'high',
  },
}));

describe('ForegroundNotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockPlatform.OS = 'android';
    mockCreateChannel.mockResolvedValue('high-priority');
    mockDisplayNotification.mockResolvedValue('notification-id');
  });

  it('creates the managed high-priority Android channel', async () => {
    const { ensureForegroundNotificationChannel } = require('@/services/ForegroundNotificationService');

    await expect(ensureForegroundNotificationChannel()).resolves.toBe('high-priority');
    expect(mockCreateChannel).toHaveBeenCalledWith(expect.objectContaining({
      id: 'high-priority',
      name: 'High Priority Notifications',
      importance: 'high',
    }));
  });

  it('displays a high-priority Android heads-up notification for foreground FCM messages', async () => {
    const { presentForegroundNotification } = require('@/services/ForegroundNotificationService');

    await presentForegroundNotification({
      title: 'Work Order Baru',
      body: 'WO-20260415-0002',
      data: {
        url: '/(app)/work-order-detail/wo-1',
      },
    });

    expect(mockCreateChannel).toHaveBeenCalled();
    expect(mockDisplayNotification).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Work Order Baru',
      body: 'WO-20260415-0002',
      data: {
        url: '/(app)/work-order-detail/wo-1',
      },
      android: expect.objectContaining({
        channelId: 'high-priority',
        importance: 'high',
        pressAction: {
          id: 'default',
        },
        smallIcon: 'notification_icon',
      }),
    }));
  });
});
