import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

/**
 * Test integrasi review akhir I2 & I3: `SyncService` asli + `DatabaseService`
 * asli (di atas mock `expo-sqlite`), dengan server idempoten tiruan yang
 * meniru `withIdempotency` backend (kunci baru dicatat; kunci sama + badan
 * sama = replay; kunci sama + badan beda = 409 `IDEMPOTENCY_KEY_REUSED`).
 * Yang dijaga: satu kegiatan di antrean = satu kegiatan di server, dan sales
 * tidak pernah diberi tahu "dibatalkan" untuk data yang sudah tercatat.
 */

type KonfigurasiPermintaan = { data: Record<string, unknown>; headers: Record<string, string> };

jest.mock('@/utils/logger', () => ({
  logger: { sync: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), db: jest.fn() },
}));
jest.mock('@/utils/storage', () => ({
  Storage: { getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() },
}));
jest.mock('expo-secure-store', () => ({ __esModule: true, getItemAsync: async () => 'token-uji' }));
jest.mock('@react-native-community/netinfo', () => ({ fetch: jest.fn(), addEventListener: jest.fn() }));
const mockRequest = jest.fn<(config: KonfigurasiPermintaan) => Promise<{ status: number; data: unknown }>>();
jest.mock('@/services/api', () => ({
  __esModule: true,
  default: { request: (c: KonfigurasiPermintaan) => mockRequest(c) },
}));
let mockNomorUnggahan = 0;
const mockUploadFile = jest.fn(async () => {
  // Server unggah memberi URL baru untuk setiap unggahan, seperti produksi.
  mockNomorUnggahan += 1;
  return `https://cdn.test/unggahan-${mockNomorUnggahan}.jpg`;
});
jest.mock('@/services/UploadService', () => ({ uploadService: { uploadFile: () => mockUploadFile() } }));
const mockCleanup = jest.fn<(uris: readonly string[]) => Promise<void>>();
jest.mock('@/utils/persistPhoto', () => ({ cleanupOfflinePhotos: (uris: readonly string[]) => mockCleanup(uris) }));
const mockPresentError = jest.fn();
const mockPresentInfo = jest.fn();
jest.mock('@/utils/errorPresenter', () => ({
  presentErrorMessage: (...a: unknown[]) => mockPresentError(...a),
  presentInfoMessage: (...a: unknown[]) => mockPresentInfo(...a),
}));
jest.mock('@/services/TelemetryService', () => ({ TelemetryService: { trackSyncResult: jest.fn() } }));

const { DatabaseService } = require('@/services/DatabaseService') as typeof import('@/services/DatabaseService');
const { SyncService } = require('@/services/SyncService') as typeof import('@/services/SyncService');
const { DeviceEventEmitter } = require('react-native') as typeof import('react-native');

const ENDPOINT = '/api/presurvei/kegiatan';
const REQUEST_ID = 'presurvei-uuid-lintas-batch';
const FOTO_LOKAL = 'file:///dokumen/offline-photos/1_a.jpg';
const BADAN = Object.freeze({ jenis: 'KUNJUNGAN', hasil: 'TERTARIK', requestId: REQUEST_ID });
const META_ANTREAN = Object.freeze({
  photos: [FOTO_LOKAL],
  targetField: 'fotoUrls',
  photoType: 'presurvei',
  requestId: REQUEST_ID,
});

const galatJaringan = () => Object.assign(new Error('Network Error'), { isAxiosError: true });
const galat409 = (code: string) => ({
  isAxiosError: true,
  response: { status: 409, data: { success: false, error: 'Idempotency-Key sudah dipakai untuk payload berbeda', code } },
});

/**
 * Server idempoten tiruan. `jumlahPutus` = berapa permintaan pertama yang
 * balasannya hilang; yang pertama tetap dicatat server (commit), sisanya
 * tidak sampai.
 */
function pasangServer(jumlahPutus = 0) {
  const server = { kunciTercatat: new Map<string, string>(), jumlahKegiatan: 0, jumlahPanggilan: 0 };
  mockRequest.mockImplementation(async ({ data, headers }) => {
    server.jumlahPanggilan += 1;
    const isPutus = server.jumlahPanggilan <= jumlahPutus;
    if (isPutus && server.jumlahPanggilan > 1) throw galatJaringan();
    const kunci = headers['Idempotency-Key'];
    const sidik = JSON.stringify(data);
    const lama = server.kunciTercatat.get(kunci);
    if (lama === undefined) {
      server.kunciTercatat.set(kunci, sidik);
      server.jumlahKegiatan += 1;
      if (isPutus) throw galatJaringan();
      return { status: 201, data: { success: true } };
    }
    if (lama === sidik) return { status: 201, data: { success: true } };
    throw galat409('IDEMPOTENCY_KEY_REUSED');
  });
  return server;
}

/** Satu batch drain; jeda backoff dilewati dengan fake timers. */
async function jalankanBatch() {
  jest.useFakeTimers();
  const proses = SyncService.processQueue();
  await jest.runAllTimersAsync();
  await proses;
  jest.useRealTimers();
}

const semuaItem = () => DatabaseService.getAllQueueItems();

let emit: jest.SpiedFunction<typeof DeviceEventEmitter.emit>;
let jadwalDrain: jest.SpiedFunction<typeof SyncService.scheduleQueueDrain>;

beforeEach(async () => {
  jest.clearAllMocks();
  require('../../__mocks__/expo-sqlite')._resetDb();
  mockNomorUnggahan = 0;
  mockCleanup.mockResolvedValue(undefined);
  emit = jest.spyOn(DeviceEventEmitter, 'emit').mockImplementation(() => undefined);
  // Drain tertunda (I3/I4) tidak dijalankan di sini; batch dipicu manual.
  jadwalDrain = jest.spyOn(SyncService, 'scheduleQueueDrain').mockImplementation(() => undefined);
  SyncService.isProcessing = false;
  await DatabaseService.initDatabase();
});

afterEach(() => {
  jest.useRealTimers();
  emit.mockRestore();
  jadwalDrain.mockRestore();
});

describe('I2: replay lintas batch memakai URL foto yang tersimpan di item antrean', () => {
  it('batch 1 putus setelah server commit; batch 2 tidak mengunggah ulang dan server men-dedupe', async () => {
    const server = pasangServer(3);
    await DatabaseService.addToQueue(ENDPOINT, 'POST', BADAN, META_ANTREAN);

    await jalankanBatch();

    const [setelahBatch1] = await semuaItem();
    expect(setelahBatch1).toEqual(expect.objectContaining({ status: 'RETRY', retryCount: 1 }));
    expect(JSON.parse(setelahBatch1.meta)).toEqual({
      ...META_ANTREAN,
      urlFotoTerunggah: ['https://cdn.test/unggahan-1.jpg'],
    });
    expect(mockCleanup).not.toHaveBeenCalled();

    await jalankanBatch();

    expect(mockUploadFile).toHaveBeenCalledTimes(1);
    expect(mockRequest).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: { ...BADAN, fotoUrls: ['https://cdn.test/unggahan-1.jpg'] },
        headers: expect.objectContaining({ 'Idempotency-Key': REQUEST_ID }),
      }),
    );
    expect(server.jumlahKegiatan).toBe(1);
    expect(await semuaItem()).toEqual([]);
    expect(mockCleanup).toHaveBeenCalledWith([FOTO_LOKAL]);
    expect(mockPresentError).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith('sync:succeeded', { endpoint: ENDPOINT, method: 'POST', requestId: REQUEST_ID });
  });

  it('photoMap: URL tersimpan dipakai di attempt dan batch berikutnya (medan tetap terisi)', async () => {
    pasangServer(3);
    const PETA_LOKAL = 'file:///dokumen/offline-photos/3_bukti.jpg';
    await DatabaseService.addToQueue('/api/mobile/leaves', 'POST', { alasan: 'Sakit' }, { photoMap: { buktiUrl: PETA_LOKAL } });

    await jalankanBatch();
    const [setelahBatch1] = await semuaItem();
    await jalankanBatch();

    expect(JSON.parse(setelahBatch1.meta)).toEqual({
      photoMap: { buktiUrl: PETA_LOKAL },
      urlPetaFotoTerunggah: { buktiUrl: 'https://cdn.test/unggahan-1.jpg' },
    });
    expect(mockUploadFile).toHaveBeenCalledTimes(1);
    for (const [konfigurasi] of mockRequest.mock.calls) {
      expect(konfigurasi.data).toEqual({ alasan: 'Sakit', buktiUrl: 'https://cdn.test/unggahan-1.jpg' });
    }
    expect(mockRequest).toHaveBeenCalledTimes(4);
    expect(await semuaItem()).toEqual([]);
    expect(mockCleanup).toHaveBeenCalledWith([PETA_LOKAL]);
  });

  it('jaring pengaman: 409 KEY_REUSED saat replay = sudah tercatat, bukan "Data dibatalkan"', async () => {
    const server = pasangServer();
    // Upaya sebelumnya (mis. dari versi app lama tanpa URL tersimpan) sudah
    // tercatat dengan URL foto lain.
    server.kunciTercatat.set(REQUEST_ID, JSON.stringify({ ...BADAN, fotoUrls: ['https://cdn.test/lama.jpg'] }));
    await DatabaseService.addToQueue(ENDPOINT, 'POST', BADAN, META_ANTREAN);

    await jalankanBatch();

    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(await semuaItem()).toEqual([]);
    expect(mockPresentError).not.toHaveBeenCalled();
    expect(mockPresentInfo).toHaveBeenCalledWith('Data offline sudah tercatat sebelumnya.');
    expect(mockCleanup).toHaveBeenCalledWith([FOTO_LOKAL]);
    expect(emit).toHaveBeenCalledWith('sync:succeeded', { endpoint: ENDPOINT, method: 'POST', requestId: REQUEST_ID });
  });
});

describe('Kompatibilitas mundur: item antrean lama tanpa medan URL foto baru', () => {
  it('meta lama berisi foto lokal: diunggah lalu terkirim seperti sebelumnya', async () => {
    const server = pasangServer();
    await DatabaseService.addToQueue(ENDPOINT, 'POST', BADAN, META_ANTREAN);

    await jalankanBatch();

    expect(mockUploadFile).toHaveBeenCalledTimes(1);
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ data: { ...BADAN, fotoUrls: ['https://cdn.test/unggahan-1.jpg'] } }),
    );
    expect(server.jumlahKegiatan).toBe(1);
    expect(await semuaItem()).toEqual([]);
  });

  it('meta lama berisi URL (jalur online yang timeout): terkirim tanpa unggah', async () => {
    const server = pasangServer();
    const urlLama = 'https://cdn.test/dari-jalur-online.jpg';
    await DatabaseService.addToQueue(ENDPOINT, 'POST', BADAN, { ...META_ANTREAN, photos: [urlLama] });

    await jalankanBatch();

    expect(mockUploadFile).not.toHaveBeenCalled();
    expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({ data: { ...BADAN, fotoUrls: [urlLama] } }));
    expect(server.jumlahKegiatan).toBe(1);
    expect(await semuaItem()).toEqual([]);
  });

  it('meta lama dengan photoMap (izin/canvasing): diunggah lalu terkirim seperti sebelumnya', async () => {
    pasangServer();
    const PETA_LOKAL = 'file:///dokumen/offline-photos/2_bukti.jpg';
    await DatabaseService.addToQueue('/api/mobile/leaves', 'POST', { alasan: 'Sakit' }, { photoMap: { buktiUrl: PETA_LOKAL } });

    await jalankanBatch();

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ data: { alasan: 'Sakit', buktiUrl: 'https://cdn.test/unggahan-1.jpg' } }),
    );
    expect(await semuaItem()).toEqual([]);
    expect(mockCleanup).toHaveBeenCalledWith([PETA_LOKAL]);
  });
});

describe('I3: 409 IDEMPOTENCY_IN_PROGRESS tidak memakan jatah ulang', () => {
  it('item di ambang jatah (retryCount 9) tetap antre di batch berikutnya dan drain dijadwalkan 30 detik', async () => {
    mockRequest.mockRejectedValue(galat409('IDEMPOTENCY_IN_PROGRESS'));
    await DatabaseService.addToQueue(ENDPOINT, 'POST', { jenis: 'TELEPON', requestId: REQUEST_ID }, { requestId: REQUEST_ID });
    const [item] = await semuaItem();
    for (let i = 0; i < 9; i += 1) await DatabaseService.markAsRetry(item.id);

    await jalankanBatch();
    await jalankanBatch();

    const [setelah] = await semuaItem();
    expect(setelah).toEqual(expect.objectContaining({ status: 'RETRY', retryCount: 9 }));
    expect(mockRequest).toHaveBeenCalledTimes(2);
    expect(jadwalDrain).toHaveBeenCalledWith(30_000);
    expect(mockPresentError).not.toHaveBeenCalled();
  });
});
