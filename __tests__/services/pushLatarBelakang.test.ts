import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

type Channel = { id: string; importance?: number; sound?: string };
type NotifikasiTampil = {
  title?: string;
  body?: string;
  data?: Record<string, string>;
  android?: { channelId?: string; groupSummary?: boolean; smallIcon?: string };
};
type PushFcm = {
  notification?: { title?: string; body?: string };
  data?: Record<string, string | object>;
};

const mockCreateChannel = jest.fn(async (channel: Channel) => channel.id);
const mockDisplayNotification = jest.fn(async (_notifikasi: NotifikasiTampil) => 'notification-id');
const mockPlatform = { OS: 'android' };

jest.mock('react-native', () => ({ Platform: mockPlatform }));

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel: (channel: Channel) => mockCreateChannel(channel),
    deleteChannel: async () => undefined,
    displayNotification: (notifikasi: NotifikasiTampil) => mockDisplayNotification(notifikasi),
  },
  AndroidImportance: { LOW: 2, HIGH: 4 },
}));

const CHANNEL_BERNADA = 'high-priority-bubble';

/** Handler segar per tes: penentu burst-nya disimpan di tingkat modul. */
function muatHandler(): (push: PushFcm) => Promise<void> {
  jest.resetModules();
  return require('@/services/pushLatarBelakang').tanganiPushLatarBelakang;
}

const tampilan = () => mockDisplayNotification.mock.calls.map(([notifikasi]) => notifikasi);
const anakTampil = () => tampilan().filter((n) => !n.android?.groupSummary);

describe('tanganiPushLatarBelakang', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockPlatform.OS = 'android';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('push dengan field notification tidak ditampilkan ulang: Android sudah menampilkannya', async () => {
    const tangani = muatHandler();

    await tangani({ notification: { title: 'Work Order Baru', body: 'WO-1' }, data: { url: '/x' } });

    expect(mockDisplayNotification).not.toHaveBeenCalled();
    expect(mockCreateChannel).not.toHaveBeenCalled();
  });

  it('push data saja tampil di channel bernada yang berlaku, tidak menghidupkan channel lama high-priority', async () => {
    const tangani = muatHandler();

    await tangani({ data: { title: 'Work Order Baru', body: 'WO-2', url: '/(app)/work-order-detail/wo-2' } });

    expect(mockCreateChannel.mock.calls.map(([channel]) => channel.id)).not.toContain('high-priority');
    expect(anakTampil()).toEqual([
      expect.objectContaining({
        title: 'Work Order Baru',
        body: 'WO-2',
        data: { title: 'Work Order Baru', body: 'WO-2', url: '/(app)/work-order-detail/wo-2' },
        android: expect.objectContaining({ channelId: CHANNEL_BERNADA, smallIcon: 'notification_icon' }),
      }),
    ]);
  });

  it('push data saja yang beruntun: satu berbunyi, sisanya di channel senyap', async () => {
    const tangani = muatHandler();

    await tangani({ data: { title: 'Push 1' } });
    jest.advanceTimersByTime(100);
    await tangani({ data: { title: 'Push 2' } });
    jest.advanceTimersByTime(100);
    await tangani({ data: { title: 'Push 3' } });

    expect(anakTampil().map((n) => `${n.title}@${n.android?.channelId}`)).toEqual([
      `Push 1@${CHANNEL_BERNADA}`,
      'Push 2@notifikasi-senyap',
      'Push 3@notifikasi-senyap',
    ]);
  });

  it('tanpa judul dan isi memakai teks bawaan; data bukan string dibuang agar notifee tidak menolaknya', async () => {
    const tangani = muatHandler();

    await tangani({ data: { url: '/(app)/notifications', meta: { sumber: 'server' } } });

    expect(anakTampil()).toEqual([
      expect.objectContaining({
        title: 'Notifikasi Baru',
        body: 'Anda menerima notifikasi.',
        data: { url: '/(app)/notifications' },
      }),
    ]);
  });
});
