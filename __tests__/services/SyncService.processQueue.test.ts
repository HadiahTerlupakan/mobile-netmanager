import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { SyncQueueItem } from '@/services/DatabaseService';

// --- Boundary mocks: isolasi orkestrasi processQueue dari DB/network/token ---
const mockIsReady = jest.fn<() => boolean>(() => true);
const mockWaitForReady = jest.fn<() => Promise<void>>(() => Promise.resolve());
const mockGetPendingQueue = jest.fn<() => Promise<SyncQueueItem[]>>(() => Promise.resolve([]));

jest.mock('@/services/DatabaseService', () => ({
  DatabaseService: {
    isReady: () => mockIsReady(),
    waitForReady: () => mockWaitForReady(),
    getPendingQueue: () => mockGetPendingQueue(),
    removeFromQueue: jest.fn(() => Promise.resolve()),
    markAsFailed: jest.fn(() => Promise.resolve()),
    markAsRetry: jest.fn(() => Promise.resolve()),
  },
}));

const mockRefresh = jest.fn<() => Promise<string | null>>(() => Promise.resolve(null));
jest.mock('@/services/RefreshTokenService', () => ({
  RefreshTokenService: { refreshAccessToken: () => mockRefresh() },
}));

const makeItem = (over: Partial<SyncQueueItem>): SyncQueueItem => ({
  id: 1,
  url: '/api/mobile/other',
  method: 'POST',
  body: '{}',
  status: 'PENDING',
  createdAt: new Date().toISOString(),
  meta: '{}',
  ...over,
});

const loadService = () => require('@/services/SyncService').SyncService as typeof import('@/services/SyncService').SyncService;

describe('SyncService.processQueue orchestration', () => {
  let SyncService: ReturnType<typeof loadService>;
  const SecureStore = require('expo-secure-store');

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsReady.mockReturnValue(true);
    mockWaitForReady.mockResolvedValue(undefined);
    mockGetPendingQueue.mockResolvedValue([]);
    mockRefresh.mockResolvedValue(null);
    SecureStore.getItemAsync.mockResolvedValue('token-123');

    SyncService = loadService();
    SyncService.isProcessing = false;
    // Isolasi: jangan jalankan logika item yang berat.
    jest.spyOn(SyncService, 'processQueueItem').mockResolvedValue(undefined);
  });

  it('re-entrancy guard: tidak menyentuh DB bila sedang memproses', async () => {
    SyncService.isProcessing = true;

    await SyncService.processQueue();

    expect(mockGetPendingQueue).not.toHaveBeenCalled();
  });

  it('antrean kosong: tidak memanggil processQueueItem dan reset isProcessing', async () => {
    mockGetPendingQueue.mockResolvedValue([]);

    await SyncService.processQueue();

    expect(SyncService.processQueueItem).not.toHaveBeenCalled();
    expect(SyncService.isProcessing).toBe(false);
  });

  it('memproses tiap item sesuai prioritas (work-order dulu) dengan token', async () => {
    mockGetPendingQueue.mockResolvedValue([
      makeItem({ id: 1, url: '/api/mobile/other-thing' }),
      makeItem({ id: 2, url: '/api/mobile/work-order/complete' }),
    ]);

    await SyncService.processQueue();

    const calls = (SyncService.processQueueItem as jest.Mock).mock.calls;
    expect(calls).toHaveLength(2);
    // Work-order (id 2) harus diproses lebih dulu.
    expect((calls[0][0] as SyncQueueItem).id).toBe(2);
    expect((calls[1][0] as SyncQueueItem).id).toBe(1);
    // Token diteruskan ke tiap item.
    expect(calls[0][1]).toBe('token-123');
    expect(SyncService.isProcessing).toBe(false);
  });

  it('tanpa token & refresh gagal: skip tanpa memproses item', async () => {
    SecureStore.getItemAsync.mockResolvedValue(null);
    mockRefresh.mockResolvedValue(null);
    mockGetPendingQueue.mockResolvedValue([makeItem({ id: 1 })]);

    await SyncService.processQueue();

    expect(SyncService.processQueueItem).not.toHaveBeenCalled();
    expect(SyncService.isProcessing).toBe(false);
  });

  it('tanpa token tapi refresh sukses: proses item dengan token baru', async () => {
    SecureStore.getItemAsync.mockResolvedValue(null);
    mockRefresh.mockResolvedValue('fresh-token');
    mockGetPendingQueue.mockResolvedValue([makeItem({ id: 1 })]);

    await SyncService.processQueue();

    const calls = (SyncService.processQueueItem as jest.Mock).mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0][1]).toBe('fresh-token');
  });

  it('DB init gagal: skip processing dan reset isProcessing', async () => {
    mockIsReady.mockReturnValue(false);
    mockWaitForReady.mockRejectedValue(new Error('db init failed'));

    await SyncService.processQueue();

    expect(mockGetPendingQueue).not.toHaveBeenCalled();
    expect(SyncService.processQueueItem).not.toHaveBeenCalled();
    expect(SyncService.isProcessing).toBe(false);
  });
});
