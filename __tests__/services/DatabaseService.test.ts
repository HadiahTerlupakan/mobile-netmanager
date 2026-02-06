import { Storage } from '@/utils/storage';

// Define mocks
const mockLogger = {
  db: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
};

const mockStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Mock dependencies
jest.mock('@/utils/logger', () => ({
  __esModule: true,
  logger: mockLogger,
  default: mockLogger,
}));

jest.mock('@/utils/storage', () => ({
  Storage: mockStorage,
}));

describe('DatabaseService', () => {
  let DatabaseService: any;

  beforeEach(() => {
    jest.resetModules(); // Reset cache to get a fresh singleton instance
    jest.clearAllMocks();

    // Re-require the module under test
    DatabaseService = require('@/services/DatabaseService').DatabaseService;
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      mockStorage.getItem.mockReturnValue(null); // Empty queue

      await DatabaseService.initDatabase();
      expect(DatabaseService.isReady()).toBe(true);
      expect(mockLogger.db).toHaveBeenCalled();
    });

    it('should load existing queue from storage', async () => {
      const mockQueue = [
        {
          id: 1,
          url: '/api/test',
          method: 'POST',
          body: '{}',
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          meta: '{}',
        },
      ];
      mockStorage.getItem.mockReturnValue(JSON.stringify(mockQueue));

      await DatabaseService.initDatabase();

      const pending = await DatabaseService.getPendingQueue();
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe(1);
    });
  });

  describe('Queue Operations', () => {
    it('should add item to queue', async () => {
      mockStorage.getItem.mockReturnValue(null);
      await DatabaseService.initDatabase();

      await DatabaseService.addToQueue('/api/new', 'POST', { data: 123 });

      const pending = await DatabaseService.getPendingQueue();
      expect(pending).toHaveLength(1);

      const item = pending.find((i: any) => i.url === '/api/new');
      expect(item).toBeTruthy();
      expect(mockStorage.setItem).toHaveBeenCalled();
    });

    it('should remove item from queue', async () => {
      mockStorage.getItem.mockReturnValue(null);
      await DatabaseService.initDatabase();

      // Add an item first
      await DatabaseService.addToQueue('/api/remove', 'DELETE', {});
      const pendingBefore = await DatabaseService.getPendingQueue();
      const itemToRemove = pendingBefore.find((i: any) => i.url === '/api/remove');

      if (itemToRemove) {
        await DatabaseService.removeFromQueue(itemToRemove.id);
        const pendingAfter = await DatabaseService.getPendingQueue();
        expect(pendingAfter.find((i: any) => i.id === itemToRemove.id)).toBeUndefined();
        expect(mockStorage.setItem).toHaveBeenCalled();
      }
    });

    it('should mark item as retry', async () => {
      mockStorage.getItem.mockReturnValue(null);
      await DatabaseService.initDatabase();

      await DatabaseService.addToQueue('/api/retry', 'GET', {});
      const pending = await DatabaseService.getPendingQueue();
      const item = pending.find((i: any) => i.url === '/api/retry');

      if (item) {
        await DatabaseService.markAsRetry(item.id);
        const updatedPending = await DatabaseService.getPendingQueue();
        const updatedItem = updatedPending.find((i: any) => i.id === item.id);
        expect(updatedItem?.status).toBe('RETRY');
        expect(updatedItem?.retryCount).toBe(1);
        expect(mockStorage.setItem).toHaveBeenCalled();
      }
    });
  });
});
