import NetInfo from '@react-native-community/netinfo';
import { isAxiosError } from 'axios';
import pLimit from 'p-limit';
import { AppState, DeviceEventEmitter } from 'react-native';
import { DatabaseService, SyncQueueItem } from './DatabaseService';
import * as SecureStore from 'expo-secure-store'; // Ensure SyncQueueItem is exported
import { presentErrorMessage, presentInfoMessage } from '@/utils/errorPresenter';
import { logger } from '../utils/logger';
import { uploadService, UploadType } from './UploadService';
import { eventManager } from '@/utils/EventManager';
import { AttendanceTelemetryService } from './AttendanceTelemetryService';
import { buildAttendanceIdempotencyHeaders } from '@/utils/attendanceIdempotency';
import api from './api';
import { extractApiErrorMessage } from '@/utils/errorHandling';
import { cleanupOfflinePhotos } from '@/utils/persistPhoto';
import { HTTP_TIMEOUTS } from '@/constants/httpTimeouts';
import {
  isGalatIdempotensiKunciDipakaiUlang,
  isGalatIdempotensiSedangDiproses,
  JEDA_ULANG_SEDANG_DIPROSES_MS,
} from '@/utils/galatIdempotensi';
import { TelemetryService } from './TelemetryService';
import { RefreshTokenService } from './RefreshTokenService';
import {
  collectPersistedPhotoUris,
  getOptimalConcurrency,
  isPermanentSyncFailure,
  prioritizeQueue,
} from './syncQueueHelpers';

const SYNC_REQUEST_TIMEOUT_MS = HTTP_TIMEOUTS.sync;
const MAX_ATTENDANCE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_GENERAL_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Global retry budget — total attempt termasuk attempt sukses sebelumnya.
 * Tanpa cap, item permanent-fail akan loop forever (in-attempt retry 3x
 * di processQueueItem habis → markAsRetry → next batch retry 3x lagi → ...).
 */
const MAX_GLOBAL_RETRY_COUNT = 10;

/** Debounce drain antrean supaya pemicu beruntun (jaringan + foreground) menyatu. */
const SYNC_DRAIN_DEBOUNCE_MS = 2000;


/** Returns true if the URL belongs to an attendance endpoint. */
const isAttendanceEndpoint = (url: string): boolean =>
    url.includes('/attendance/') || url.includes('check-in') || url.includes('check-out') || url.includes('absensi');
const ATTENDANCE_RECONCILIATION_STATUSES = new Set([409, 422]);
const ATTENDANCE_RECONCILIATION_RETRY_CAP = 3;

type SyncQueueMeta = {
    photos?: string[];
    photoType?: string;
    watermarkLines?: string[];
    targetField?: string;
    singleFile?: boolean;
    photoMap?: Record<string, string>;
    requestId?: string;
    /**
     * URL server untuk `photos` (urutan sama), disimpan ke antrean begitu semua
     * foto terunggah. `photos` sendiri tetap URI lokal supaya salinannya baru
     * dibersihkan setelah item selesai dan tetap dilindungi dari sweep.
     * Item lama tanpa medan ini diproses seperti sebelumnya.
     */
    urlFotoTerunggah?: string[];
    /** URL server per medan `photoMap` yang sudah terunggah (lihat `urlFotoTerunggah`). */
    urlPetaFotoTerunggah?: Record<string, string>;
};

/** Pesan saat replay ditolak 409 `IDEMPOTENCY_KEY_REUSED`: upaya sebelumnya sudah diterima server. */
const PESAN_SUDAH_TERCATAT = 'Data offline sudah tercatat sebelumnya.';

const isUriLokal = (uri: string): boolean => uri.startsWith('file://');

/**
 * URL tersimpan untuk `meta.photos`, hanya bila lengkap (satu URL per foto).
 * Selain itu `null`: foto diproses seperti item lama.
 */
const ambilUrlFotoTersimpan = (meta: SyncQueueMeta): string[] | null => {
    const { photos, urlFotoTerunggah } = meta;
    if (!Array.isArray(photos) || !Array.isArray(urlFotoTerunggah)) return null;
    if (urlFotoTerunggah.length !== photos.length) return null;
    return urlFotoTerunggah.every((url) => typeof url === 'string' && url.length > 0) ? urlFotoTerunggah : null;
};

/**
 * Simpan meta berisi URL foto terunggah ke antrean. Gagal simpan tidak
 * menggagalkan item: cache di memori tetap berlaku untuk batch ini.
 */
const simpanUrlFotoKeAntrean = async (id: number, meta: SyncQueueMeta): Promise<void> => {
    try {
        await DatabaseService.perbaruiMetaAntrean(id, meta);
    } catch (error) {
        logger.warn(`[SyncService] URL foto item ${id} gagal disimpan ke antrean:`, error);
    }
};

/**
 * Replay POST ber-`requestId` yang ditolak 409 `IDEMPOTENCY_KEY_REUSED`.
 * Badan antrean hanya bisa berubah lewat URL foto hasil unggah ulang, jadi
 * kunci sama dengan hash beda berarti upaya sebelumnya sudah diterima server:
 * item dituntaskan seperti sukses, bukan "Data dibatalkan".
 */
const tuntaskanItemSudahTercatat = async (item: SyncQueueItem, requestId: string): Promise<void> => {
    logger.sync(`Item ${item.id} sudah tercatat di server (409 KEY_REUSED saat replay). Removing.`);
    await cleanupOfflinePhotos(collectPersistedPhotoUris(item));
    await DatabaseService.removeFromQueue(item.id);
    TelemetryService.trackSyncResult({
        endpoint: item.url,
        outcome: 'succeeded',
        payload: { requestId, reason: 'idempotency_key_reused' },
    });
    DeviceEventEmitter.emit('sync:succeeded', { endpoint: item.url, method: item.method, requestId });
    presentInfoMessage(PESAN_SUDAH_TERCATAT);
};

class SyncQueuePhotoUploadError extends Error {}

class SyncQueuePayloadError extends Error {}

const parseQueuePayload = <T extends Record<string, unknown>>(
    rawValue: string | null | undefined,
    itemId: number,
    fieldName: 'body' | 'meta'
): T => {
    if (!rawValue) {
        return {} as T;
    }

    try {
        const parsed = JSON.parse(rawValue) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as T;
        }

        throw new Error(`${fieldName} is not an object`);
    } catch (error) {
        throw new SyncQueuePayloadError(
            `Invalid queued ${fieldName} for item ${itemId}: ${error instanceof Error ? error.message : 'unknown parse error'}`
        );
    }
};

const cloneQueuePayload = <T extends Record<string, unknown>>(value: T): T =>
    JSON.parse(JSON.stringify(value)) as T;

// Helper for upload (outside component)
const uploadFile = async (uri: string, type: string, watermarkLines?: string[]): Promise<string | null> => {
    try {
        const params: Record<string, string> = {};
        if (watermarkLines) {
            params.watermarkLines = JSON.stringify(watermarkLines);
        }

        return await uploadService.uploadFile(uri, type as UploadType, {
            params
        });
    } catch (error) {
        logger.error('[SyncService] File upload failed:', error);
        return null;
    }
};

export const SyncService = {
  isMonitoring: false,
  isProcessing: false,
  processTimeout: null as ReturnType<typeof setTimeout> | null,

  isOnline: async () => {
      const state = await NetInfo.fetch();
      return state.isConnected && state.isInternetReachable;
  },

  startMonitoring: () => {
    if (SyncService.isMonitoring) return;

    SyncService.isMonitoring = true;
    logger.sync('[SyncService] Starting network monitoring...');

    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(state => {
      logger.sync('[SyncService] Network state changed:', state.isConnected);
      if (state.isConnected && state.isInternetReachable) {
        SyncService.scheduleQueueDrain();
      }
    });

    // Jaringan sering sudah stabil saat app dibuka, atau pulih ketika app di
    // background — dua kondisi yang tidak menghasilkan event NetInfo. Tanpa
    // kedua pemicu di bawah, antrean offline (mis. absensi) baru terkirim saat
    // kebetulan ada transisi jaringan berikutnya, yang bisa berjam-jam kemudian.
    const appStateSubscription = AppState.addEventListener('change', nextState => {
      if (nextState !== 'active') return;
      logger.sync('[SyncService] App returned to foreground, draining queue...');
      SyncService.scheduleQueueDrain();
    });

    eventManager.addListener('sync', null, () => {
      unsubscribe();
      appStateSubscription.remove();
    });

    SyncService.scheduleQueueDrain();
  },

  /**
   * Jadwalkan drain antrean dengan debounce agar pemicu beruntun tidak
   * menumpuk. `jedaMs` lebih panjang dipakai untuk 409 in-progress
   * (`JEDA_ULANG_SEDANG_DIPROSES_MS`); pemicu berikutnya menggantikan jadwal ini.
   */
  scheduleQueueDrain: (jedaMs: number = SYNC_DRAIN_DEBOUNCE_MS) => {
    if (SyncService.processTimeout) {
      clearTimeout(SyncService.processTimeout);
    }
    SyncService.processTimeout = setTimeout(() => {
      SyncService.processQueue();
    }, jedaMs);
  },

  stopMonitoring: () => {
    if (!SyncService.isMonitoring) return;

    SyncService.isMonitoring = false;
    if (SyncService.processTimeout) {
        clearTimeout(SyncService.processTimeout);
        SyncService.processTimeout = null;
    }

    eventManager.removeAllListeners('sync');
    logger.sync('[SyncService] Stopped network monitoring.');
  },

  processQueue: async () => {
    if (SyncService.isProcessing) {
        logger.sync('[SyncService] Queue already processing, skipping...');
        return;
    }

    SyncService.isProcessing = true;
    logger.sync('[SyncService] Checking sync queue...');

    try {
        // Wait for database to be ready before proceeding
        if (!DatabaseService.isReady()) {
          logger.sync('[SyncService] Database not ready, waiting...');
          try {
            await DatabaseService.waitForReady();
          } catch (error) {
            logger.error('[SyncService] Database initialization failed, skipping queue processing', error);
            return;
          }
        }

        const queue = await DatabaseService.getPendingQueue();

        if (queue.length === 0) {
          logger.sync('[SyncService] Queue is empty.');
          return;
        }

        logger.sync(`[SyncService] Found ${queue.length} items to sync.`);

        // Prioritize queue items
        const prioritizedQueue = prioritizeQueue(queue);

        // Adaptive concurrency based on queue size
        const concurrency = getOptimalConcurrency(prioritizedQueue.length);
        logger.sync(`[SyncService] Processing with concurrency: ${concurrency}`);

        // Helper to get token (can't use hook here outside component)
        let token = await SecureStore.getItemAsync('session_token');
        if (!token) {
          // Coba refresh token sebelum skip — kalau access token expired
          // tapi refresh token masih valid, sync bisa lanjut tanpa user
          // perlu re-login. Tanpa branch ini, queue item stuck sampai user
          // buka app dan login ulang.
          logger.sync('[SyncService] No session token, attempting refresh...');
          token = await RefreshTokenService.refreshAccessToken().catch(() => null);
          if (!token) {
            logger.warn('[SyncService] Skipping queue processing — no session token and refresh failed.');
            return;
          }
        }

        const limit = pLimit(concurrency);

        // Process all items with concurrency limit
        const promises = prioritizedQueue.map(item => limit(() => SyncService.processQueueItem(item, token)));

        await Promise.allSettled(promises);

        logger.sync('[SyncService] Queue processing batch complete.');
    } catch (error) {
        logger.error('[SyncService] Global error during processing:', error);
    } finally {
        SyncService.isProcessing = false;
    }
  },


  /**
   * Process a single queue item with retry logic (Exponential Backoff)
   */
  processQueueItem: async (item: SyncQueueItem, token: string | null) => {
      const MAX_RETRIES = 3;
      let attempt = 0;
      let baseBody: Record<string, unknown>;
      let baseMeta: SyncQueueMeta;

      // TTL check: skip stale items to prevent replaying outdated data
      const itemAge = Date.now() - new Date(item.createdAt).getTime();
      const maxAge = isAttendanceEndpoint(item.url) ? MAX_ATTENDANCE_AGE_MS : MAX_GENERAL_AGE_MS;
      if (itemAge > maxAge) {
          logger.warn(`[SyncService] Item ${item.id} expired (age: ${Math.round(itemAge / 60000)}min, max: ${Math.round(maxAge / 60000)}min). Removing.`);
          await cleanupOfflinePhotos(collectPersistedPhotoUris(item));
          await DatabaseService.removeFromQueue(item.id);
          TelemetryService.trackSyncResult({
            endpoint: item.url,
            outcome: 'expired_ttl',
            payload: { ageMinutes: Math.round(itemAge / 60000) },
          });
          // Notify user — silent discard data offline membuat field worker
          // tidak tahu attendance/work-order mereka hilang setelah lama
          // offline.
          const ageHours = Math.round(itemAge / (60 * 60 * 1000));
          presentErrorMessage(
              `Data offline (${ageHours} jam) sudah kedaluwarsa dan dihapus. Silakan submit ulang.`,
              'Data Antrean Kedaluwarsa',
          );
          return;
      }

      // Global retry budget — drop item bila sudah lewat budget agar
      // tidak loop forever (tiap batch retry 3x → markAsRetry → batch
      // berikutnya retry 3x lagi → ...). Tanpa cap, item dengan 5xx
      // berkepanjangan akan terus consume bandwidth + photo re-upload.
      const globalRetry = item.retryCount ?? 0;
      if (globalRetry >= MAX_GLOBAL_RETRY_COUNT) {
          logger.warn(
            `[SyncService] Item ${item.id} exceeded global retry budget (${globalRetry}/${MAX_GLOBAL_RETRY_COUNT}). Marking as failed.`,
          );
          // Foto TIDAK dibersihkan: item FAILED tetap di antrean, dan sweep startup
          // (sapuFotoOffline.ts) sengaja melindungi foto item FAILED.
          await DatabaseService.markAsFailed(item.id, 'Retry budget exceeded');
          TelemetryService.trackSyncResult({
            endpoint: item.url,
            outcome: 'permanent_failed',
            payload: { reason: 'retry_budget_exceeded', retryCount: globalRetry },
          });
          presentErrorMessage(
            'Data offline gagal disinkron setelah beberapa percobaan. Silakan submit ulang.',
            'Sinkronisasi Gagal',
          );
          return;
      }

      try {
          baseBody = parseQueuePayload<Record<string, unknown>>(item.body, item.id, 'body');
          baseMeta = parseQueuePayload<SyncQueueMeta>(item.meta, item.id, 'meta');
      } catch (error) {
          logger.error('[SyncService] Invalid queued payload, removing item:', error);
          await DatabaseService.removeFromQueue(item.id);
          presentErrorMessage(
              'Ada data offline yang tidak bisa diproses dan dibatalkan.',
              'Data Antrean Rusak'
          );
          return;
      }

      while (attempt < MAX_RETRIES) {
          let requestId: string | undefined;
          const attendanceReplay = item.url.includes('/attendance/');

          try {
            logger.sync(`Processing item ${item.id} (Attempt ${attempt + 1}/${MAX_RETRIES}): ${item.method} ${item.url}`);

            const body = cloneQueuePayload(baseBody);
            const meta = cloneQueuePayload(baseMeta);
            requestId = typeof body.requestId === 'string' ? body.requestId : (typeof meta.requestId === 'string' ? meta.requestId : undefined);
            let isUrlFotoBaru = false;

            // 1. Legacy: Support Photo Uploads (Parallel if multiple)
            if (meta.photos && Array.isArray(meta.photos) && meta.photos.length > 0) {
                const urlTersimpan = ambilUrlFotoTersimpan(meta);
                logger.sync(urlTersimpan ? `Memakai ${urlTersimpan.length} URL foto tersimpan...` : `Uploading ${meta.photos.length} photos...`);

                const uploadedUrls = urlTersimpan ?? await Promise.all(meta.photos.map(async (photoUri: string) => {
                     if (isUriLokal(photoUri)) {
                        return await uploadFile(photoUri, meta.photoType || 'general', meta.watermarkLines);
                    }

                    return photoUri;
                }));
                const hasUploadFailure = uploadedUrls.some((url) => !url);

                if (hasUploadFailure) {
                    throw new SyncQueuePhotoUploadError('Gagal upload foto antrean attendance');
                }

                const validUploadedUrls = uploadedUrls.filter((url): url is string => typeof url === 'string' && url.length > 0);

                if (meta.targetField) {
                     if (meta.singleFile) {
                         body[meta.targetField] = validUploadedUrls[0] || null;
                     } else {
                         body[meta.targetField] = validUploadedUrls;
                     }
                }

                // Cache hasil upload ke baseMeta (lalu ke antrean, di bawah) agar
                // attempt dan batch berikutnya tidak meng-upload ulang: URL baru
                // mengubah hash badan sehingga server idempoten membalas 409
                // KEY_REUSED (review akhir I2), selain orphan file + bandwidth.
                if (!urlTersimpan) {
                    baseMeta.urlFotoTerunggah = validUploadedUrls;
                    isUrlFotoBaru = meta.photos.some(isUriLokal);
                }
            }

            // New: Support photoMap for specific fields mapping (Parallelized)
            if (meta.photoMap && typeof meta.photoMap === 'object') {
                logger.sync(`Processing photoMap for item ${item.id}...`);

                const petaTersimpan = meta.urlPetaFotoTerunggah ?? {};
                const photoEntries = Object.entries(meta.photoMap);
                const uploadPromises = photoEntries.map(async ([field, uri]) => {
                    const urlTersimpan = petaTersimpan[field];
                    if (typeof urlTersimpan === 'string' && urlTersimpan.length > 0) {
                        return { field, url: urlTersimpan, isBaru: false };
                    }
                    if (typeof uri === 'string' && isUriLokal(uri)) {
                        const url = await uploadFile(uri, meta.photoType || 'general', meta.watermarkLines);
                        if (!url) {
                          throw new SyncQueuePhotoUploadError(`Gagal upload foto untuk field ${field}`);
                        }
                        return { field, url, isBaru: true };
                    }
                    return null;
                });

                const results = await Promise.all(uploadPromises);

                results.forEach(result => {
                    if (!result) return;
                    body[result.field] = result.url;
                    // Cache server URL (terpisah dari photoMap lokal) agar attempt
                    // dan batch berikutnya skip upload ulang.
                    if (result.isBaru) {
                        baseMeta.urlPetaFotoTerunggah = { ...baseMeta.urlPetaFotoTerunggah, [result.field]: result.url };
                        isUrlFotoBaru = true;
                    }
                });
            }

            if (isUrlFotoBaru) {
                await simpanUrlFotoKeAntrean(item.id, baseMeta);
            }

            const headers: Record<string, string> = {
              'Content-Type': 'application/json',
            };

            if (token) {
              headers['Authorization'] = `Bearer ${token}`;
            }

            const idempotencyHeaders = buildAttendanceIdempotencyHeaders(requestId);
            if (idempotencyHeaders) {
              headers['Idempotency-Key'] = idempotencyHeaders['Idempotency-Key'];
            }

            const response = await api.request({
              method: item.method,
              url: item.url,
              data: body,
              headers: headers,
              timeout: SYNC_REQUEST_TIMEOUT_MS,
              skipGlobalAuthHandler: true,
              skipRetry: true,
            });

            if (response.status >= 200 && response.status < 300) {
              logger.sync(`Item ${item.id} synced successfully.`);
              await cleanupOfflinePhotos(collectPersistedPhotoUris(item));
              await DatabaseService.removeFromQueue(item.id);
              if (attendanceReplay) {
                AttendanceTelemetryService.track('attendance_replay_succeeded', {
                  requestId,
                  endpoint: item.url,
                  networkState: 'online',
                });
              }
              // Generic telemetry untuk semua endpoint (work-order, inventory,
              // leave, dll). Tanpa ini, observability hanya attendance —
              // modul lain blind spot saat replay.
              TelemetryService.trackSyncResult({
                endpoint: item.url,
                outcome: 'succeeded',
                payload: { requestId, retryCount: attempt },
              });
              // Reconciliation event — beri tahu hooks yang listen agar
              // refetch data yang relevan. Tanpa event ini, UI tetap stale
              // sampai user pull-to-refresh / app focus, walau data sudah
              // sukses sync di background.
              DeviceEventEmitter.emit('sync:succeeded', {
                endpoint: item.url,
                method: item.method,
                requestId,
              });
              return; // Success, exit function
            } else {
                logger.warn(`[SyncService] Item ${item.id} failed with status ${response.status}`);
                throw new Error(`Status ${response.status}`);
            }

          } catch (error) {
            if (error instanceof SyncQueuePhotoUploadError) {
              logger.warn(`[SyncService] Photo upload failed for item ${item.id}. Marking for later.`);
              await DatabaseService.markAsRetry(item.id);
              if (attendanceReplay) {
                AttendanceTelemetryService.track('attendance_replay_failed', {
                  requestId,
                  endpoint: item.url,
                  reason: error.message,
                });
              }
              return;
            }

            const backendMessage = isAxiosError(error) ? extractApiErrorMessage(error.response?.data) : undefined;
            const errorMessage = backendMessage || (error instanceof Error ? error.message : 'Unknown error');

            // Smart Error Handling
            if (isAxiosError(error) && error.response) {
                const status = error.response.status;

                // 401 mid-batch — token expired antara fetch token di awal
                // processQueue dan request item ini. Tanpa explicit refresh,
                // item akan retry dengan token mati → loop sampai user
                // re-login. Refresh sekali; token closure di-update agar
                // next attempt pakai value baru.
                if (status === 401) {
                    logger.warn(`[SyncService] Item ${item.id} got 401, attempting token refresh...`);
                    const refreshed = await RefreshTokenService.refreshAccessToken().catch(() => null);
                    if (refreshed) {
                        token = refreshed; // override token closure
                        logger.sync(`[SyncService] Token refreshed, will retry item ${item.id}`);
                        attempt++;
                        if (attempt < MAX_RETRIES) {
                            const delay = Math.pow(2, attempt) * 1000;
                            await new Promise(resolve => setTimeout(resolve, delay));
                            continue;
                        }
                    }
                    // Refresh gagal → mark retry agar batch berikutnya
                    // coba lagi (atau hit retry budget cap di awal
                    // processQueueItem).
                    logger.warn(`[SyncService] Token refresh failed for item ${item.id}, marking retry`);
                    await DatabaseService.markAsRetry(item.id);
                    return;
                }

                // 409 IDEMPOTENCY_IN_PROGRESS: server masih memegang kunci yang
                // sama (permintaan pertama belum selesai, atau kunci yatim
                // menunggu TTL pendek di server). Bukan kegagalan permanen —
                // item tetap antre dan dikirim ulang dengan Idempotency-Key sama.
                // Tidak memakan jatah ulang global (review akhir I3): item di
                // ambang jatah akan jadi FAILED "submit ulang" padahal permintaan
                // pertama hampir pasti commit. Drain dijadwalkan ulang sesuai
                // Retry-After server; loop dibatasi TTL in-progress server.
                if (isGalatIdempotensiSedangDiproses(error)) {
                    logger.sync(`Item ${item.id} masih diproses server (409 in-progress). Retry tanpa memakan jatah.`);
                    await DatabaseService.tandaiUlangTanpaBiaya(item.id);
                    SyncService.scheduleQueueDrain(JEDA_ULANG_SEDANG_DIPROSES_MS);
                    return;
                }

                if (item.method === 'POST' && requestId !== undefined && isGalatIdempotensiKunciDipakaiUlang(error)) {
                    await tuntaskanItemSudahTercatat(item, requestId);
                    return;
                }

                if (isPermanentSyncFailure(status)) {
                     const shouldReconcileAttendanceReplay =
                       attendanceReplay && ATTENDANCE_RECONCILIATION_STATUSES.has(status);

                     if (shouldReconcileAttendanceReplay) {
                       const currentRetryCount = item.retryCount || 0;
                       const nextRetryCount = currentRetryCount + 1;

                       if (nextRetryCount >= ATTENDANCE_RECONCILIATION_RETRY_CAP) {
                         logger.sync(`Attendance replay reconciliation cap reached (${status}). Marking item ${item.id} failed.`);
                         AttendanceTelemetryService.track('attendance_replay_failed', {
                           requestId,
                           endpoint: item.url,
                           reason: `Reconciliation cap reached ${status}`,
                           retryCount: nextRetryCount,
                         });
                         await DatabaseService.markAsFailed(item.id, `Attendance reconciliation exhausted after ${nextRetryCount} attempts (${status})`);
                         return;
                       }

                       logger.sync(`Attendance replay requires reconciliation (${status}). Marking item ${item.id} for retry.`);
                       AttendanceTelemetryService.track('attendance_replay_failed', {
                         requestId,
                         endpoint: item.url,
                         reason: `Reconciliation required ${status}`,
                       });
                       await DatabaseService.markAsRetry(item.id);
                       return;
                     }

                     logger.sync(`Client Error (${status}). Removing item ${item.id}.`);

                     if (attendanceReplay) {
                        if (status === 409) {
                          AttendanceTelemetryService.track('attendance_duplicate_blocked', {
                            requestId,
                            endpoint: item.url,
                            reason: 'Conflict/duplicate detected during replay',
                          });
                        } else {
                          AttendanceTelemetryService.track('attendance_replay_failed', {
                            requestId,
                            endpoint: item.url,
                            reason: `Client error ${status}`,
                          });
                        }
                     }

                     await cleanupOfflinePhotos(collectPersistedPhotoUris(item));
                     await DatabaseService.removeFromQueue(item.id);

                     // Notify User
                     const urlPart = item.url.split('/').pop() || 'Unknown';
                     const errorMsg = backendMessage || errorMessage || 'Data tidak valid';

                     let title = 'Gagal Sinkronisasi Data';
                     if (urlPart.includes('masuk')) title = 'Gagal Sync Barang Masuk';
                     else if (urlPart.includes('keluar')) title = 'Gagal Sync Barang Keluar';
                     else if (urlPart.includes('check-in')) title = 'Gagal Sync Absensi';

                     presentErrorMessage(
                         `Data dibatalkan: ${errorMsg}`,
                         title
                     );
                     return; // Permanent failure, exit
                }
            }

            // For other errors (network, 5xx), retry
            attempt++;
            logger.error(`[SyncService] Attempt ${attempt} failed for item ${item.id}:`, errorMessage);

            if (attempt < MAX_RETRIES) {
                // Exponential Backoff: 1s, 2s, 4s...
                const delay = Math.pow(2, attempt) * 1000;
                logger.sync(`Retrying item ${item.id} in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                // Max retries reached, mark as RETRY in DB for next batch
                logger.warn(`[SyncService] Max retries reached for item ${item.id}. Marking for later.`);
                await DatabaseService.markAsRetry(item.id);
                if (attendanceReplay) {
                  AttendanceTelemetryService.track('attendance_replay_failed', {
                    requestId,
                    endpoint: item.url,
                    reason: 'Max retries reached',
                    retryCount: MAX_RETRIES,
                  });
                }
            }
          }
      }
  }
};
