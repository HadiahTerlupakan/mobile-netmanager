/**
 * HTTP timeout constants — single source of truth.
 *
 * Sebelumnya magic number tersebar:
 *   - axios global 60s
 *   - useApiMutation override 15s
 *   - SyncService 15s
 *   - RefreshTokenService 10s
 *   - LocationTracking 10s/30s
 *   - ErrorReporting 5s
 *   - UploadService tidak ada
 *
 * Konsolidasi di sini agar reasoning timeout konsisten dan tidak terjadi
 * konflik (mis. backend operasi 30s sementara client timeout di 15s).
 */
export const HTTP_TIMEOUTS = {
  /** Telemetry, version check, error report — boleh fail cepat. */
  short: 10_000,

  /** Default CRUD/mutation. Cukup untuk operasi backend tipikal. */
  standard: 30_000,

  /** Operasi berat: upload, payment, generate report, batch processing. */
  long: 60_000,

  /** Background sync / replay — toleran karena retry by SyncService. */
  sync: 30_000,

  /** Token refresh — harus cepat agar tidak block UI. */
  refresh: 10_000,
} as const;

export type HttpTimeoutKey = keyof typeof HTTP_TIMEOUTS;
