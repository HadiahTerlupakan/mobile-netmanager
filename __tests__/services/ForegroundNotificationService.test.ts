import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockCreateChannel = jest.fn<() => Promise<string>>();
const mockDisplayNotification = jest.fn<() => Promise<string>>();
const mockDeleteChannel = jest.fn<() => Promise<void>>();
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
    deleteChannel: mockDeleteChannel,
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
    mockCreateChannel.mockResolvedValue('high-priority-soft');
    mockDeleteChannel.mockResolvedValue(undefined);
    mockDisplayNotification.mockResolvedValue('notification-id');
  });

  it('creates the managed high-priority Android channel with the custom sound', async () => {
    const { ensureForegroundNotificationChannel } = require('@/services/ForegroundNotificationService');

    await expect(ensureForegroundNotificationChannel()).resolves.toBe('high-priority-soft');
    expect(mockCreateChannel).toHaveBeenCalledWith(expect.objectContaining({
      id: 'high-priority-soft',
      importance: 'high',
      sound: 'notif_soft',
    }));
  });

  it('removes the legacy channel whose sound Android refuses to change', async () => {
    // Android mengunci suara channel setelah dibuat — itu hak pengguna. Satu-
    // satunya cara mengganti nada adalah membuat channel baru dan membuang
    // yang lama, kalau tidak pemasangan lama tetap memakai nada bawaan.
    const { ensureForegroundNotificationChannel } = require('@/services/ForegroundNotificationService');

    await ensureForegroundNotificationChannel();

    expect(mockDeleteChannel).toHaveBeenCalledWith('high-priority');
  });

  it('uses the custom sound for foreground alerts on iOS', async () => {
    mockPlatform.OS = 'ios';
    const { presentForegroundNotification } = require('@/services/ForegroundNotificationService');

    await presentForegroundNotification({ title: 'Tagihan', body: 'Jatuh tempo' });

    expect(mockDisplayNotification).toHaveBeenCalledWith(expect.objectContaining({
      ios: expect.objectContaining({
        sound: 'notif_soft.wav',
      }),
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
        channelId: 'high-priority-soft',
        importance: 'high',
        pressAction: {
          id: 'default',
        },
        smallIcon: 'ic_launcher',
      }),
    }));
  });
});
