import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { DatabaseService } from '@/services/DatabaseService';
import { SyncService } from '@/services/SyncService';

jest.mock('axios', () => {
  const axiosMock = jest.fn();
  return {
    __esModule: true,
    default: axiosMock,
    isAxiosError: (error: unknown) => Boolean((error as { isAxiosError?: boolean })?.isAxiosError),
  };
});

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
      expect(mockedAxios).not.toHaveBeenCalled();
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
      mockedAxios.mockResolvedValue({ status: 200, data: { success: true } });
      
      await SyncService.processQueue();
      
      expect(mockedAxios).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
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
      mockedAxios.mockResolvedValue({ status: 200, data: { success: true } });

      await SyncService.processQueue();

      expect(mockedAxios).toHaveBeenCalledWith(expect.objectContaining({
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
      mockedAxios.mockRejectedValue(new Error('Network error'));

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
  });
});
