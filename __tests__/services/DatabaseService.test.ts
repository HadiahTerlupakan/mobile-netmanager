import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Define mocks
const mockLogger = {
  db: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
};

const mockStorage = {
  getItem: jest.fn<(key: string) => string | null>(),
  setItem: jest.fn<(key: string, value: string) => void>(),
  removeItem: jest.fn<(key: string) => void>(),
  clear: jest.fn<() => void>(),
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
    require('../../__mocks__/expo-sqlite')._resetDb();

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
      }
    });

    it('tandaiUlangTanpaBiaya: status RETRY tanpa menaikkan retryCount (409 in-progress, review akhir I3)', async () => {
      mockStorage.getItem.mockReturnValue(null);
      await DatabaseService.initDatabase();
      await DatabaseService.addToQueue('/api/presurvei/kegiatan', 'POST', {});
      const item = (await DatabaseService.getPendingQueue())[0];
      await DatabaseService.markAsRetry(item.id);

      await DatabaseService.tandaiUlangTanpaBiaya(item.id);

      const [diperbarui] = await DatabaseService.getPendingQueue();
      expect(diperbarui).toEqual(expect.objectContaining({ id: item.id, status: 'RETRY', retryCount: 1 }));
    });

    it('perbaruiMetaAntrean: mengganti meta item saja, badan dan status tetap (review akhir I2)', async () => {
      mockStorage.getItem.mockReturnValue(null);
      await DatabaseService.initDatabase();
      await DatabaseService.addToQueue('/api/presurvei/kegiatan', 'POST', { jenis: 'KUNJUNGAN' }, { photos: ['file:///x/a.jpg'] });
      const item = (await DatabaseService.getPendingQueue())[0];
      const metaBaru = Object.freeze({ photos: ['file:///x/a.jpg'], urlFotoTerunggah: ['https://cdn.test/a.jpg'] });

      await DatabaseService.perbaruiMetaAntrean(item.id, metaBaru);

      const [diperbarui] = await DatabaseService.getPendingQueue();
      expect(JSON.parse(diperbarui.meta)).toEqual({
        photos: ['file:///x/a.jpg'],
        urlFotoTerunggah: ['https://cdn.test/a.jpg'],
      });
      expect(diperbarui.body).toBe('{"jenis":"KUNJUNGAN"}');
      expect(diperbarui.status).toBe('PENDING');
    });

    it('should mark item as failed with terminal reason', async () => {
      mockStorage.getItem.mockReturnValue(null);
      await DatabaseService.initDatabase();

      await DatabaseService.addToQueue('/api/failed', 'POST', {});
      const pending = await DatabaseService.getPendingQueue();
      const item = pending.find((i: any) => i.url === '/api/failed');

      if (item) {
        await DatabaseService.markAsFailed(item.id, 'attendance reconciliation exhausted');
        const rows = require('../../__mocks__/expo-sqlite')._getRows();
        const updatedItem = rows.find((r: any) => r.id === item.id);
        expect(updatedItem?.status).toBe('FAILED');
        expect(updatedItem?.terminalReason).toBe('attendance reconciliation exhausted');
      }
    });

    it('getAllQueueItems mengembalikan item semua status, termasuk FAILED', async () => {
      mockStorage.getItem.mockReturnValue(null);
      await DatabaseService.initDatabase();
      await DatabaseService.addToQueue('/api/tunda', 'POST', {}, { photos: ['file:///x/tunda.jpg'] });
      await DatabaseService.addToQueue('/api/gagal', 'POST', {}, { photos: ['file:///x/gagal.jpg'] });
      const gagal = (await DatabaseService.getPendingQueue()).find((i: any) => i.url === '/api/gagal');
      await DatabaseService.markAsFailed(gagal.id, 'Retry budget exceeded');

      const semua = await DatabaseService.getAllQueueItems();

      expect(semua.map((i: any) => [i.url, i.status]).sort()).toEqual([
        ['/api/gagal', 'FAILED'],
        ['/api/tunda', 'PENDING'],
      ]);
      expect((await DatabaseService.getPendingQueue()).map((i: any) => i.url)).toEqual(['/api/tunda']);
    });

    it('getAllQueueItems melempar bila database gagal dibuka, bukan mengembalikan []', async () => {
      // [] akan dibaca sweep sebagai "tak ada foto yang dirujuk" → semua terhapus.
      const sqlite = require('expo-sqlite');
      sqlite.openDatabaseAsync.mockImplementationOnce(() => Promise.reject(new Error('disk penuh')));
      mockStorage.getItem.mockReturnValue(null);
      await DatabaseService.initDatabase();

      await expect(DatabaseService.getAllQueueItems()).rejects.toThrow('Database antrean tidak tersedia');
    });

    it('should clear session queue and offline cache keys', async () => {
      mockStorage.getItem.mockImplementation((key) => {
        const storageKey = String(key);
        if (storageKey === 'NETMANAGER_SYNC_QUEUE') {
          return JSON.stringify([
            {
              id: 1,
              url: '/api/test',
              method: 'POST',
              body: '{}',
              status: 'PENDING',
              createdAt: new Date().toISOString(),
              meta: '{}',
            },
          ]);
        }

        if (key === 'NETMANAGER_OFFLINE_CACHE_INDEX') {
          return JSON.stringify(['OFFLINE_["tickets"]', 'OFFLINE_["profile"]']);
        }

        return null;
      });

      await DatabaseService.initDatabase();
      mockStorage.removeItem.mockClear();
      await DatabaseService.clearSessionData();

      expect(mockStorage.removeItem).not.toHaveBeenCalledWith('NETMANAGER_SYNC_QUEUE');
      expect(mockStorage.removeItem).toHaveBeenCalledWith('OFFLINE_["tickets"]');
      expect(mockStorage.removeItem).toHaveBeenCalledWith('OFFLINE_["profile"]');
      expect(mockStorage.removeItem).toHaveBeenCalledWith('NETMANAGER_OFFLINE_CACHE_INDEX');
      const pending = await DatabaseService.getPendingQueue();
      expect(pending).toHaveLength(1);
    });
  });
});
