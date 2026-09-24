import React, { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Memakai `useApiMutation` asli — yang diuji adalah apa yang benar-benar
 * masuk antrean SQLite saat offline: badan dengan titik GPS, dan meta foto
 * yang sudah disalin ke penyimpanan tetap.
 */

jest.mock('@/utils/errorPresenter', () => ({
  presentAppError: jest.fn(),
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
  buildAttendanceIdempotencyHeaders: jest.fn(() => ({})),
  ensureAttendanceRequestId: jest.fn((payload: unknown) => payload),
  isAttendanceEndpoint: jest.fn(() => false),
}));
jest.mock('@/utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

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

describe('useCatatKegiatan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddToQueue.mockResolvedValue(undefined);
    mockUploadFile.mockImplementation(async (uri) => `https://cdn.test/${uri.split('/').pop()}`);
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
      },
      {
        photos: ['file:///dokumen/offline-photos/a.jpg'],
        targetField: 'fotoUrls',
        photoType: 'presurvei',
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
    expect(onTersimpan).toHaveBeenCalledWith({ isAntre: false });
    expect(invalidasi).toHaveBeenCalledWith({ queryKey: ['presurvei'] });
    unmount();
    client.clear();
  });
});
