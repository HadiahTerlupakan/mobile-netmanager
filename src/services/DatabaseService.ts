import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY = "NETMANAGER_SYNC_QUEUE";

export interface SyncQueueItem {
  id: number;
  url: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  body: string; // JSON string
  status: "PENDING" | "RETRY" | "FAILED";
  createdAt: string;
  meta: string; // JSON string for extra info
}

class DatabaseServiceImpl {
  private static instance: DatabaseServiceImpl;
  private isReady: boolean = false;

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
    this.isReady = true;
    return Promise.resolve();
  }

  /**
   * Compatibility method - no-op for AsyncStorage
   */
  public async initDatabase(): Promise<void> {
    this.isReady = true;
    return Promise.resolve();
  }

  // --- OPERATIONS ---

  private async getQueue(): Promise<SyncQueueItem[]> {
    const json = await AsyncStorage.getItem(QUEUE_KEY);
    return json ? JSON.parse(json) : [];
  }

  private async saveQueue(queue: SyncQueueItem[]): Promise<void> {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  public async addToQueue(
    url: string,
    method: string,
    body: any,
    meta: any = {},
  ) {
    const queue = await this.getQueue();

    const newItem: SyncQueueItem = {
      id: Date.now(), // Simple ID generation
      url,
      method: method as any,
      body: JSON.stringify(body),
      status: "PENDING",
      createdAt: new Date().toISOString(),
      meta: JSON.stringify(meta),
    };

    queue.push(newItem);
    await this.saveQueue(queue);
    console.log("[Database] Added to sync queue (AsyncStorage):", url);
  }

  public async getPendingQueue(): Promise<SyncQueueItem[]> {
    const queue = await this.getQueue();
    return queue
      .filter((item) => item.status === "PENDING" || item.status === "RETRY")
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
  }

  public async removeFromQueue(id: number) {
    const queue = await this.getQueue();
    const newQueue = queue.filter((item) => item.id !== id);
    await this.saveQueue(newQueue);
  }

  public async markAsRetry(id: number) {
    const queue = await this.getQueue();
    const index = queue.findIndex((item) => item.id === id);
    if (index !== -1) {
      queue[index].status = "RETRY";
      await this.saveQueue(queue);
    }
  }

  // Legacy methods stubbed or removed as they are no longer needed for GET caching
  // (TanStack Query handles GET caching)
}

// Export a singleton wrapper object to maintain API compatibility
const instance = DatabaseServiceImpl.getInstance();

export const DatabaseService = {
  isReady: () => instance.isInitialized(),
  waitForReady: () => instance.waitForReady(),
  initDatabase: () => instance.initDatabase(),
  addToQueue: (url: string, method: string, body: any, meta: any = {}) =>
    instance.addToQueue(url, method, body, meta),
  getPendingQueue: () => instance.getPendingQueue(),
  removeFromQueue: (id: number) => instance.removeFromQueue(id),
  markAsRetry: (id: number) => instance.markAsRetry(id),
  // Legacy stubs to prevent crashes if old code is cached/referenced
  saveOfflineData: async (key: string, data: any) => {
    console.warn("[Database] saveOfflineData is deprecated");
    return Promise.resolve();
  },
  getOfflineData: async (key: string) => {
    console.warn("[Database] getOfflineData is deprecated");
    return Promise.resolve(null);
  },
};
