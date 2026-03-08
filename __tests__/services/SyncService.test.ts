import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { DatabaseService } from '@/services/DatabaseService';
import { SyncService } from '@/services/SyncService';
import api from '@/services/api';

jest.mock('axios', () => {
  const axiosMock = jest.fn();
  return {
    __esModule: true,
    default: axiosMock,
    isAxiosError: (error: unknown) => Boolean((error as { isAxiosError?: boolean })?.isAxiosError),
  };
});

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    request: jest.fn(),
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
    uploadFile: jest.fn().mockResolvedValue('https://example.com/photo.jpg'),
  },
}));

// Mock DatabaseService
jest.mock('@/services/DatabaseService', () => ({
  DatabaseService: {
    isReady: jest.fn(() => true),
    waitForReady: jest.fn().mockResolvedValue(undefined),
    getPendingQueue: jest.fn().mockResolvedValue([]),
    removeFromQueue: jest.fn().mockResolvedValue(undefined),
    markAsRetry: jest.fn().mockResolvedValue(undefined),
    clearSessionData: jest.fn().mockResolvedValue(undefined),
  }
}));

beforeEach(() => {
  jest.clearAllMocks();
  SyncService.isMonitoring = false;
  SyncService.isProcessing = false;
  (NetInfo.fetch as jest.Mock).mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
  });
});

const mockedAxios = axios as unknown as jest.Mock;
const mockedApiRequest = api.request as jest.Mock;

describe('SyncService', () => {
  describe('isOnline', () => {
    it('should return true when connected and reachable', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true
      });
      
      const result = await SyncService.isOnline();
      expect(result).toBe(true);
    });

    it('should return false when not connected', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false
      });
      
      const result = await SyncService.isOnline();
      expect(result).toBe(false);
    });

    it('should return false when connected but not reachable', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
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
      
      expect(NetInfo.addEventListener).toHaveBeenCalled();
      expect(SyncService.isMonitoring).toBe(true);
    });

    it('should not subscribe twice', () => {
      SyncService.startMonitoring();
      SyncService.startMonitoring();
      
      expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('processQueue', () => {
    beforeEach(() => {
      jest.spyOn(SyncService, 'isOnline').mockResolvedValue(true);
    });

    it('should do nothing when queue is empty', async () => {
      (DatabaseService.getPendingQueue as jest.Mock).mockResolvedValue([]);
      
      await SyncService.processQueue();
      
      expect(DatabaseService.getPendingQueue).toHaveBeenCalled();
      expect(mockedApiRequest).not.toHaveBeenCalled();
    });

    it('should skip replay when there is no active session token', async () => {
      const mockItem = {
        id: 5,
        url: '/api/mobile/attendance/check-in',
        method: 'POST',
        body: JSON.stringify({ requestId: 'att-no-token', data: 'test' }),
        status: 'PENDING',
        meta: '{}',
      };

      (DatabaseService.getPendingQueue as jest.Mock).mockResolvedValue([mockItem]);
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      await SyncService.processQueue();

      expect(mockedApiRequest).not.toHaveBeenCalled();
      expect(DatabaseService.markAsRetry).not.toHaveBeenCalled();
      expect(DatabaseService.removeFromQueue).not.toHaveBeenCalled();
    });

    it('should process items and remove on success', async () => {
      const mockItem = {
        id: 1,
        url: '/api/test',
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
        status: 'PENDING',
        meta: '{}'
      };
      
      (DatabaseService.getPendingQueue as jest.Mock).mockResolvedValue([mockItem]);
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('test-token');
      mockedApiRequest.mockResolvedValue({ status: 200, data: { success: true } });
      
      await SyncService.processQueue();
      
      expect(mockedApiRequest).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        timeout: 15000,
        skipGlobalAuthHandler: true,
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token'
        })
      }));
      expect(DatabaseService.removeFromQueue).toHaveBeenCalledWith(1);
    });

    it('should forward idempotency key header from queued request body', async () => {
      const mockItem = {
        id: 2,
        url: '/api/mobile/attendance/check-in',
        method: 'POST',
        body: JSON.stringify({ requestId: 'att-222-abc123', data: 'test' }),
        status: 'PENDING',
        meta: '{}'
      };

      (DatabaseService.getPendingQueue as jest.Mock).mockResolvedValue([mockItem]);
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('test-token');
      mockedApiRequest.mockResolvedValue({ status: 200, data: { success: true } });

      await SyncService.processQueue();

      expect(mockedApiRequest).toHaveBeenCalledWith(expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token',
          'Idempotency-Key': 'att-222-abc123'
        })
      }));
    });

    it('should mark as retry on failure', async () => {
      jest.useFakeTimers();

      const mockItem = {
        id: 1,
        url: '/api/test',
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
        status: 'PENDING',
        meta: '{}'
      };

      (DatabaseService.getPendingQueue as jest.Mock).mockResolvedValue([mockItem]);
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('test-token');
      mockedApiRequest.mockRejectedValue(new Error('Network error'));

      const processingPromise = SyncService.processQueueItem(mockItem as any, 'test-token');
      await jest.runAllTimersAsync();
      await processingPromise;

      expect(DatabaseService.markAsRetry).toHaveBeenCalledWith(1);

      jest.useRealTimers();
    }, 15000); // Increase timeout for backoff delays (2s + 4s + processing time)

    it('should wait for database if not ready', async () => {
      (DatabaseService.isReady as jest.Mock).mockReturnValue(false);
      (DatabaseService.getPendingQueue as jest.Mock).mockResolvedValue([]);
      
      await SyncService.processQueue();
      
      expect(DatabaseService.waitForReady).toHaveBeenCalled();
    });

    it('should remove malformed queued payloads without retrying them', async () => {
      const mockItem = {
        id: 3,
        url: '/api/test',
        method: 'POST',
        body: '{invalid-json',
        status: 'PENDING',
        meta: '{}',
      };

      await SyncService.processQueueItem(mockItem as any, 'test-token');

      expect(DatabaseService.removeFromQueue).toHaveBeenCalledWith(3);
      expect(DatabaseService.markAsRetry).not.toHaveBeenCalled();
      expect(mockedApiRequest).not.toHaveBeenCalled();
    });

    it('should retry unauthorized sync items instead of removing them immediately', async () => {
      jest.useFakeTimers();

      const mockItem = {
        id: 4,
        url: '/api/mobile/attendance/check-in',
        method: 'POST',
        body: JSON.stringify({ requestId: 'att-401', data: 'test' }),
        status: 'PENDING',
        meta: '{}',
      };

      mockedApiRequest.mockRejectedValue({
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
  });
});
