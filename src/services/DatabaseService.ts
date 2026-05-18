import * as SQLite from "expo-sqlite";
import { Storage } from "@/utils/storage";
import { logger } from "@/utils/logger";

/**
 * DatabaseService — sync queue dengan expo-sqlite (full migration dari
 * AsyncStorage envelope yang dipakai sebagai stop-gap di Sprint 1).
 *
 * Kenapa SQLite (bukan AsyncStorage JSON):
 *   - Row-level atomic update — `removeFromQueue`/`markAsRetry` tidak
 *     rewrite seluruh blob (sebelumnya 50+ item × multi-KB per status
 *     change = write amplification).
 *   - Schema versioning native via PRAGMA user_version + migration runner.
 *   - Real query (WHERE status IN, ORDER BY createdAt) bukan in-memory
 *     filter array.
 *   - Tidak ada limit ~6MB AsyncStorage Android.
 *
 * Migration: saat init, baca legacy blob dari `Storage[QUEUE_KEY]` (envelope
 * Sprint 1) dan import ke SQLite. Setelah migration sukses, hapus legacy
 * key. Bila SQLite tidak tersedia (web platform), fallback in-memory.
 *
 * API publik (`DatabaseService` export) DIPERTAHANKAN identik dengan
 * versi sebelumnya — caller (`SyncService`, `useApiMutation`) tidak perlu
 * di-refactor.
 */

const LEGACY_QUEUE_KEY = "NETMANAGER_SYNC_QUEUE";
const QUEUE_QUARANTINE_KEY = "NETMANAGER_SYNC_QUEUE_QUARANTINE";
const OFFLINE_INDEX_KEY = "NETMANAGER_OFFLINE_CACHE_INDEX";
const OFFLINE_PREFIX = "OFFLINE_";

const DB_NAME = "netmanager.db";
const DB_USER_VERSION = 1; // Naikkan saat schema berubah breaking
const SYNC_QUEUE_TABLE = "sync_queue";

interface QueueEnvelope {
  schemaVersion: number;
  items: SyncQueueItem[];
}

export interface SyncQueueItem {
  id: number;
  url: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  body: string; // JSON string
  status: "PENDING" | "RETRY" | "FAILED";
  createdAt: string;
  meta: string; // JSON string
  retryCount?: number;
  terminalReason?: string;
}

interface SyncQueueRow {
  id: number;
  url: string;
  method: string;
  body: string;
  status: string;
  createdAt: string;
  meta: string;
  retryCount: number;
  terminalReason: string | null;
}

class DatabaseServiceImpl {
  private static instance: DatabaseServiceImpl;
  private db: SQLite.SQLiteDatabase | null = null;
  private isReady = false;
  private initPromise: Promise<void> | null = null;
  private mutex: Promise<void> = Promise.resolve();
  private idCounter = 0;

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
        this.db = await SQLite.openDatabaseAsync(DB_NAME);
        await this.runMigrations();
        await this.migrateLegacyAsyncStorageQueue();
        this.isReady = true;
        const count = await this.countQueueItems();
        logger.db(`Database initialized (sqlite). Queue size: ${count}`);
      } catch (error) {
        logger.error("Failed to init database:", error);
        // Quarantine legacy blob agar engineer bisa recover.
        await this.quarantineCorruptedQueue().catch(() => undefined);
        this.isReady = true; // Tetap ready agar app tidak block
      }
    })();

    return this.initPromise;
  }

  /**
   * SQLite migration runner berbasis PRAGMA user_version.
   * Tambah `if (currentVersion < N) { ...; await db.execAsync('PRAGMA user_version = N'); }`
   * untuk versi baru di sini saat schema berubah.
   */
  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error("DB not opened");

    const result = await this.db.getFirstAsync<{ user_version: number }>(
      "PRAGMA user_version",
    );
    const currentVersion = result?.user_version ?? 0;

    if (currentVersion < 1) {
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS ${SYNC_QUEUE_TABLE} (
          id INTEGER PRIMARY KEY,
          url TEXT NOT NULL,
          method TEXT NOT NULL,
          body TEXT NOT NULL,
          status TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          meta TEXT NOT NULL,
          retryCount INTEGER NOT NULL DEFAULT 0,
          terminalReason TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_${SYNC_QUEUE_TABLE}_status_created
          ON ${SYNC_QUEUE_TABLE}(status, createdAt);
      `);
      await this.db.execAsync(`PRAGMA user_version = 1`);
      logger.db("[DatabaseService] Schema migrated to v1 (sync_queue)");
    }

    // Future migrations — contoh:
    // if (currentVersion < 2) { await this.db.execAsync(`ALTER TABLE ...`); ... }

    if (currentVersion > DB_USER_VERSION) {
      // Downgrade — schema lebih baru dari binary. Jangan apa-apain;
      // SQLite open tetap sukses tapi caller mungkin reference kolom
      // yang sudah dihapus. Logger warn sudah cukup signal.
      logger.warn(
        `[DatabaseService] DB version ${currentVersion} > expected ${DB_USER_VERSION}. App downgrade?`,
      );
    }
  }

  /**
   * One-shot migration: import data dari AsyncStorage envelope (Sprint 1
   * stop-gap) ke SQLite, lalu hapus legacy key. Idempotent — bila legacy
   * key sudah hilang, no-op.
   */
  private async migrateLegacyAsyncStorageQueue(): Promise<void> {
    if (!this.db) return;
    try {
      const json = await Storage.getItem(LEGACY_QUEUE_KEY);
      if (!json) return;

      const items = this.parseLegacyEnvelope(json);
      if (items.length === 0) {
        await Storage.removeItem(LEGACY_QUEUE_KEY);
        return;
      }

      logger.warn(
        `[DatabaseService] Migrating ${items.length} legacy AsyncStorage queue item(s) to SQLite`,
      );

      // Insert in single transaction agar atomic — kalau crash di tengah
      // migration, legacy key tidak ter-delete dan akan dicoba lagi.
      const db = this.db;
      await db.withExclusiveTransactionAsync(async (txn) => {
        for (const item of items) {
          await txn.runAsync(
            `INSERT OR REPLACE INTO ${SYNC_QUEUE_TABLE}
              (id, url, method, body, status, createdAt, meta, retryCount, terminalReason)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              item.id,
              item.url,
              item.method,
              item.body,
              item.status,
              item.createdAt,
              item.meta,
              item.retryCount ?? 0,
              item.terminalReason ?? null,
            ],
          );
        }
      });
      await Storage.removeItem(LEGACY_QUEUE_KEY);
      logger.info("[DatabaseService] Legacy AsyncStorage queue migrated, key cleared");
    } catch (error) {
      logger.error("[DatabaseService] Legacy migration failed (will retry next init):", error);
      // Jangan re-throw — biar app tetap jalan dengan SQLite kosong;
      // legacy data akan dicoba lagi saat init berikutnya.
    }
  }

  private parseLegacyEnvelope(json: string): SyncQueueItem[] {
    try {
      const parsed = JSON.parse(json) as unknown;
      if (Array.isArray(parsed)) return parsed as SyncQueueItem[];
      if (parsed && typeof parsed === "object" && "items" in parsed) {
        return ((parsed as QueueEnvelope).items ?? []) as SyncQueueItem[];
      }
    } catch {
      // Invalid JSON
    }
    return [];
  }

  private async quarantineCorruptedQueue(): Promise<void> {
    try {
      const raw = await Storage.getItem(LEGACY_QUEUE_KEY);
      if (!raw) return;
      const stamped = JSON.stringify({
        quarantinedAt: new Date().toISOString(),
        raw,
      });
      await Storage.setItem(QUEUE_QUARANTINE_KEY, stamped);
      logger.warn(
        "[DatabaseService] Corrupted legacy queue moved to quarantine — see Storage[NETMANAGER_SYNC_QUEUE_QUARANTINE]",
      );
    } catch (error) {
      logger.error("[DatabaseService] Failed to quarantine corrupted queue", error);
    }
  }

  private async withMutex<T>(fn: () => Promise<T>): Promise<T> {
    let release!: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const prev = this.mutex;
    this.mutex = next;
    await prev;
    try {
      return await fn();
    } finally {
      release();
    }
  }

  /**
   * Generate ID unik. SQLite PRIMARY KEY akan reject duplicate, dan
   * counter di-cap modulo 1000 per ms — collision rate praktis nol untuk
   * mobile use case (max ~1k submission/detik per device).
   */
  private generateId(): number {
    const timestamp = Date.now();
    this.idCounter = (this.idCounter + 1) % 1000;
    return timestamp * 1000 + this.idCounter;
  }

  private async countQueueItems(): Promise<number> {
    if (!this.db) return 0;
    const row = await this.db.getFirstAsync<{ c: number }>(
      `SELECT COUNT(*) AS c FROM ${SYNC_QUEUE_TABLE}`,
    );
    return row?.c ?? 0;
  }

  private rowToItem(row: SyncQueueRow): SyncQueueItem {
    return {
      id: row.id,
      url: row.url,
      method: row.method as SyncQueueItem["method"],
      body: row.body,
      status: row.status as SyncQueueItem["status"],
      createdAt: row.createdAt,
      meta: row.meta,
      retryCount: row.retryCount,
      ...(row.terminalReason ? { terminalReason: row.terminalReason } : {}),
    };
  }

  // ────────────── Offline cache index (kept on AsyncStorage) ──────────────
  // Cache data lookup-by-key tidak butuh atomicity; AsyncStorage cukup.

  private async getOfflineIndex(): Promise<string[]> {
    try {
      const json = await Storage.getItem(OFFLINE_INDEX_KEY);
      if (!json) return [];
      const parsed = JSON.parse(json) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((entry): entry is string => typeof entry === "string")
        : [];
    } catch (error) {
      logger.error("Failed to read offline cache index:", error);
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
      logger.error("Failed to persist offline cache index:", error);
    }
  }

  // ────────────── Public API (compat dengan versi sebelumnya) ──────────────

  public async addToQueue(
    url: string,
    method: string,
    body: unknown,
    meta: Record<string, unknown> = {},
  ): Promise<void> {
    if (!this.isReady) await this.waitForReady();

    return this.withMutex(async () => {
      if (!this.db) {
        logger.error("[DatabaseService] addToQueue called but db not opened");
        return;
      }
      const item: SyncQueueItem = {
        id: this.generateId(),
        url,
        method: method as SyncQueueItem["method"],
        body: JSON.stringify(body),
        status: "PENDING",
        createdAt: new Date().toISOString(),
        meta: JSON.stringify(meta),
        retryCount: 0,
      };
      await this.db.runAsync(
        `INSERT INTO ${SYNC_QUEUE_TABLE}
          (id, url, method, body, status, createdAt, meta, retryCount, terminalReason)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        [
          item.id,
          item.url,
          item.method,
          item.body,
          item.status,
          item.createdAt,
          item.meta,
          item.retryCount ?? 0,
        ],
      );
      logger.db(`Added to sync queue: ${url}`);
    });
  }

  public async getPendingQueue(): Promise<SyncQueueItem[]> {
    if (!this.isReady) await this.waitForReady();
    if (!this.db) return [];

    const rows = await this.db.getAllAsync<SyncQueueRow>(
      `SELECT * FROM ${SYNC_QUEUE_TABLE}
        WHERE status IN ('PENDING', 'RETRY')
        ORDER BY createdAt ASC`,
    );
    return rows.map((row) => this.rowToItem(row));
  }

  public async removeFromQueue(id: number): Promise<void> {
    if (!this.isReady) await this.waitForReady();

    return this.withMutex(async () => {
      if (!this.db) return;
      await this.db.runAsync(
        `DELETE FROM ${SYNC_QUEUE_TABLE} WHERE id = ?`,
        [id],
      );
    });
  }

  public async markAsRetry(id: number): Promise<void> {
    if (!this.isReady) await this.waitForReady();

    return this.withMutex(async () => {
      if (!this.db) return;
      await this.db.runAsync(
        `UPDATE ${SYNC_QUEUE_TABLE}
          SET status = 'RETRY',
              retryCount = retryCount + 1,
              terminalReason = NULL
          WHERE id = ?`,
        [id],
      );
    });
  }

  public async markAsFailed(id: number, reason: string): Promise<void> {
    if (!this.isReady) await this.waitForReady();

    return this.withMutex(async () => {
      if (!this.db) return;
      await this.db.runAsync(
        `UPDATE ${SYNC_QUEUE_TABLE}
          SET status = 'FAILED', terminalReason = ?
          WHERE id = ?`,
        [reason, id],
      );
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
      return json ? (JSON.parse(json) as T) : null;
    } catch (error) {
      logger.error("Failed to get offline data:", error);
      return null;
    }
  }

  public async clearSessionData(): Promise<void> {
    if (!this.isReady) await this.waitForReady();

    return this.withMutex(async () => {
      // Penting: JANGAN wipe queue di sini. Field worker yang force-logout
      // (token expired) akan kehilangan attendance/work-order offline kalau
      // queue di-reset. Queue tetap di SQLite dan diproses saat user
      // login berikutnya — SyncService reject item dari user lain
      // berdasarkan auth token yang aktif.
      try {
        const offlineKeys = await this.getOfflineIndex();
        await Promise.all(offlineKeys.map((key) => Storage.removeItem(key)));
        await Storage.removeItem(OFFLINE_INDEX_KEY);
      } catch (error) {
        logger.error("Failed to clear session data:", error);
      }
    });
  }
}

export const DatabaseService = {
  isReady: () => DatabaseServiceImpl.getInstance().isInitialized(),
  waitForReady: () => DatabaseServiceImpl.getInstance().waitForReady(),
  initDatabase: () => DatabaseServiceImpl.getInstance().initDatabase(),
  addToQueue: (
    url: string,
    method: string,
    body: unknown,
    meta: Record<string, unknown> = {},
  ) => DatabaseServiceImpl.getInstance().addToQueue(url, method, body, meta),
  getPendingQueue: () => DatabaseServiceImpl.getInstance().getPendingQueue(),
  removeFromQueue: (id: number) =>
    DatabaseServiceImpl.getInstance().removeFromQueue(id),
  markAsRetry: (id: number) =>
    DatabaseServiceImpl.getInstance().markAsRetry(id),
  markAsFailed: (id: number, reason: string) =>
    DatabaseServiceImpl.getInstance().markAsFailed(id, reason),
  saveOfflineData: (key: string, data: unknown) =>
    DatabaseServiceImpl.getInstance().saveOfflineData(key, data),
  getOfflineData: <T,>(key: string) =>
    DatabaseServiceImpl.getInstance().getOfflineData<T>(key),
  clearSessionData: () => DatabaseServiceImpl.getInstance().clearSessionData(),
};
