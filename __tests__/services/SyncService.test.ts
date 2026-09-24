import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { SyncQueueItem } from '@/services/DatabaseService';

type DatabaseServiceModule = typeof import('@/services/DatabaseService');
type SyncServiceModule = typeof import('@/services/SyncService');

type NetInfoFetchResult = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
};

type ApiRequestConfig = Record<string, unknown>;
type ApiResponse = { status: number; data: Record<string, unknown> };
type UploadOptions = Record<string, unknown>;
type SecureStoreValue = string | null;
type NetInfoListener = (state?: unknown) => void;

const mockNetInfoFetch = jest.fn<() => Promise<NetInfoFetchResult>>();
const mockNetInfoAddEventListener = jest
  .fn<(listener: NetInfoListener) => () => void>()
  .mockReturnValue(jest.fn());
const mockSecureStoreGetItemAsync = jest.fn<(key: string) => Promise<SecureStoreValue>>();
const mockAxios = jest.fn<(...args: unknown[]) => unknown>();
const mockApiRequest = jest.fn<(config: ApiRequestConfig) => Promise<ApiResponse>>();
const mockUploadFile = jest
  .fn<(uri: string, type: string, options?: UploadOptions) => Promise<string | null>>()
  .mockResolvedValue('https://example.com/photo.jpg');
const mockDatabaseIsReady = jest.fn<() => boolean>(() => true);
const mockDatabaseWaitForReady = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockDatabaseGetPendingQueue = jest.fn<() => Promise<SyncQueueItem[]>>().mockResolvedValue([]);
const mockDatabaseRemoveFromQueue = jest.fn<(id: number) => Promise<void>>().mockResolvedValue(undefined);
const mockDatabaseMarkAsRetry = jest.fn<(id: number) => Promise<void>>().mockResolvedValue(undefined);
const mockDatabaseMarkAsFailed = jest
  .fn<(id: number, reason: string) => Promise<void>>()
  .mockResolvedValue(undefined);
const mockDatabaseClearSessionData = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
type AppStateListener = (state: string) => void;

jest.mock('@react-native-community/netinfo', () => ({
  fetch: mockNetInfoFetch,
  addEventListener: mockNetInfoAddEventListener,
}));

jest.mock('expo-secure-store', () => ({
  __esModule: true,
  getItemAsync: mockSecureStoreGetItemAsync,
}));

jest.mock('axios', () => ({
  __esModule: true,
  default: mockAxios,
  isAxiosError: (error: unknown) => Boolean((error as { isAxiosError?: boolean })?.isAxiosError),
}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    request: mockApiRequest,
  },
}));

// Mock logger to suppress console output
jest.mock('@/utils/logger', () => ({
  logger: {
    sync: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  }
}));

// Mock UploadService to avoid expo-file-system dependencies
jest.mock('@/services/UploadService', () => ({
  uploadService: {
    uploadFile: mockUploadFile,
  },
}));

// Mock DatabaseService
jest.mock('@/services/DatabaseService', () => ({
  DatabaseService: {
    isReady: mockDatabaseIsReady,
    waitForReady: mockDatabaseWaitForReady,
    getPendingQueue: mockDatabaseGetPendingQueue,
    removeFromQueue: mockDatabaseRemoveFromQueue,
    markAsRetry: mockDatabaseMarkAsRetry,
    markAsFailed: mockDatabaseMarkAsFailed,
    clearSessionData: mockDatabaseClearSessionData,
  }
}));

const { DatabaseService } = require('@/services/DatabaseService') as DatabaseServiceModule;
const { SyncService } = require('@/services/SyncService') as SyncServiceModule;
const { AppState } = require('react-native') as typeof import('react-native');

let mockAppStateAddEventListener: jest.SpiedFunction<typeof AppState.addEventListener>;

beforeEach(() => {
  jest.clearAllMocks();
  mockAppStateAddEventListener = jest
    .spyOn(AppState, 'addEventListener')
    .mockReturnValue({ remove: jest.fn() } as never);
  SyncService.isMonitoring = false;
  SyncService.isProcessing = false;
  mockNetInfoFetch.mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
  });
});

/**
 * Jalankan `action` di bawah fake timers, majukan timer debounce drain, lalu
 * tunggu processQueue yang terpicu selesai. Fake timers harus aktif SEBELUM
 * action supaya setTimeout debounce-nya tertangkap.
 */
async function runAndFlushQueueDrain(action: () => void) {
  jest.useFakeTimers();
  try {
    action();
    jest.runOnlyPendingTimers();
  } finally {
    jest.useRealTimers();
  }
  await new Promise(resolve => setImmediate(resolve));
}

/** startMonitoring + selesaikan drain awal, kembalikan listener AppState. */
async function startMonitoringAndSettle(): Promise<AppStateListener | undefined> {
  await runAndFlushQueueDrain(() => SyncService.startMonitoring());
  return mockAppStateAddEventListener.mock.calls.find(
    ([event]) => event === 'change',
  )?.[1] as AppStateListener | undefined;
}

/** Kirim perubahan AppState lalu selesaikan drain yang mungkin terpicu. */
async function triggerAppState(listener: AppStateListener | undefined, state: string) {
  await runAndFlushQueueDrain(() => listener?.(state));
}

describe('SyncService', () => {
  describe('isOnline', () => {
    it('should return true when connected and reachable', async () => {
      mockNetInfoFetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true
      });
      
      const result = await SyncService.isOnline();
      expect(result).toBe(true);
    });

    it('should return false when not connected', async () => {
      mockNetInfoFetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false
      });
      
      const result = await SyncService.isOnline();
      expect(result).toBe(false);
    });

    it('should return false when connected but not reachable', async () => {
      mockNetInfoFetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: false
      });
      
      const result = await SyncService.isOnline();
      expect(result).toBe(false);
    });
  });

  describe('startMonitoring', () => {
    it('should subscribe to network changes', () => {
      SyncService.startMonitoring();
      
      expect(mockNetInfoAddEventListener).toHaveBeenCalled();
      expect(SyncService.isMonitoring).toBe(true);
    });

    it('should not subscribe twice', () => {
      SyncService.startMonitoring();
      SyncService.startMonitoring();
      
      expect(mockNetInfoAddEventListener).toHaveBeenCalledTimes(1);
    });

    // Tanpa drain awal, antrean absensi offline diam sampai kebetulan ada
    // transisi jaringan — bisa berjam-jam setelah karyawan menekan absen.
    it('should drain the queue on start instead of waiting for a network transition', async () => {
      mockDatabaseGetPendingQueue.mockResolvedValue([]);

      await startMonitoringAndSettle();

      expect(mockDatabaseGetPendingQueue).toHaveBeenCalled();
    });

    // Jaringan sering pulih saat app di background, sehingga event NetInfo
    // terlewat. Kembali ke foreground harus ikut memicu drain.
    it('should drain the queue when the app returns to the foreground', async () => {
      mockDatabaseGetPendingQueue.mockResolvedValue([]);

      const appStateListener = await startMonitoringAndSettle();
      expect(appStateListener).toBeDefined();
      mockDatabaseGetPendingQueue.mockClear();

      await triggerAppState(appStateListener, 'active');

      expect(mockDatabaseGetPendingQueue).toHaveBeenCalled();
    });

    it('should not drain the queue when the app goes to the background', async () => {
      mockDatabaseGetPendingQueue.mockResolvedValue([]);

      const appStateListener = await startMonitoringAndSettle();
      mockDatabaseGetPendingQueue.mockClear();

      await triggerAppState(appStateListener, 'background');

      expect(mockDatabaseGetPendingQueue).not.toHaveBeenCalled();
    });
  });

  describe('processQueue', () => {
    beforeEach(() => {
      jest.spyOn(SyncService, 'isOnline').mockResolvedValue(true);
    });

    it('should do nothing when queue is empty', async () => {
      mockDatabaseGetPendingQueue.mockResolvedValue([]);
      
      await SyncService.processQueue();
      
      expect(DatabaseService.getPendingQueue).toHaveBeenCalled();
      expect(mockApiRequest).not.toHaveBeenCalled();
    });

    it('should skip replay when there is no active session token', async () => {
      const mockItem: SyncQueueItem = {
        id: 5,
        url: '/api/mobile/attendance/check-in',
        method: 'POST' as const,
        body: JSON.stringify({ requestId: 'att-no-token', data: 'test' }),
        status: 'PENDING' as const,
        meta: '{}',
        createdAt: new Date().toISOString(),
      };

      mockDatabaseGetPendingQueue.mockResolvedValue([mockItem]);
      mockSecureStoreGetItemAsync.mockResolvedValue(null);

      await SyncService.processQueue();

      expect(mockApiRequest).not.toHaveBeenCalled();
      expect(DatabaseService.markAsRetry).not.toHaveBeenCalled();
      expect(DatabaseService.removeFromQueue).not.toHaveBeenCalled();
    });

    it('should process items and remove on success', async () => {
      const mockItem: SyncQueueItem = {
        id: 1,
        url: '/api/test',
        method: 'POST' as const,
        body: JSON.stringify({ data: 'test' }),
        status: 'PENDING' as const,
        meta: '{}',
        createdAt: new Date().toISOString(),
      };
      
      mockDatabaseGetPendingQueue.mockResolvedValue([mockItem]);
      mockSecureStoreGetItemAsync.mockResolvedValue('test-token');
      mockApiRequest.mockResolvedValue({ status: 200, data: { success: true } });
      
      await SyncService.processQueue();
      
      expect(mockApiRequest).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST' as const,
        timeout: 30000,
        skipGlobalAuthHandler: true,
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token'
        })
      }));
      expect(DatabaseService.removeFromQueue).toHaveBeenCalledWith(1);
    });

    it('should forward idempotency key header from queued request body', async () => {
      const mockItem: SyncQueueItem = {
        id: 2,
        url: '/api/mobile/attendance/check-in',
        method: 'POST' as const,
        body: JSON.stringify({ requestId: 'att-222-abc123', data: 'test' }),
        status: 'PENDING' as const,
        meta: '{}',
        createdAt: new Date().toISOString(),
      };

      mockDatabaseGetPendingQueue.mockResolvedValue([mockItem]);
      mockSecureStoreGetItemAsync.mockResolvedValue('test-token');
      mockApiRequest.mockResolvedValue({ status: 200, data: { success: true } });

      await SyncService.processQueue();

      expect(mockApiRequest).toHaveBeenCalledWith(expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token',
          'Idempotency-Key': 'att-222-abc123'
        })
      }));
    });

    it('replay kegiatan presurvei memakai requestId antrean sebagai Idempotency-Key', async () => {
      // Task 11b: bentuk item sama dengan yang diantrekan useCatatKegiatan
      // (__tests__/hooks/useCatatKegiatan.test.tsx) — requestId di badan dan
      // meta, foto lokal di meta.photos menuju fotoUrls.
      const mockItem: SyncQueueItem = {
        id: 3,
        url: '/api/presurvei/kegiatan',
        method: 'POST' as const,
        body: JSON.stringify({ jenis: 'KUNJUNGAN', hasil: 'TERTARIK', requestId: 'presurvei-uuid-antre' }),
        status: 'PENDING' as const,
        meta: JSON.stringify({
          photos: ['file:///dokumen/offline-photos/a.jpg'],
          targetField: 'fotoUrls',
          photoType: 'presurvei',
          requestId: 'presurvei-uuid-antre',
        }),
        createdAt: new Date().toISOString(),
      };

      mockDatabaseGetPendingQueue.mockResolvedValue([mockItem]);
      mockSecureStoreGetItemAsync.mockResolvedValue('test-token');
      mockApiRequest.mockResolvedValue({ status: 201, data: { success: true } });

      await SyncService.processQueue();

      expect(mockApiRequest).toHaveBeenCalledWith(expect.objectContaining({
        url: '/api/presurvei/kegiatan',
        headers: expect.objectContaining({ 'Idempotency-Key': 'presurvei-uuid-antre' }),
        data: expect.objectContaining({ requestId: 'presurvei-uuid-antre', fotoUrls: ['https://example.com/photo.jpg'] }),
      }));
    });

    it('should mark as retry on failure', async () => {
      jest.useFakeTimers();

      const mockItem: SyncQueueItem = {
        id: 1,
        url: '/api/test',
        method: 'POST' as const,
        body: JSON.stringify({ data: 'test' }),
        status: 'PENDING' as const,
        meta: '{}',
        createdAt: new Date().toISOString(),
      };

      mockDatabaseGetPendingQueue.mockResolvedValue([mockItem]);
      mockSecureStoreGetItemAsync.mockResolvedValue('test-token');
      mockApiRequest.mockRejectedValue(new Error('Network error'));

      const processingPromise = SyncService.processQueueItem(mockItem as any, 'test-token');
      await jest.runAllTimersAsync();
      await processingPromise;

      expect(DatabaseService.markAsRetry).toHaveBeenCalledWith(1);

      jest.useRealTimers();
    }, 15000); // Increase timeout for backoff delays (2s + 4s + processing time)

    it('should wait for database if not ready', async () => {
      mockDatabaseIsReady.mockReturnValue(false);
      mockDatabaseGetPendingQueue.mockResolvedValue([]);
      
      await SyncService.processQueue();
      
      expect(DatabaseService.waitForReady).toHaveBeenCalled();
    });

    it('should remove malformed queued payloads without retrying them', async () => {
      const mockItem: SyncQueueItem = {
        id: 3,
        url: '/api/test',
        method: 'POST' as const,
        body: '{invalid-json',
        status: 'PENDING' as const,
        meta: '{}',
        createdAt: new Date().toISOString(),
      };

      await SyncService.processQueueItem(mockItem as any, 'test-token');

      expect(DatabaseService.removeFromQueue).toHaveBeenCalledWith(3);
      expect(DatabaseService.markAsRetry).not.toHaveBeenCalled();
      expect(mockApiRequest).not.toHaveBeenCalled();
    });

    it('should retry unauthorized sync items instead of removing them immediately', async () => {
      jest.useFakeTimers();

      const mockItem: SyncQueueItem = {
        id: 4,
        url: '/api/mobile/attendance/check-in',
        method: 'POST' as const,
        body: JSON.stringify({ requestId: 'att-401', data: 'test' }),
        status: 'PENDING' as const,
        meta: '{}',
        createdAt: new Date().toISOString(),
      };

      mockApiRequest.mockRejectedValue({
        isAxiosError: true,
        response: {
          status: 401,
          data: { error: 'Unauthorized' },
        },
      });

      const processingPromise = SyncService.processQueueItem(mockItem as any, 'test-token');
      await jest.runAllTimersAsync();
      await processingPromise;

      expect(DatabaseService.removeFromQueue).not.toHaveBeenCalledWith(4);
      expect(DatabaseService.markAsRetry).toHaveBeenCalledWith(4);

      jest.useRealTimers();
    }, 15000);

    it('should keep attendance replay queued on 409 conflict responses', async () => {
      const mockItem: SyncQueueItem = {
        id: 6,
        url: '/api/mobile/attendance/check-in',
        method: 'POST' as const,
        body: JSON.stringify({ requestId: 'att-409', data: 'test' }),
        status: 'PENDING' as const,
        meta: '{}',
        createdAt: new Date().toISOString(),
      };

      mockApiRequest.mockRejectedValue({
        isAxiosError: true,
        response: {
          status: 409,
          data: { error: 'Conflict' },
        },
      });

      await SyncService.processQueueItem(mockItem as any, 'test-token');

      expect(DatabaseService.removeFromQueue).not.toHaveBeenCalledWith(6);
      expect(DatabaseService.markAsRetry).toHaveBeenCalledWith(6);
    });

    it('should keep attendance replay queued on 422 reconciliation responses', async () => {
      const mockItem: SyncQueueItem = {
        id: 7,
        url: '/api/mobile/attendance/check-out',
        method: 'POST' as const,
        body: JSON.stringify({ requestId: 'att-422', data: 'test' }),
        status: 'PENDING' as const,
        meta: '{}',
        createdAt: new Date().toISOString(),
      };

      mockApiRequest.mockRejectedValue({
        isAxiosError: true,
        response: {
          status: 422,
          data: { error: 'Reconciliation required' },
        },
      });

      await SyncService.processQueueItem(mockItem as any, 'test-token');

      expect(DatabaseService.removeFromQueue).not.toHaveBeenCalledWith(7);
      expect(DatabaseService.markAsRetry).toHaveBeenCalledWith(7);
    });

    it('should keep attendance replay queued when queued photo upload fails before mutation request', async () => {
      const mockItem: SyncQueueItem = {
        id: 8,
        url: '/api/mobile/attendance/check-in',
        method: 'POST' as const,
        body: JSON.stringify({ requestId: 'att-photo-upload-failed', location: 'HQ' }),
        status: 'PENDING' as const,
        meta: JSON.stringify({
          photos: ['file:///queued-photo.jpg'],
          photoType: 'employee-attendance',
          targetField: 'photoUrl',
          singleFile: true,
          requestId: 'att-photo-upload-failed',
        }),
        createdAt: new Date().toISOString(),
      };

      const { uploadService } = require('@/services/UploadService');
      uploadService.uploadFile.mockRejectedValueOnce(new Error('Upload photo gagal'));

      await SyncService.processQueueItem(mockItem as any, 'test-token');

      expect(uploadService.uploadFile).toHaveBeenCalledWith(
        'file:///queued-photo.jpg',
        'employee-attendance',
        expect.objectContaining({ params: {} }),
      );
      expect(mockApiRequest).not.toHaveBeenCalled();
      expect(DatabaseService.removeFromQueue).not.toHaveBeenCalledWith(8);
      expect(DatabaseService.markAsRetry).toHaveBeenCalledWith(8);
    });
  });
});
