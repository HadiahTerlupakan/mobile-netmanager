import React, { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { presentAppError, presentInfoMessage, presentSuccessMessage } from '@/utils/errorPresenter';

jest.mock('@/utils/errorPresenter', () => ({
  presentAppError: jest.fn(),
  presentError: jest.fn(),
  presentInfoMessage: jest.fn(),
  presentSuccessMessage: jest.fn(),
}));

const mockRequest = jest.fn<
  (config: unknown) => Promise<{ data: unknown }>
>();
jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    request: mockRequest,
  },
}));

const mockIsOnline = jest.fn<() => Promise<boolean>>();
jest.mock('@/services/SyncService', () => ({
  SyncService: {
    isOnline: mockIsOnline,
  },
}));

const mockAddToQueue = jest.fn<() => Promise<void>>();
const mockGetPendingQueue = jest.fn<() => Promise<unknown[]>>();
jest.mock('@/services/DatabaseService', () => ({
  DatabaseService: {
    addToQueue: mockAddToQueue,
    getPendingQueue: mockGetPendingQueue,
  },
}));

jest.mock('@/services/AttendanceTelemetryService', () => ({
  AttendanceTelemetryService: {
    track: jest.fn(),
  },
}));

type OpsiUnggah = { maxRetries?: number };
const mockUploadFile = jest.fn<(uri: string, tipe: string, opsi?: OpsiUnggah) => Promise<string>>();
jest.mock('@/services/UploadService', () => ({
  uploadService: {
    // Meneruskan jumlah argumen apa adanya: jalur photoMap memanggil dengan dua
    // argumen, jalur meta.photos dengan tiga (batas ulang).
    uploadFile: (...args: [string, string, OpsiUnggah?]) => mockUploadFile(...args),
  },
  UploadType: {},
  NAMA_GALAT_UNGGAH_HABIS_WAKTU: 'UploadTimeoutError',
  AWALAN_GALAT_STATUS_UNGGAH: 'Upload failed with status',
  PESAN_RESPONS_UNGGAH_TIDAK_SAH: 'Invalid response from upload server',
}));

const mockPersist = jest.fn<(uri: string) => Promise<string>>();
const mockIsBerkasAda = jest.fn<(uri: string) => Promise<boolean>>();
jest.mock('@/utils/persistPhoto', () => ({
  persistPhotoForOffline: (uri: string) => mockPersist(uri),
  isBerkasLokalAda: (uri: string) => mockIsBerkasAda(uri),
}));

jest.mock('@/utils/attendanceIdempotency', () => ({
  buildAttendanceIdempotencyHeaders: jest.fn(() => ({})),
  ensureAttendanceRequestId: jest.fn((payload) => payload),
  isAttendanceEndpoint: jest.fn(() => false),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: {
    Balanced: 'balanced',
  },
}));

const mockAlert = jest.fn();
jest.mock('react-native', () => ({
  Alert: {
    alert: mockAlert,
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

type HttpMethodUji = 'POST' | 'PATCH';

describe('useApiMutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // mockReset juga membuang antrean mockResolvedValueOnce yang tak terpakai,
    // supaya satu test tidak mewariskan status online ke test berikutnya.
    mockIsOnline.mockReset();
    mockIsOnline.mockResolvedValue(false as never);
    mockAddToQueue.mockResolvedValue(undefined as never);
    mockGetPendingQueue.mockResolvedValue([] as never);
    mockRequest.mockReset();
    mockUploadFile.mockReset();
    mockUploadFile.mockImplementation(async (uri) => `https://cdn.test/${uri.split('/').pop()}`);
    mockPersist.mockImplementation(async (uri) =>
      uri.replace('file:///cache/', 'file:///dokumen/offline-photos/'),
    );
    mockIsBerkasAda.mockReset();
    mockIsBerkasAda.mockResolvedValue(true);
    // Test antrean absensi mengganti implementasi ini; kembalikan agar urutan
    // test tidak memengaruhi hasil.
    const attendanceIdempotency = require('@/utils/attendanceIdempotency');
    attendanceIdempotency.isAttendanceEndpoint.mockReturnValue(false);
    attendanceIdempotency.ensureAttendanceRequestId.mockImplementation(
      (payload: Record<string, unknown>) => payload,
    );
    attendanceIdempotency.buildAttendanceIdempotencyHeaders.mockReturnValue({});
    const { Alert } = require('react-native');
    Alert.alert = mockAlert;
  });

  const createWrapper = (queryClient: QueryClient) => {
    return function Wrapper({ children }: PropsWithChildren) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };
  };

  it('returns an explicit queued result and skips cache invalidation when request is queued offline', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
        mutations: { retry: false, gcTime: Infinity },
      },
    });
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { useApiMutation, isOfflineMutationQueuedResult } = require('@/hooks/queries/useApiMutation');

    const { result, unmount } = renderHook(
      () =>
        useApiMutation({
          endpoint: '/api/mobile/work-order',
          method: 'POST',
          invalidateKeys: [['workOrders']],
          successMessage: 'Saved',
        }),
      { wrapper: createWrapper(queryClient) }
    );

    let mutationResult: unknown;
    await act(async () => {
      mutationResult = await result.current.mutateAsync({ title: 'WO-1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(isOfflineMutationQueuedResult(mutationResult)).toBe(true);
    expect(mutationResult).toEqual(
      expect.objectContaining({
        __offline_queued__: true,
        kind: 'offline-queued',
        endpoint: '/api/mobile/work-order',
        method: 'POST',
      })
    );
    expect(mockAddToQueue).toHaveBeenCalledWith(
      '/api/mobile/work-order',
      'POST',
      expect.objectContaining({ title: 'WO-1' }),
      expect.any(Object)
    );
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
    expect(presentInfoMessage).toHaveBeenCalledWith(
      expect.stringContaining('disimpan'),
      'Offline',
    );

    unmount();
    queryClient.clear();
  });

  it('uses a dynamic endpoint and payload builder when mutation needs canonical routing', async () => {
    mockIsOnline.mockResolvedValue(true as never);
    mockRequest.mockResolvedValue({ data: { data: { id: 'wo-123' } } } as never);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
        mutations: { retry: false, gcTime: Infinity },
      },
    });
    const { useApiMutation } = require('@/hooks/queries/useApiMutation');

    const { result, unmount } = renderHook(
      () =>
        useApiMutation({
          endpoint: ({ id }: { id: string }) => `/api/mobile/work-orders/${id}/update`,
          method: 'POST',
          buildPayload: (variables: { id: string; notes?: string }) => ({
            ...variables,
            action: 'COMPLETE',
          }),
        }),
      { wrapper: createWrapper(queryClient) }
    );

    await act(async () => {
      await result.current.mutateAsync({ id: 'wo-123', notes: 'done' });
    });

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/mobile/work-orders/wo-123/update',
        method: 'POST',
        data: expect.objectContaining({
          id: 'wo-123',
          notes: 'done',
          action: 'COMPLETE',
        }),
      })
    );

    unmount();
    queryClient.clear();
  });

  it('queues attendance mutations offline and preserves requestId for replay', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
        mutations: { retry: false, gcTime: Infinity },
      },
    });
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { useApiMutation, isOfflineMutationQueuedResult } = require('@/hooks/queries/useApiMutation');
    const attendanceIdempotency = require('@/utils/attendanceIdempotency');
    attendanceIdempotency.isAttendanceEndpoint.mockReturnValue(true);
    attendanceIdempotency.ensureAttendanceRequestId.mockImplementation((payload: Record<string, unknown>) => ({
      ...payload,
      requestId: 'att-queued-1',
    }));
    attendanceIdempotency.buildAttendanceIdempotencyHeaders.mockReturnValue({
      'Idempotency-Key': 'att-queued-1',
    });
    mockIsOnline.mockResolvedValue(false as never);

    const { result, unmount } = renderHook(
      () =>
        useApiMutation({
          endpoint: '/api/mobile/attendance/check-in',
          method: 'POST',
          invalidateKeys: [['attendanceStatus']],
          successMessage: 'Saved',
        }),
      { wrapper: createWrapper(queryClient) }
    );

    let mutationResult: unknown;
    await act(async () => {
      mutationResult = await result.current.mutateAsync({ location: 'HQ' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(isOfflineMutationQueuedResult(mutationResult)).toBe(true);
    expect(mutationResult).toEqual(
      expect.objectContaining({
        __offline_queued__: true,
        kind: 'offline-queued',
        endpoint: '/api/mobile/attendance/check-in',
        method: 'POST',
      })
    );
    expect(mockAddToQueue).toHaveBeenCalledWith(
      '/api/mobile/attendance/check-in',
      'POST',
      expect.objectContaining({
        location: 'HQ',
        requestId: 'att-queued-1',
      }),
      expect.objectContaining({
        requestId: 'att-queued-1',
      })
    );
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
    expect(presentInfoMessage).toHaveBeenCalledWith(
      expect.stringContaining('disimpan'),
      'Offline',
    );
    expect(presentSuccessMessage).not.toHaveBeenCalled();

    unmount();
    queryClient.clear();
  });

  const buatClient = () =>
    new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
        mutations: { retry: false, gcTime: Infinity },
      },
    });

  interface OpsiRender {
    endpoint: string;
    buildPayload?: (variables: Record<string, unknown>) => Record<string, unknown>;
  }

  const renderMutasi = (client: QueryClient, { endpoint, buildPayload }: OpsiRender) => {
    const { useApiMutation } = require('@/hooks/queries/useApiMutation');
    return renderHook(() => useApiMutation({ endpoint, method: 'POST', buildPayload }), {
      wrapper: createWrapper(client),
    });
  };

  const TANPA_ULANG = { maxRetries: 0 };

  describe('foto meta (meta.photos + targetField)', () => {
    const ENDPOINT_KEGIATAN = '/api/presurvei/kegiatan';
    const tanpaMeta = ({ meta: _meta, ...isi }: Record<string, unknown>) => isi;
    const META_KEGIATAN = Object.freeze({
      photos: Object.freeze(['file:///cache/a.jpg', 'file:///cache/b.jpg']),
      targetField: 'fotoUrls',
      photoType: 'presurvei',
    });
    const META_ANTREAN_KEGIATAN = {
      photos: ['file:///dokumen/offline-photos/a.jpg', 'file:///dokumen/offline-photos/b.jpg'],
      targetField: 'fotoUrls',
      photoType: 'presurvei',
    };

    const kirimKegiatan = async (meta: unknown = META_KEGIATAN) => {
      const client = buatClient();
      const { result, unmount } = renderMutasi(client, {
        endpoint: ENDPOINT_KEGIATAN,
        buildPayload: tanpaMeta,
      });
      let hasil: unknown;
      let galat: unknown;
      await act(async () => {
        try {
          hasil = await result.current.mutateAsync({ jenis: 'KUNJUNGAN', meta });
        } catch (error) {
          galat = error;
        }
      });
      unmount();
      client.clear();
      return { hasil, galat };
    };

    it('mengunggah meta.photos di jalur online tanpa ulang lalu mengisi targetField sesuai urutan', async () => {
      mockIsOnline.mockResolvedValue(true as never);
      mockRequest.mockResolvedValue({ data: { success: true } } as never);

      await kirimKegiatan();

      expect(mockUploadFile.mock.calls).toEqual([
        ['file:///cache/a.jpg', 'presurvei', TANPA_ULANG],
        ['file:///cache/b.jpg', 'presurvei', TANPA_ULANG],
      ]);
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { jenis: 'KUNJUNGAN', fotoUrls: ['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg'] },
        }),
      );
      expect(mockAddToQueue).not.toHaveBeenCalled();
    });

    it('tidak mengunggah ulang foto yang sudah berupa URL', async () => {
      mockIsOnline.mockResolvedValue(true as never);
      mockRequest.mockResolvedValue({ data: { success: true } } as never);

      await kirimKegiatan({ ...META_KEGIATAN, photos: ['https://cdn.test/lama.jpg', 'file:///cache/b.jpg'] });

      expect(mockUploadFile.mock.calls).toEqual([['file:///cache/b.jpg', 'presurvei', TANPA_ULANG]]);
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { jenis: 'KUNJUNGAN', fotoUrls: ['https://cdn.test/lama.jpg', 'https://cdn.test/b.jpg'] },
        }),
      );
    });

    it('mengisi URL tunggal bila singleFile', async () => {
      mockIsOnline.mockResolvedValue(true as never);
      mockRequest.mockResolvedValue({ data: { success: true } } as never);

      await kirimKegiatan({ photos: ['file:///cache/ktp.jpg'], targetField: 'fotoKtp', singleFile: true });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ data: { jenis: 'KUNJUNGAN', fotoKtp: 'https://cdn.test/ktp.jpg' } }),
      );
    });

    it('menyimpan salinan tetap meta.photos saat masuk antrean offline', async () => {
      mockIsOnline.mockResolvedValue(false as never);

      const { hasil } = await kirimKegiatan();

      const { isOfflineMutationQueuedResult } = require('@/hooks/queries/useApiMutation');
      expect(isOfflineMutationQueuedResult(hasil)).toBe(true);
      expect(mockUploadFile).not.toHaveBeenCalled();
      expect(mockAddToQueue).toHaveBeenCalledWith(
        ENDPOINT_KEGIATAN,
        'POST',
        { jenis: 'KUNJUNGAN' },
        META_ANTREAN_KEGIATAN,
      );
      expect(META_KEGIATAN.photos).toEqual(['file:///cache/a.jpg', 'file:///cache/b.jpg']);
    });

    it('memasukkan ke antrean bila unggah foto habis waktu, tanpa fotoUrls kosong', async () => {
      mockIsOnline.mockResolvedValue(true as never);
      const habisWaktu = new Error('Upload melebihi batas waktu 60 detik.');
      habisWaktu.name = 'UploadTimeoutError';
      mockUploadFile.mockRejectedValue(habisWaktu);

      const { hasil } = await kirimKegiatan();

      const { isOfflineMutationQueuedResult } = require('@/hooks/queries/useApiMutation');
      expect(isOfflineMutationQueuedResult(hasil)).toBe(true);
      expect(mockRequest).not.toHaveBeenCalled();
      expect(mockAddToQueue).toHaveBeenCalledWith(
        ENDPOINT_KEGIATAN,
        'POST',
        { jenis: 'KUNJUNGAN' },
        META_ANTREAN_KEGIATAN,
      );
    });

    it('memasukkan ke antrean bila galat transport terjadi saat NetInfo masih online', async () => {
      // IOException OkHttp (mis. "Unable to resolve host") tidak mengubah NetInfo.
      mockIsOnline.mockResolvedValue(true as never);
      mockUploadFile.mockRejectedValue(new Error('Network request failed'));

      await kirimKegiatan();

      expect(mockRequest).not.toHaveBeenCalled();
      expect(mockAddToQueue).toHaveBeenCalledWith(
        ENDPOINT_KEGIATAN,
        'POST',
        { jenis: 'KUNJUNGAN' },
        META_ANTREAN_KEGIATAN,
      );
    });

    it('memasukkan ke antrean bila respons server gagal lalu NetInfo sudah offline', async () => {
      mockIsOnline.mockResolvedValueOnce(true as never).mockResolvedValueOnce(false as never);
      mockUploadFile.mockRejectedValue(new Error('Upload failed with status 502: Bad Gateway'));

      await kirimKegiatan();

      expect(mockRequest).not.toHaveBeenCalled();
      expect(mockAddToQueue).toHaveBeenCalledWith(
        ENDPOINT_KEGIATAN,
        'POST',
        { jenis: 'KUNJUNGAN' },
        META_ANTREAN_KEGIATAN,
      );
    });

    it('mengantre dengan URL hasil unggah bila POST gagal jaringan setelah foto terunggah', async () => {
      // SyncService hanya mengunggah URI file:// (SyncService.ts:321), jadi URL
      // di meta.photos dipakai langsung tanpa unggah ulang.
      const { AxiosError } = require('axios');
      mockIsOnline.mockResolvedValue(true as never);
      mockRequest.mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'));

      await kirimKegiatan();

      expect(mockAddToQueue).toHaveBeenCalledWith(
        ENDPOINT_KEGIATAN,
        'POST',
        { jenis: 'KUNJUNGAN', fotoUrls: ['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg'] },
        { ...META_ANTREAN_KEGIATAN, photos: ['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg'] },
      );
      expect(mockPersist).not.toHaveBeenCalled();
    });

    it('melempar, bukan mengantre, bila berkas foto lokal sudah hilang', async () => {
      // Berkas yang hilang tidak akan pernah terkirim dari antrean; lebih baik
      // pengguna diminta memotret ulang selagi masih di lokasi.
      mockIsOnline.mockResolvedValue(true as never);
      mockUploadFile.mockRejectedValue(new Error('File does not exist'));
      mockIsBerkasAda.mockImplementation(async (uri) => uri !== 'file:///cache/b.jpg');

      const { galat } = await kirimKegiatan();

      const { PESAN_FOTO_LOKAL_HILANG } = require('@/utils/fotoMutasi');
      expect(galat).toEqual(new Error(PESAN_FOTO_LOKAL_HILANG));
      expect(mockAddToQueue).not.toHaveBeenCalled();
      expect(mockRequest).not.toHaveBeenCalled();
    });

    it('melempar kegagalan unggah biasa saat masih online', async () => {
      mockIsOnline.mockResolvedValue(true as never);
      mockUploadFile.mockRejectedValue(new Error('Upload failed with status 413'));

      const { galat } = await kirimKegiatan();

      expect(galat).toEqual(new Error('Upload failed with status 413'));
      expect(mockRequest).not.toHaveBeenCalled();
      expect(mockAddToQueue).not.toHaveBeenCalled();
    });
  });

  describe('regresi jalur foto yang sudah ada', () => {
    const kirim = async (endpoint: string, variables: Record<string, unknown>) => {
      const client = buatClient();
      const { result, unmount } = renderMutasi(client, { endpoint });
      await act(async () => {
        await result.current.mutateAsync(variables);
      });
      unmount();
      client.clear();
    };

    describe('(a) meta.photoMap — izin, canvasing, lembur, chat, work order', () => {
      const META_PETA = {
        photoMap: { fotoKtp: 'file:///cache/ktp.jpg', foto: 'https://cdn.test/lama.jpg' },
        photoType: 'marketing',
      };

      it('online: mengunggah entri lokal dengan dua argumen dan mengisi medannya', async () => {
        mockIsOnline.mockResolvedValue(true as never);
        mockRequest.mockResolvedValue({ data: { success: true } } as never);

        await kirim('/api/mobile/canvasing', { nama: 'Budi', meta: META_PETA });

        expect(mockUploadFile.mock.calls).toEqual([['file:///cache/ktp.jpg', 'marketing']]);
        expect(mockRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            data: { nama: 'Budi', meta: META_PETA, fotoKtp: 'https://cdn.test/ktp.jpg' },
          }),
        );
        expect(mockPersist).not.toHaveBeenCalled();
      });

      it('offline: tetap mengunggah sebelum cek online lalu menyalin photoMap ke antrean', async () => {
        mockIsOnline.mockResolvedValue(false as never);

        await kirim('/api/mobile/canvasing', { nama: 'Budi', meta: META_PETA });

        expect(mockUploadFile.mock.calls).toEqual([['file:///cache/ktp.jpg', 'marketing']]);
        expect(mockAddToQueue).toHaveBeenCalledWith(
          '/api/mobile/canvasing',
          'POST',
          { nama: 'Budi', meta: META_PETA, fotoKtp: 'https://cdn.test/ktp.jpg' },
          {
            photoMap: {
              fotoKtp: 'file:///dokumen/offline-photos/ktp.jpg',
              foto: 'https://cdn.test/lama.jpg',
            },
            photoType: 'marketing',
          },
        );
      });
    });

    describe('(b) meta.photos pemanggil lama', () => {
      const META_ABSEN = {
        photos: ['file:///cache/absen.jpg'],
        photoType: 'employee-attendance',
        targetField: 'photoUrl',
        singleFile: true,
      };
      const META_BARANG = { photos: ['file:///cache/b1.jpg', 'file:///cache/b2.jpg'], targetField: 'fotoBukti' };

      it('absensi offline (useAttendanceSubmission.ts:119-138): antre dengan salinan tetap foto', async () => {
        mockIsOnline.mockResolvedValue(false as never);
        const variabel = { location: 'HQ', photoUrl: 'file:///cache/absen.jpg', meta: META_ABSEN };

        await kirim('/api/mobile/attendance/check-in', variabel);

        expect(mockUploadFile).not.toHaveBeenCalled();
        expect(mockAddToQueue).toHaveBeenCalledWith(
          '/api/mobile/attendance/check-in',
          'POST',
          { location: 'HQ', photoUrl: 'file:///cache/absen.jpg', meta: META_ABSEN },
          { ...META_ABSEN, photos: ['file:///dokumen/offline-photos/absen.jpg'] },
        );
      });

      it('barang offline (barang/masuk.tsx:347-356): antre dengan salinan tetap foto', async () => {
        mockIsOnline.mockResolvedValue(false as never);

        await kirim('/api/mobile/inventory/masuk', { jumlah: 2, fotoBukti: [], meta: META_BARANG });

        expect(mockUploadFile).not.toHaveBeenCalled();
        expect(mockAddToQueue).toHaveBeenCalledWith(
          '/api/mobile/inventory/masuk',
          'POST',
          { jumlah: 2, fotoBukti: [], meta: META_BARANG },
          {
            photos: ['file:///dokumen/offline-photos/b1.jpg', 'file:///dokumen/offline-photos/b2.jpg'],
            targetField: 'fotoBukti',
          },
        );
      });

      it('barang saat layar mengira offline tetapi hook melihat online: foto diunggah, bukan [] terkirim', async () => {
        mockIsOnline.mockResolvedValue(true as never);
        mockRequest.mockResolvedValue({ data: { success: true } } as never);

        await kirim('/api/mobile/inventory/masuk', { jumlah: 2, fotoBukti: [], meta: META_BARANG });

        expect(mockUploadFile.mock.calls).toEqual([
          ['file:///cache/b1.jpg', 'general', TANPA_ULANG],
          ['file:///cache/b2.jpg', 'general', TANPA_ULANG],
        ]);
        expect(mockRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            data: {
              jumlah: 2,
              fotoBukti: ['https://cdn.test/b1.jpg', 'https://cdn.test/b2.jpg'],
              meta: META_BARANG,
            },
          }),
        );
      });

      it('work order tanpa foto (work-order-detail/[id].tsx:296-304): photoUrl null tetap', async () => {
        mockIsOnline.mockResolvedValue(true as never);
        mockRequest.mockResolvedValue({ data: { success: true } } as never);
        const meta = { photos: [], targetField: 'photoUrl', singleFile: true, photoType: 'work-order-updates' };

        await kirim('/api/mobile/work-orders/wo-1/status', { action: 'START', photoUrl: null, meta });

        expect(mockUploadFile).not.toHaveBeenCalled();
        expect(mockRequest).toHaveBeenCalledWith(
          expect.objectContaining({ data: { action: 'START', photoUrl: null, meta } }),
        );
      });
    });

    describe('(c) tanpa meta foto', () => {
      it('online: payload terkirim apa adanya tanpa unggah', async () => {
        mockIsOnline.mockResolvedValue(true as never);
        mockRequest.mockResolvedValue({ data: { success: true } } as never);

        await kirim('/api/mobile/work-order', { title: 'WO-1', meta: { requestId: 'r-1' } });

        expect(mockUploadFile).not.toHaveBeenCalled();
        expect(mockRequest).toHaveBeenCalledWith(
          expect.objectContaining({ data: { title: 'WO-1', meta: { requestId: 'r-1' } } }),
        );
      });

      it('offline: meta antrean sama dengan meta asal tanpa salin', async () => {
        mockIsOnline.mockResolvedValue(false as never);

        await kirim('/api/mobile/work-order', { title: 'WO-1', meta: { requestId: 'r-1' } });

        expect(mockPersist).not.toHaveBeenCalled();
        expect(mockAddToQueue).toHaveBeenCalledWith(
          '/api/mobile/work-order',
          'POST',
          { title: 'WO-1', meta: { requestId: 'r-1' } },
          { requestId: 'r-1' },
        );
      });
    });
  });
  describe('409 IDEMPOTENCY_IN_PROGRESS di jalur online (Task 11c)', () => {
    const ENDPOINT_KEGIATAN = '/api/presurvei/kegiatan';
    const REQUEST_ID = 'presurvei-uuid-11c';

    // `response` dipasang setelah konstruksi: build axios di Jest tidak
    // mengisinya dari argumen konstruktor ke-5.
    const bangunGalat409 = (code: string) => {
      const { AxiosError } = require('axios');
      return Object.assign(new AxiosError('Request failed with status code 409', 'ERR_BAD_REQUEST'), {
        response: {
          status: 409,
          statusText: 'Conflict',
          headers: {},
          config: {},
          data: { success: false, error: 'Galat idempotensi', code },
        },
      });
    };

    const kirimOnline = async (method: HttpMethodUji, variables: Record<string, unknown>) => {
      mockIsOnline.mockResolvedValue(true as never);
      const client = buatClient();
      const { useApiMutation } = require('@/hooks/queries/useApiMutation');
      const { result, unmount } = renderHook(
        () => useApiMutation({ endpoint: ENDPOINT_KEGIATAN, method }),
        { wrapper: createWrapper(client) },
      );
      let hasil: unknown;
      let galat: unknown;
      await act(async () => {
        try {
          hasil = await result.current.mutateAsync(variables);
        } catch (error) {
          galat = error;
        }
      });
      unmount();
      client.clear();
      return { hasil, galat };
    };

    it('POST ber-requestId diantre dengan payload dan requestId yang sama, tidak dilempar', async () => {
      mockRequest.mockRejectedValue(bangunGalat409('IDEMPOTENCY_IN_PROGRESS'));

      const { hasil, galat } = await kirimOnline('POST', {
        jenis: 'TELEPON',
        hasil: 'TIDAK_MINAT',
        requestId: REQUEST_ID,
      });

      expect(galat).toBeUndefined();
      expect(hasil).toEqual(
        expect.objectContaining({ kind: 'offline-queued', endpoint: ENDPOINT_KEGIATAN, method: 'POST' }),
      );
      expect(mockAddToQueue).toHaveBeenCalledWith(
        ENDPOINT_KEGIATAN,
        'POST',
        { jenis: 'TELEPON', hasil: 'TIDAK_MINAT', requestId: 'presurvei-uuid-11c' },
        { requestId: 'presurvei-uuid-11c' },
      );
      expect(presentAppError).not.toHaveBeenCalled();
    });

    it('regresi: 409 IDEMPOTENCY_KEY_REUSED tetap dilempar, tidak diantre', async () => {
      const galatServer = bangunGalat409('IDEMPOTENCY_KEY_REUSED');
      mockRequest.mockRejectedValue(galatServer);

      const { galat } = await kirimOnline('POST', { jenis: 'TELEPON', requestId: REQUEST_ID });

      expect(galat).toBe(galatServer);
      expect(mockAddToQueue).not.toHaveBeenCalled();
    });

    it('regresi: 409 biasa (BUSINESS_LOGIC_ERROR) tetap dilempar, tidak diantre', async () => {
      const galatServer = bangunGalat409('BUSINESS_LOGIC_ERROR');
      mockRequest.mockRejectedValue(galatServer);

      const { galat } = await kirimOnline('POST', { jenis: 'TELEPON', requestId: REQUEST_ID });

      expect(galat).toBe(galatServer);
      expect(mockAddToQueue).not.toHaveBeenCalled();
    });

    it('409 IDEMPOTENCY_IN_PROGRESS tanpa requestId dilempar: tak ada kunci untuk replay', async () => {
      const galatServer = bangunGalat409('IDEMPOTENCY_IN_PROGRESS');
      mockRequest.mockRejectedValue(galatServer);

      const { galat } = await kirimOnline('POST', { jenis: 'TELEPON' });

      expect(galat).toBe(galatServer);
      expect(mockAddToQueue).not.toHaveBeenCalled();
    });

    it('409 IDEMPOTENCY_IN_PROGRESS pada PATCH dilempar: hanya POST yang diantre', async () => {
      const galatServer = bangunGalat409('IDEMPOTENCY_IN_PROGRESS');
      mockRequest.mockRejectedValue(galatServer);

      const { galat } = await kirimOnline('PATCH', { status: 'DEAL', requestId: REQUEST_ID });

      expect(galat).toBe(galatServer);
      expect(mockAddToQueue).not.toHaveBeenCalled();
    });
  });
});
