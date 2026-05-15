import { Storage } from "@/utils/storage";
import { logger } from "@/utils/logger";

const QUEUE_KEY = "NETMANAGER_SYNC_QUEUE";
const OFFLINE_INDEX_KEY = 'NETMANAGER_OFFLINE_CACHE_INDEX';
const OFFLINE_PREFIX = 'OFFLINE_';

export interface SyncQueueItem {
  id: number;
  url: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  body: string; // JSON string
  status: "PENDING" | "RETRY" | "FAILED";
  createdAt: string;
  meta: string; // JSON string for extra info
  retryCount?: number;
  terminalReason?: string;
}

class DatabaseServiceImpl {
  private static instance: DatabaseServiceImpl;
  private isReady: boolean = false;
  private memoryQueue: SyncQueueItem[] = [];
  private initPromise: Promise<void> | null = null;
  private mutex: Promise<void> = Promise.resolve();
  private idCounter: number = 0;

  private constructor() {}

  public static getInstance(): DatabaseServiceImpl {
    if (!DatabaseServiceImpl.instance) {
      DatabaseServiceImpl.instance = new DatabaseServiceImpl();
    }
    return DatabaseServiceImpl.instance;
  }

  public isInitialized(): boolean {
    return this.isReady;
  }

  public async waitForReady(): Promise<void> {
    if (this.isReady) return;
    if (this.initPromise) return this.initPromise;
    return this.initDatabase();
  }

  public async initDatabase(): Promise<void> {
    if (this.isReady) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const json = await Storage.getItem(QUEUE_KEY);
        if (json) {
          this.memoryQueue = JSON.parse(json);
        }
        this.isReady = true;
        logger.db(`Database initialized. Queue size: ${this.memoryQueue.length}`);
      } catch (error) {
        logger.error("Failed to init database:", error);
        this.memoryQueue = [];
        this.isReady = true; // Fallback to ready empty state
      }
    })();

    return this.initPromise;
  }

  private async withMutex<T>(fn: () => Promise<T>): Promise<T> {
    let release: () => void;
    const next = new Promise<void>(resolve => { release = resolve; });
    const prev = this.mutex;
    this.mutex = next;
    await prev;
    try {
      return await fn();
    } finally {
      release!();
    }
  }

  private generateId(): number {
    const timestamp = Date.now();
    this.idCounter = (this.idCounter + 1) % 1000;
    return timestamp * 1000 + this.idCounter;
  }

  private async persistQueue(): Promise<void> {
    try {
      await Storage.setItem(QUEUE_KEY, JSON.stringify(this.memoryQueue));
    } catch (error) {
      logger.error("Failed to persist queue:", error);
    }
  }

  private async getOfflineIndex(): Promise<string[]> {
    try {
      const json = await Storage.getItem(OFFLINE_INDEX_KEY);
      if (!json) {
        return [];
      }

      const parsed = JSON.parse(json) as unknown;
      return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : [];
    } catch (error) {
      logger.error('Failed to read offline cache index:', error);
      return [];
    }
  }

  private async persistOfflineIndex(index: string[]): Promise<void> {
    try {
      if (index.length === 0) {
        await Storage.removeItem(OFFLINE_INDEX_KEY);
        return;
      }

      await Storage.setItem(OFFLINE_INDEX_KEY, JSON.stringify(index));
    } catch (error) {
      logger.error('Failed to persist offline cache index:', error);
    }
  }

  public async addToQueue(
    url: string,
    method: string,
    body: unknown,
    meta: Record<string, unknown> = {},
  ) {
    if (!this.isReady) await this.waitForReady();

    return this.withMutex(async () => {
      const newItem: SyncQueueItem = {
        id: this.generateId(),
        url,
        method: method as SyncQueueItem["method"],
        body: JSON.stringify(body),
        status: "PENDING",
        createdAt: new Date().toISOString(),
        meta: JSON.stringify(meta),
        retryCount: 0,
      };

      this.memoryQueue.push(newItem);
      await this.persistQueue();
      logger.db(`Added to sync queue: ${url}`);
    });
  }

  public async getPendingQueue(): Promise<SyncQueueItem[]> {
    if (!this.isReady) await this.waitForReady();
    return this.memoryQueue
      .filter((item) => item.status === "PENDING" || item.status === "RETRY")
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
  }

  public async removeFromQueue(id: number) {
    if (!this.isReady) await this.waitForReady();

    return this.withMutex(async () => {
      this.memoryQueue = this.memoryQueue.filter((item) => item.id !== id);
      await this.persistQueue();
    });
  }

  public async markAsRetry(id: number) {
    if (!this.isReady) await this.waitForReady();

    return this.withMutex(async () => {
      const item = this.memoryQueue.find((queueItem) => queueItem.id === id);
      if (item) {
        item.status = "RETRY";
        item.retryCount = (item.retryCount || 0) + 1;
        delete item.terminalReason;
        await this.persistQueue();
      }
    });
  }

  public async markAsFailed(id: number, reason: string) {
    if (!this.isReady) await this.waitForReady();

    return this.withMutex(async () => {
      const item = this.memoryQueue.find((queueItem) => queueItem.id === id);
      if (item) {
        item.status = "FAILED";
        item.terminalReason = reason;
        await this.persistQueue();
      }
    });
  }

  public async saveOfflineData(key: string, data: unknown): Promise<void> {
    try {
      const storageKey = `${OFFLINE_PREFIX}${key}`;
      await Storage.setItem(storageKey, JSON.stringify(data));

      const index = await this.getOfflineIndex();
      if (!index.includes(storageKey)) {
        index.push(storageKey);
        await this.persistOfflineIndex(index);
      }
    } catch (error) {
      logger.error("Failed to save offline data:", error);
    }
  }

  public async getOfflineData<T>(key: string): Promise<T | null> {
    try {
      const json = await Storage.getItem(`${OFFLINE_PREFIX}${key}`);
      return json ? JSON.parse(json) : null;
    } catch (error) {
      logger.error("Failed to get offline data:", error);
      return null;
    }
  }

  public async clearSessionData(): Promise<void> {
    if (!this.isReady) await this.waitForReady();

    return this.withMutex(async () => {
      this.memoryQueue = [];

      try {
        await Storage.removeItem(QUEUE_KEY);

        const offlineKeys = await this.getOfflineIndex();
        await Promise.all(offlineKeys.map((key) => Storage.removeItem(key)));
        await Storage.removeItem(OFFLINE_INDEX_KEY);
      } catch (error) {
        logger.error('Failed to clear session data:', error);
      }
    });
  }
}

// Export a singleton wrapper object to maintain API compatibility

export const DatabaseService = {
  isReady: () => DatabaseServiceImpl.getInstance().isInitialized(),
  waitForReady: () => DatabaseServiceImpl.getInstance().waitForReady(),
  initDatabase: () => DatabaseServiceImpl.getInstance().initDatabase(),
  addToQueue: (url: string, method: string, body: unknown, meta: Record<string, unknown> = {}) =>
    DatabaseServiceImpl.getInstance().addToQueue(url, method, body, meta),
  getPendingQueue: () => DatabaseServiceImpl.getInstance().getPendingQueue(),
  removeFromQueue: (id: number) => DatabaseServiceImpl.getInstance().removeFromQueue(id),
  markAsRetry: (id: number) => DatabaseServiceImpl.getInstance().markAsRetry(id),
  markAsFailed: (id: number, reason: string) => DatabaseServiceImpl.getInstance().markAsFailed(id, reason),
  saveOfflineData: (key: string, data: unknown) => DatabaseServiceImpl.getInstance().saveOfflineData(key, data),
  getOfflineData: <T>(key: string) => DatabaseServiceImpl.getInstance().getOfflineData<T>(key),
  clearSessionData: () => DatabaseServiceImpl.getInstance().clearSessionData(),
};
