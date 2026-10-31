import { beforeEach, describe, expect, it, jest } from '@jest/globals';

type Channel = { id: string; sound?: string; importance?: string; vibration?: boolean };
type DisplayedNotification = {
  id?: string;
  title?: string;
  body?: string;
  data?: Record<string, string>;
  android?: {
    channelId?: string;
    groupId?: string;
    groupSummary?: boolean;
  };
  ios?: {
    sound?: string;
    foregroundPresentationOptions?: Record<string, boolean>;
  };
};

const mockCreateChannel = jest.fn<(channel: Channel) => Promise<string>>();
const mockDisplayNotification = jest.fn<(notification: DisplayedNotification) => Promise<string>>();
const mockDeleteChannel = jest.fn<(channelId: string) => Promise<void>>();
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
    LOW: 'low',
    HIGH: 'high',
  },
}));

describe('ForegroundNotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockPlatform.OS = 'android';
    mockCreateChannel.mockResolvedValue('high-priority-bubble');
    mockDeleteChannel.mockResolvedValue(undefined);
    mockDisplayNotification.mockResolvedValue('notification-id');
  });

  it('creates the managed high-priority Android channel with the custom sound', async () => {
    const { ensureForegroundNotificationChannel } = require('@/services/ForegroundNotificationService');

    await expect(ensureForegroundNotificationChannel()).resolves.toBe('high-priority-bubble');
    expect(mockCreateChannel).toHaveBeenCalledWith(expect.objectContaining({
      id: 'high-priority-bubble',
      importance: 'high',
      sound: 'notif_soft',
    }));
  });

  it('removes the legacy channels whose sound Android refuses to change', async () => {
    // Android mengunci suara channel setelah dibuat — itu hak pengguna. Satu-
    // satunya cara mengganti nada adalah membuat channel baru dan membuang
    // yang lama, kalau tidak pemasangan lama tetap memakai nada bawaan.
    const { ensureForegroundNotificationChannel } = require('@/services/ForegroundNotificationService');

    await ensureForegroundNotificationChannel();

    expect(mockDeleteChannel).toHaveBeenCalledWith('high-priority');
    expect(mockDeleteChannel).toHaveBeenCalledWith('high-priority-soft');
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
        channelId: 'high-priority-bubble',
        importance: 'high',
        pressAction: {
          id: 'default',
        },
        smallIcon: 'ic_launcher',
      }),
    }));
  });

  describe('push yang diredam (isSenyap)', () => {
    const PUSH = {
      title: 'Work Order Baru',
      body: 'WO-20260415-0003',
      data: { url: '/(app)/work-order-detail/wo-3' },
    };

    beforeEach(() => {
      mockCreateChannel.mockImplementation(async (channel) => channel.id);
    });

    it('Android: tampil di channel tanpa suara, bukan di channel bernada', async () => {
      const { presentForegroundNotification } = require('@/services/ForegroundNotificationService');

      await presentForegroundNotification(PUSH, { isSenyap: true });

      const channelSenyap = mockCreateChannel.mock.calls
        .map(([channel]) => channel)
        .find((channel) => channel.importance === 'low');
      expect(channelSenyap).toBeDefined();
      expect(channelSenyap?.sound).toBeUndefined();
      expect(channelSenyap?.vibration).toBe(false);

      const anak = mockDisplayNotification.mock.calls
        .map(([notifikasi]) => notifikasi)
        .find((notifikasi) => !notifikasi.android?.groupSummary);
      expect(anak).toEqual(expect.objectContaining({ title: 'Work Order Baru', body: 'WO-20260415-0003', data: PUSH.data }));
      expect(anak?.android?.channelId).toBe(channelSenyap?.id);
      expect(mockDisplayNotification.mock.calls.some(([n]) => n.android?.channelId === 'high-priority-bubble')).toBe(false);
    });

    it('Android: push senyap dikumpulkan dalam satu grup bersama ringkasannya', async () => {
      const { presentForegroundNotification } = require('@/services/ForegroundNotificationService');

      await presentForegroundNotification(PUSH, { isSenyap: true });
      await presentForegroundNotification({ ...PUSH, body: 'WO-20260415-0004' }, { isSenyap: true });

      const tampil = mockDisplayNotification.mock.calls.map(([notifikasi]) => notifikasi);
      const anak = tampil.filter((notifikasi) => !notifikasi.android?.groupSummary);
      const ringkasan = tampil.filter((notifikasi) => notifikasi.android?.groupSummary);
      expect(anak).toHaveLength(2);
      expect(new Set(anak.map((notifikasi) => notifikasi.android?.groupId)).size).toBe(1);
      expect(anak[0].android?.groupId).toEqual(expect.any(String));
      // Ringkasan diperbarui di tempat (id tetap), tidak menumpuk.
      expect(new Set(ringkasan.map((notifikasi) => notifikasi.id)).size).toBe(1);
      expect(ringkasan[0].android?.groupId).toBe(anak[0].android?.groupId);
      expect(ringkasan[0].android?.channelId).toBe(anak[0].android?.channelId);
    });

    it('iOS: masuk Notification Center tanpa banner dan tanpa suara', async () => {
      mockPlatform.OS = 'ios';
      const { presentForegroundNotification } = require('@/services/ForegroundNotificationService');

      await presentForegroundNotification(PUSH, { isSenyap: true });

      expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
      const [[notifikasi]] = mockDisplayNotification.mock.calls;
      expect(notifikasi.ios?.foregroundPresentationOptions).toEqual(
        expect.objectContaining({ banner: false, list: true, sound: false }),
      );
      expect(notifikasi.ios?.sound).toBeUndefined();
    });
  });
});
