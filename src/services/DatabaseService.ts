import { Storage } from "@/utils/storage";
import { logger } from "@/utils/logger";

const QUEUE_KEY = "NETMANAGER_SYNC_QUEUE";

export interface SyncQueueItem {
  id: number;
  url: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  body: string; // JSON string
  status: "PENDING" | "RETRY" | "FAILED";
  createdAt: string;
  meta: string; // JSON string for extra info
  retryCount?: number;
}

class DatabaseServiceImpl {
  private static instance: DatabaseServiceImpl;
  private isReady: boolean = false;
  private memoryQueue: SyncQueueItem[] = [];
  private initPromise: Promise<void> | null = null;

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
        const json = Storage.getItem(QUEUE_KEY);
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

  private async persistQueue(): Promise<void> {
    try {
      Storage.setItem(QUEUE_KEY, JSON.stringify(this.memoryQueue));
    } catch (error) {
      logger.error("Failed to persist queue:", error);
    }
  }

  public async addToQueue(
    url: string,
    method: string,
    body: unknown,
    meta: Record<string, unknown> = {},
  ) {
    if (!this.isReady) await this.waitForReady();

    const newItem: SyncQueueItem = {
      id: Date.now(),
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
    this.memoryQueue = this.memoryQueue.filter((item) => item.id !== id);
    await this.persistQueue();
  }

  public async markAsRetry(id: number) {
    if (!this.isReady) await this.waitForReady();
    const item = this.memoryQueue.find((item) => item.id === id);
    if (item) {
      item.status = "RETRY";
      item.retryCount = (item.retryCount || 0) + 1;
      await this.persistQueue();
    }
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
};
