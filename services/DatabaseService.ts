import * as SQLite from 'expo-sqlite';

const DB_NAME = 'netmanager_offline.db';
const CURRENT_DB_VERSION = 2; // Increment this when changing schema

export interface SyncQueueItem {
    id: number;
    url: string;
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body: string; // JSON string
    status: 'PENDING' | 'RETRY' | 'FAILED';
    createdAt: string;
    meta: string; // JSON string for extra info (e.g., photo paths to upload first)
}

class DatabaseServiceImpl {
    private static instance: DatabaseServiceImpl;
    private db: SQLite.SQLiteDatabase | null = null;
    private initPromise: Promise<void> | null = null;
    private isReady: boolean = false;

    private constructor() { }

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
        if (this.isReady && this.db) return;
        if (this.initPromise) {
            await this.initPromise;
            return;
        }
        await this.initDatabase();
    }

    public async getDB(): Promise<SQLite.SQLiteDatabase> {
        if (!this.isReady || !this.db) {
            await this.waitForReady();
        }
        if (!this.db) {
            throw new Error('Database initialization failed - DB instance is null');
        }
        return this.db;
    }

    public async initDatabase(): Promise<void> {
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                this.db = await SQLite.openDatabaseAsync(DB_NAME, { useNewConnection: true });

                // Check version and migrate
                const versionResult = await this.db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
                const currentVersion = versionResult?.user_version ?? 0;

                console.log(`[Database] Current Version: ${currentVersion}, Target Version: ${CURRENT_DB_VERSION}`);

                if (currentVersion < 1) {
                    await this.migrateV1(this.db);
                }
                
                if (currentVersion < 2) {
                     await this.migrateV2(this.db);
                }

                // Future migrations go here...
                // if (currentVersion < 3) await this.migrateV3(this.db);

                this.isReady = true;
                console.log('[Database] Initialization complete');
            } catch (error) {
                console.error('[Database] Initialization error:', error);
                this.db = null;
                this.isReady = false;
                throw error;
            } finally {
                this.initPromise = null;
            }
        })();

        return this.initPromise;
    }

    // --- MIGRATIONS ---

    private async migrateV1(db: SQLite.SQLiteDatabase) {
        console.log('[Database] Running Migration V1...');
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            );
            
            CREATE TABLE IF NOT EXISTS sync_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL,
                method TEXT NOT NULL,
                body TEXT,
                status TEXT DEFAULT 'PENDING',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                meta TEXT
            );

            CREATE TABLE IF NOT EXISTS offline_cache (
                key TEXT PRIMARY KEY,
                data TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            PRAGMA user_version = 1;
        `);
    }

    private async migrateV2(db: SQLite.SQLiteDatabase) {
        console.log('[Database] Running Migration V2...');
        // Example: Add index to sync_queue status for faster queries
        await db.execAsync(`
            CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
            PRAGMA user_version = 2;
        `);
    }

    // --- OPERATIONS ---

    public async addToQueue(url: string, method: string, body: any, meta: any = {}) {
        const db = await this.getDB();
        const jsonBody = JSON.stringify(body);
        const jsonMeta = JSON.stringify(meta);

        await db.runAsync(
            'INSERT INTO sync_queue (url, method, body, meta, status) VALUES (?, ?, ?, ?, ?)',
            url, method, jsonBody, jsonMeta, 'PENDING'
        );
        console.log('[Database] Added to sync queue:', url);
    }

    public async getPendingQueue(): Promise<SyncQueueItem[]> {
        const db = await this.getDB();
        const result = await db.getAllAsync<any>(
            "SELECT * FROM sync_queue WHERE status IN ('PENDING', 'RETRY') ORDER BY created_at ASC"
        );

        return result.map(row => ({
            id: row.id,
            url: row.url,
            method: row.method as any,
            body: row.body,
            status: row.status as any,
            createdAt: row.created_at,
            meta: row.meta
        }));
    }

    public async removeFromQueue(id: number) {
        const db = await this.getDB();
        await db.runAsync('DELETE FROM sync_queue WHERE id = ?', id);
    }

    public async markAsRetry(id: number) {
        const db = await this.getDB();
        await db.runAsync("UPDATE sync_queue SET status = 'RETRY' WHERE id = ?", id);
    }

    public async saveOfflineData(key: string, data: any) {
        const db = await this.getDB();
        const jsonData = JSON.stringify(data);
        await db.runAsync(
            `INSERT INTO offline_cache (key, data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(key) DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP`,
            key, jsonData
        );
    }

    public async getOfflineData(key: string) {
        const db = await this.getDB();
        const result = await db.getFirstAsync<{ data: string }>(
            'SELECT data FROM offline_cache WHERE key = ?',
            key
        );
        return result ? JSON.parse(result.data) : null;
    }
}

// Export a singleton wrapper object to maintain API compatibility
const instance = DatabaseServiceImpl.getInstance();

export const DatabaseService = {
    isReady: () => instance.isInitialized(),
    waitForReady: () => instance.waitForReady(),
    getDB: () => instance.getDB(),
    initDatabase: () => instance.initDatabase(),
    addToQueue: (url: string, method: string, body: any, meta: any = {}) => instance.addToQueue(url, method, body, meta),
    getPendingQueue: () => instance.getPendingQueue(),
    removeFromQueue: (id: number) => instance.removeFromQueue(id),
    markAsRetry: (id: number) => instance.markAsRetry(id),
    saveOfflineData: (key: string, data: any) => instance.saveOfflineData(key, data),
    getOfflineData: (key: string) => instance.getOfflineData(key)
};
