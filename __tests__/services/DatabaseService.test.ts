// Test untuk DatabaseService dengan proper mocks
// DatabaseService menggunakan singleton pattern, jadi kita perlu test dengan cara berbeda

import * as SQLite from 'expo-sqlite';

// Get reference to the mock
const mockExecAsync = jest.fn().mockResolvedValue(undefined);
const mockRunAsync = jest.fn().mockResolvedValue(undefined);
const mockGetAllAsync = jest.fn().mockResolvedValue([]);
const mockGetFirstAsync = jest.fn().mockResolvedValue(null);

const mockDb = {
  execAsync: mockExecAsync,
  runAsync: mockRunAsync,
  getAllAsync: mockGetAllAsync,
  getFirstAsync: mockGetFirstAsync,
};

// Override the mock before importing DatabaseService
(SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(mockDb);

// Import after mock setup
import { DatabaseService } from '../../services/DatabaseService';

beforeEach(() => {
  // Clear mock call history
  mockExecAsync.mockClear();
  mockRunAsync.mockClear();
  mockGetAllAsync.mockClear();
  mockGetFirstAsync.mockClear();
});

describe('DatabaseService', () => {
  describe('initDatabase', () => {
    it('should initialize database and create tables', async () => {
      await DatabaseService.initDatabase();
      
      expect(SQLite.openDatabaseAsync).toHaveBeenCalledWith('netmanager_offline.db');
      // 3 CREATE TABLE for settings, sync_queue, offline_cache
      expect(mockExecAsync).toHaveBeenCalledTimes(3);
    });
  });

  describe('addToQueue', () => {
    it('should add item to sync queue after init', async () => {
      await DatabaseService.initDatabase();
      
      // Clear calls from init
      mockRunAsync.mockClear();
      
      await DatabaseService.addToQueue('/api/test', 'POST', { data: 'test' }, { type: 'test' });
      
      expect(mockRunAsync).toHaveBeenCalledWith(
        'INSERT INTO sync_queue (url, method, body, meta, status) VALUES (?, ?, ?, ?, ?)',
        '/api/test',
        'POST',
        JSON.stringify({ data: 'test' }),
        JSON.stringify({ type: 'test' }),
        'PENDING'
      );
    });
  });

  describe('getPendingQueue', () => {
    it('should return pending and retry items', async () => {
      const mockItems = [
        { id: 1, url: '/api/test1', method: 'POST', body: '{}', status: 'PENDING', created_at: '2024-01-01', meta: '{}' },
        { id: 2, url: '/api/test2', method: 'PUT', body: '{}', status: 'RETRY', created_at: '2024-01-02', meta: '{}' },
      ];
      
      mockGetAllAsync.mockResolvedValueOnce(mockItems);
      
      const result = await DatabaseService.getPendingQueue();
      
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[0].status).toBe('PENDING');
      expect(result[1].status).toBe('RETRY');
    });
  });

  describe('removeFromQueue', () => {
    it('should delete item by id', async () => {
      mockRunAsync.mockClear();
      
      await DatabaseService.removeFromQueue(5);
      
      expect(mockRunAsync).toHaveBeenCalledWith(
        'DELETE FROM sync_queue WHERE id = ?',
        5
      );
    });
  });

  describe('saveOfflineData / getOfflineData', () => {
    it('should save and retrieve cached data', async () => {
      const testData = { users: [{ id: 1, name: 'Test' }] };
      
      // Mock getFirstAsync to return saved data
      mockGetFirstAsync.mockResolvedValueOnce({ data: JSON.stringify(testData) });
      
      await DatabaseService.saveOfflineData('users_cache', testData);
      const result = await DatabaseService.getOfflineData('users_cache');
      
      expect(result).toEqual(testData);
    });

    it('should return null if no cached data', async () => {
      mockGetFirstAsync.mockResolvedValueOnce(null);
      
      const result = await DatabaseService.getOfflineData('nonexistent_key');
      expect(result).toBeNull();
    });
  });

  describe('isReady', () => {
    it('should return true after initialization', async () => {
      await DatabaseService.initDatabase();
      expect(DatabaseService.isReady()).toBe(true);
    });
  });
});
