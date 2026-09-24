import React, { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Memakai `useApiMutation` asli — yang diuji adalah apa yang benar-benar
 * masuk antrean SQLite saat offline: badan dengan titik GPS, dan meta foto
 * yang sudah disalin ke penyimpanan tetap.
 */

const mockPresentAppError = jest.fn();
jest.mock('@/utils/errorPresenter', () => ({
  presentAppError: (...args: unknown[]) => mockPresentAppError(...args),
  presentInfoMessage: jest.fn(),
  presentSuccessMessage: jest.fn(),
}));
const mockRequest = jest.fn<(config: unknown) => Promise<{ data: unknown }>>();
jest.mock('@/services/api', () => ({ __esModule: true, default: { request: (c: unknown) => mockRequest(c) } }));
const mockIsOnline = jest.fn<() => Promise<boolean>>();
jest.mock('@/services/SyncService', () => ({ SyncService: { isOnline: () => mockIsOnline() } }));
const mockAddToQueue = jest.fn<(...args: unknown[]) => Promise<void>>();
jest.mock('@/services/DatabaseService', () => ({ DatabaseService: { addToQueue: (...a: unknown[]) => mockAddToQueue(...a) } }));
jest.mock('@/services/AttendanceTelemetryService', () => ({ AttendanceTelemetryService: { track: jest.fn() } }));
const mockUploadFile = jest.fn<(uri: string, tipe: string) => Promise<string>>();
jest.mock('@/services/UploadService', () => ({ uploadService: { uploadFile: (u: string, t: string) => mockUploadFile(u, t) } }));
jest.mock('@/utils/persistPhoto', () => ({
  persistPhotoForOffline: async (uri: string) => uri.replace('file:///cache/', 'file:///dokumen/offline-photos/'),
}));
jest.mock('@/utils/attendanceIdempotency', () => ({
  // Asli: header Idempotency-Key dari requestId adalah yang diuji (Task 11b).
  buildAttendanceIdempotencyHeaders: jest.requireActual<typeof import('@/utils/attendanceIdempotency')>(
    '@/utils/attendanceIdempotency',
  ).buildAttendanceIdempotencyHeaders,
  ensureAttendanceRequestId: jest.fn((payload: unknown) => payload),
  isAttendanceEndpoint: jest.fn(() => false),
}));
jest.mock('@/utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

// RULING fix round Task 15 (#2): instrumentasi `useMutation` asli untuk
// membuktikan `useApiMutation` meneruskan `meta` sampai ke sana — `jest.spyOn`
// tidak bisa dipakai karena export ESM paket ini tidak bisa didefinisikan ulang.
const mockPanggilanUseMutation: unknown[] = [];
jest.mock('@tanstack/react-query', () => {
  const asli = jest.requireActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...asli,
    useMutation: (opsi: unknown) => {
      mockPanggilanUseMutation.push(opsi);
      return asli.useMutation(opsi as Parameters<typeof asli.useMutation>[0]);
    },
  };
});

import { useCatatKegiatan } from '@/hooks/presurvei/useCatatKegiatan';
import { keMuatanKegiatan, NILAI_FORM_KEGIATAN_KOSONG } from '@/utils/presurvei/formKegiatan';
import { bangunVariabelCatat } from '@/utils/presurvei/variabelCatat';

const bungkus = (client: QueryClient) =>
  function Pembungkus({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };

const buatClient = () =>
  new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: Infinity } } });

const VARIABEL = bangunVariabelCatat(
  keMuatanKegiatan(
    { ...NILAI_FORM_KEGIATAN_KOSONG, jenis: 'KUNJUNGAN', hasil: 'TERTARIK', ditemuiNama: 'Bu Sari', alamat: 'Jl. Melati 9' },
    { titik: { latitude: -6.2, longitude: 106.8, akurasiMeter: 12 }, waktuMulai: new Date('2026-09-24T03:15:00.000Z') },
  ),
  ['file:///cache/a.jpg'],
);
// Literal terpisah, bukan `VARIABEL.requestId`: mock expo-crypto memberi UUID
// tetap (`__mocks__/expo-crypto.js`), jadi nilai ini bisa dituliskan apa adanya.
const ID_PERMINTAAN = 'presurvei-mocked-uuid-1234-5678';

describe('useCatatKegiatan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddToQueue.mockResolvedValue(undefined);
    mockUploadFile.mockImplementation(async (uri) => `https://cdn.test/${uri.split('/').pop()}`);
    mockPanggilanUseMutation.length = 0;
  });

  // RULING fix round Task 15 (#2): tanpa meta ini, toast global
  // `MutationCache.onError` (`src/lib/queryClient.ts`) tampil berdampingan
  // dengan `presentAppError` yang sudah dipanggil `onError` hook ini sendiri.
  it('meneruskan meta.skipGlobalErrorToast sampai ke useMutation', () => {
    const client = buatClient();
    renderHook(() => useCatatKegiatan(jest.fn()), { wrapper: bungkus(client) });

    expect(mockPanggilanUseMutation).toContainEqual(
      expect.objectContaining({ meta: { skipGlobalErrorToast: true } }),
    );
    client.clear();
  });

  it('mengantre kegiatan offline beserta titik GPS dan foto yang disalin', async () => {
    mockIsOnline.mockResolvedValue(false);
    const client = buatClient();
    const invalidasi = jest.spyOn(client, 'invalidateQueries');
    const onTersimpan = jest.fn();
    const { result, unmount } = renderHook(() => useCatatKegiatan(onTersimpan), { wrapper: bungkus(client) });

    await act(async () => {
      await result.current.mutateAsync(VARIABEL);
    });

    expect(mockAddToQueue).toHaveBeenCalledWith(
      '/api/presurvei/kegiatan',
      'POST',
      {
        jenis: 'KUNJUNGAN',
        hasil: 'TERTARIK',
        waktuMulai: '2026-09-24T03:15:00.000Z',
        prospekId: null,
        ditemuiNama: 'Bu Sari',
        catatan: null,
        latitude: -6.2,
        longitude: 106.8,
        alamatDikunjungi: 'Jl. Melati 9',
        requestId: ID_PERMINTAAN,
      },
      {
        photos: ['file:///dokumen/offline-photos/a.jpg'],
        targetField: 'fotoUrls',
        photoType: 'presurvei',
        requestId: ID_PERMINTAAN,
      },
    );
    expect(onTersimpan).toHaveBeenCalledWith({ isAntre: true });
    expect(invalidasi).toHaveBeenCalledWith({ queryKey: ['presurvei', 'antrean'] });
    unmount();
    client.clear();
  });

  it('online: mengunggah foto lalu menyegarkan seluruh data presurvei', async () => {
    mockIsOnline.mockResolvedValue(true);
    mockRequest.mockResolvedValue({ data: { success: true, data: { kegiatan: { id: 'k-1' }, prospek: null } } });
    const client = buatClient();
    const invalidasi = jest.spyOn(client, 'invalidateQueries');
    const onTersimpan = jest.fn();
    const { result, unmount } = renderHook(() => useCatatKegiatan(onTersimpan), { wrapper: bungkus(client) });

    await act(async () => {
      await result.current.mutateAsync(VARIABEL);
    });

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/presurvei/kegiatan',
        method: 'POST',
        data: expect.objectContaining({ fotoUrls: ['https://cdn.test/a.jpg'], latitude: -6.2 }),
      }),
    );
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.not.objectContaining({ meta: expect.anything() }) }),
    );
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ headers: { 'Idempotency-Key': ID_PERMINTAAN } }),
    );
    expect(onTersimpan).toHaveBeenCalledWith({ isAntre: false });
    expect(invalidasi).toHaveBeenCalledWith({ queryKey: ['presurvei'] });
    unmount();
    client.clear();
  });

  describe('galat server', () => {
    const bangunGalatServer = (status: number, code: string) => {
      const { AxiosError } = require('axios');
      return Object.assign(new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST'), {
        response: { status, statusText: '', headers: {}, config: {}, data: { success: false, error: 'Galat', code } },
      });
    };

    const kirimDenganGalat = async (galatServer: unknown) => {
      mockIsOnline.mockResolvedValue(true);
      mockRequest.mockRejectedValue(galatServer);
      const client = buatClient();
      const invalidasi = jest.spyOn(client, 'invalidateQueries');
      const onTersimpan = jest.fn();
      const { result, unmount } = renderHook(() => useCatatKegiatan(onTersimpan), { wrapper: bungkus(client) });
      let galat: unknown = null;
      await act(async () => {
        try {
          await result.current.mutateAsync(VARIABEL);
        } catch (error) {
          galat = error;
        }
      });
      unmount();
      client.clear();
      return { galat, invalidasi, onTersimpan };
    };

    it('galat server biasa ditampilkan lewat presentAppError', async () => {
      const galatServer = bangunGalatServer(500, 'INTERNAL_ERROR');

      const { galat, onTersimpan } = await kirimDenganGalat(galatServer);

      expect(galat).toBe(galatServer);
      expect(mockPresentAppError).toHaveBeenCalledWith(
        galatServer,
        expect.objectContaining({ source: 'mutation', route: '/api/presurvei/kegiatan' }),
      );
      expect(onTersimpan).not.toHaveBeenCalled();
    });

    it('409 IDEMPOTENCY_KEY_REUSED tidak memunculkan pesan teknis; layar yang memutuskan', async () => {
      const galatServer = bangunGalatServer(409, 'IDEMPOTENCY_KEY_REUSED');

      const { galat, invalidasi } = await kirimDenganGalat(galatServer);

      expect(galat).toBe(galatServer);
      expect(mockPresentAppError).not.toHaveBeenCalled();
      expect(invalidasi).toHaveBeenCalledWith({ queryKey: ['presurvei'] });
    });
  });
});
