import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus, Platform } from 'react-native';

type PushForeground = { title?: string | null; body?: string | null; data?: Record<string, string> };
type NotifikasiTampil = {
  title?: string;
  body?: string;
  android?: { channelId?: string; groupSummary?: boolean };
};
type StatusJaringan = { isConnected: boolean | null; isInternetReachable: boolean | null };

const mockCreateChannel = jest.fn(async (channel: { id: string }) => channel.id);
const mockDisplayNotification = jest.fn(async (_notifikasi: NotifikasiTampil) => 'notification-id');
const mockToastShow = jest.fn();
const mockInvalidateQueries = jest.fn();
let mockTerimaPush: ((push: PushForeground) => unknown) | undefined;
let mockPendengarJaringan: ((status: StatusJaringan) => void) | undefined;

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel: (channel: { id: string }) => mockCreateChannel(channel),
    deleteChannel: async () => undefined,
    displayNotification: (notifikasi: NotifikasiTampil) => mockDisplayNotification(notifikasi),
    onForegroundEvent: () => () => undefined,
  },
  AndroidImportance: { LOW: 2, HIGH: 4 },
  EventType: { PRESS: 1 },
}));

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: (...args: unknown[]) => mockToastShow(...args), hide: () => undefined },
}));

jest.mock('@/services/PushNotificationService', () => ({
  getInitialNotificationData: async () => null,
  addNotificationListeners: (terima: (push: PushForeground) => unknown) => {
    mockTerimaPush = terima;
    return () => undefined;
  },
}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: async () => ({ isConnected: true, isInternetReachable: true }),
    addEventListener: (pendengar: (status: StatusJaringan) => void) => {
      mockPendengarJaringan = pendengar;
      return () => undefined;
    },
  },
}));

jest.mock('@/lib/queryClient', () => ({
  queryClient: { invalidateQueries: (...args: unknown[]) => mockInvalidateQueries(...args) },
  queryKeys: {
    notifications: {
      list: () => ['notifications', 'list'],
      unread: () => ['notifications', 'unread'],
    },
    investor: { all: ['investor'] },
    pengesahan: { all: ['pengesahan'] },
  },
}));

jest.mock('@/services/ErrorReportingService', () => ({
  errorReportingService: { captureException: () => undefined },
}));

const mockRouter = { push: () => undefined, replace: () => undefined };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useSegments: () => ['(app)', 'dashboard'],
}));

import { useNotificationSetup } from '@/hooks/useNotificationSetup';

const CHANNEL_BERNADA = 'high-priority-bubble';

let mockPendengarAppState: ((keadaan: AppStateStatus) => void) | undefined;

const tampilan = () => mockDisplayNotification.mock.calls.map(([notifikasi]) => notifikasi);
const tampilBernada = () => tampilan().filter((n) => n.android?.channelId === CHANNEL_BERNADA);
const tampilSenyap = () =>
  tampilan().filter((n) => n.android?.channelId !== CHANNEL_BERNADA && !n.android?.groupSummary);
const toast = () => mockToastShow.mock.calls.map(([isi]) => isi as { text1?: string; text2?: string });
const penyegaranDaftarNotifikasi = () =>
  mockInvalidateQueries.mock.calls.filter(([arg]) => {
    const kunci = (arg as { queryKey: unknown[] }).queryKey;
    return kunci[0] === 'notifications' && kunci[1] === 'list';
  }).length;

async function pasangHook() {
  const hasil = renderHook(() => useNotificationSetup());
  await act(async () => undefined);
  return hasil;
}

async function kirimPush(...daftar: PushForeground[]) {
  for (const push of daftar) {
    await act(async () => {
      await mockTerimaPush?.(push);
    });
  }
}

function lewati(ms: number) {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

const push = (nomor: number): PushForeground => ({
  title: `Work Order Baru ${nomor}`,
  body: `WO-2026110${nomor}`,
  data: { url: `/(app)/work-order-detail/wo-${nomor}` },
});

describe('useNotificationSetup — push foreground tidak berbunyi beruntun', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockTerimaPush = undefined;
    mockPendengarJaringan = undefined;
    mockPendengarAppState = undefined;
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' });
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_jenis, pendengar) => {
      mockPendengarAppState = pendengar as (keadaan: AppStateStatus) => void;
      return { remove: () => undefined } as ReturnType<typeof AppState.addEventListener>;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('burst setelah masa tenang: satu bunyi, sisanya senyap, satu toast ringkasan', async () => {
    await pasangHook();
    lewati(5000);

    await kirimPush(push(1), push(2), push(3));
    lewati(1000);

    expect(tampilBernada().map((n) => n.title)).toEqual(['Work Order Baru 1']);
    expect(tampilSenyap().map((n) => n.title)).toEqual(['Work Order Baru 2', 'Work Order Baru 3']);
    expect(toast()).toEqual([expect.objectContaining({ text1: '3 Notifikasi Baru' })]);
    expect(penyegaranDaftarNotifikasi()).toBe(1);
  });

  it('push yang menetes dalam satu burst memperbarui toast yang sama dengan jumlah berjalan', async () => {
    await pasangHook();
    lewati(5000);

    await kirimPush(push(1));
    lewati(1500);
    await kirimPush(push(2));
    lewati(1500);
    await kirimPush(push(3));
    lewati(1000);

    expect(tampilBernada().map((n) => n.title)).toEqual(['Work Order Baru 1']);
    expect(toast().map((isi) => isi.text1)).toEqual(['Work Order Baru 1', '2 Notifikasi Baru', '3 Notifikasi Baru']);
  });

  it('push yang menumpuk saat aplikasi baru dibuka tampil senyap, tanpa toast, dan data tetap disegarkan', async () => {
    await pasangHook();

    await kirimPush(push(1), push(2), push(3));
    lewati(1000);

    expect(tampilBernada()).toEqual([]);
    expect(tampilSenyap()).toHaveLength(3);
    expect(mockToastShow).not.toHaveBeenCalled();
    expect(penyegaranDaftarNotifikasi()).toBe(1);
  });

  it('push tunggal setelah masa tenang tetap berbunyi dan tampil sebagai toast-nya sendiri', async () => {
    await pasangHook();
    lewati(5000);

    await kirimPush(push(7));
    lewati(1000);

    expect(tampilBernada().map((n) => n.title)).toEqual(['Work Order Baru 7']);
    expect(toast()).toEqual([expect.objectContaining({ text1: 'Work Order Baru 7', text2: 'WO-20261107' })]);
  });

  it('kembali dari latar belakang memulai masa tenang lagi', async () => {
    await pasangHook();
    lewati(10_000);

    act(() => {
      mockPendengarAppState?.('background');
      mockPendengarAppState?.('active');
    });
    await kirimPush(push(1), push(2));
    lewati(1000);

    expect(tampilBernada()).toEqual([]);
    expect(tampilSenyap()).toHaveLength(2);
    expect(mockToastShow).not.toHaveBeenCalled();
  });

  it('toast yang masih tertunda tidak muncul bila aplikasi ditinggal lalu dibuka lagi', async () => {
    await pasangHook();
    lewati(5000);

    await kirimPush(push(1));
    act(() => {
      mockPendengarAppState?.('background');
      mockPendengarAppState?.('active');
    });
    lewati(1000);

    expect(tampilBernada()).toHaveLength(1);
    expect(mockToastShow).not.toHaveBeenCalled();
    expect(penyegaranDaftarNotifikasi()).toBe(1);
  });

  it('kembali online memulai masa tenang lagi', async () => {
    await pasangHook();
    lewati(10_000);

    act(() => {
      mockPendengarJaringan?.({ isConnected: false, isInternetReachable: false });
      mockPendengarJaringan?.({ isConnected: true, isInternetReachable: true });
    });
    await kirimPush(push(1), push(2));
    lewati(1000);

    expect(tampilBernada()).toEqual([]);
    expect(tampilSenyap()).toHaveLength(2);
    expect(mockToastShow).not.toHaveBeenCalled();
  });

  it('push data tanpa judul tidak tampil dan tidak memunculkan lagi toast burst sebelumnya, tetapi tetap menyegarkan data', async () => {
    await pasangHook();
    lewati(5000);
    await kirimPush(push(1), push(2));
    lewati(1000);
    mockToastShow.mockClear();
    mockInvalidateQueries.mockClear();
    lewati(60_000);

    await kirimPush({ title: null, body: null, data: { type: 'sync' } });
    lewati(1000);

    expect(tampilan()).toHaveLength(3);
    expect(mockToastShow).not.toHaveBeenCalled();
    expect(penyegaranDaftarNotifikasi()).toBe(1);
  });

  it('berhenti setelah dilepas: toast yang tertunda tidak muncul', async () => {
    const { unmount } = await pasangHook();
    lewati(5000);

    await kirimPush(push(1));
    unmount();
    lewati(1000);

    expect(mockToastShow).not.toHaveBeenCalled();
  });
});
