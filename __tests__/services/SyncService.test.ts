import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { DatabaseService } from '@/services/DatabaseService';
import { SyncService } from '@/services/SyncService';

// Mock DatabaseService
jest.mock('../../services/DatabaseService', () => ({
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
});

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
    it('should do nothing when queue is empty', async () => {
      (DatabaseService.getPendingQueue as jest.Mock).mockResolvedValue([]);
      
      await SyncService.processQueue();
      
      expect(DatabaseService.getPendingQueue).toHaveBeenCalled();
      expect(axios).not.toHaveBeenCalled();
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
      (axios as unknown as jest.Mock).mockResolvedValue({ status: 200, data: { success: true } });
      
      await SyncService.processQueue();
      
      expect(axios).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token'
        })
      }));
      expect(DatabaseService.removeFromQueue).toHaveBeenCalledWith(1);
    });

    it('should mark as retry on failure', async () => {
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
      (axios as unknown as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      await SyncService.processQueue();
      
      expect(DatabaseService.markAsRetry).toHaveBeenCalledWith(1);
    });

    it('should wait for database if not ready', async () => {
      (DatabaseService.isReady as jest.Mock).mockReturnValue(false);
      (DatabaseService.getPendingQueue as jest.Mock).mockResolvedValue([]);
      
      await SyncService.processQueue();
      
      expect(DatabaseService.waitForReady).toHaveBeenCalled();
    });
  });
});
