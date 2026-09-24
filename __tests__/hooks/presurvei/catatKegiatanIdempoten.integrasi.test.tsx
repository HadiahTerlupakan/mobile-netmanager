import React, { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Test integrasi I1 (review akhir): layar catat → `useCatatKegiatan` →
 * `useApiMutation` asli, dengan QueryClient yang memakai default produksi
 * `mutations.retry: 1` (`src/lib/queryClient.ts`). Server tiruan di bawah
 * meniru `withIdempotency` backend: kunci baru dicatat, kunci sama + badan
 * sama = replay, kunci sama + badan beda = 409 `IDEMPOTENCY_KEY_REUSED`.
 * Yang dijaga: satu niat = satu kegiatan di server.
 */

type KonfigurasiPermintaan = { data: Record<string, unknown>; headers?: Record<string, string> };

const mockPresentAppError = jest.fn();
const mockPresentInfo = jest.fn();
jest.mock('@/utils/errorPresenter', () => ({
  presentAppError: (...args: unknown[]) => mockPresentAppError(...args),
  presentInfoMessage: (...args: unknown[]) => mockPresentInfo(...args),
  presentSuccessMessage: jest.fn(),
}));
const mockRequest = jest.fn<(config: KonfigurasiPermintaan) => Promise<{ data: unknown }>>();
jest.mock('@/services/api', () => ({
  __esModule: true,
  default: { request: (c: KonfigurasiPermintaan) => mockRequest(c) },
}));
jest.mock('@/services/SyncService', () => ({
  SyncService: { isOnline: async () => true, scheduleQueueDrain: jest.fn() },
}));
const mockAddToQueue = jest.fn<(...args: unknown[]) => Promise<void>>();
jest.mock('@/services/DatabaseService', () => ({
  DatabaseService: { addToQueue: (...a: unknown[]) => mockAddToQueue(...a) },
}));
jest.mock('@/services/AttendanceTelemetryService', () => ({ AttendanceTelemetryService: { track: jest.fn() } }));
let mockNomorUnggahan = 0;
const mockUploadFile = jest.fn(async () => {
  // Server unggah memberi URL baru untuk setiap unggahan, seperti produksi.
  mockNomorUnggahan += 1;
  return `https://cdn.test/unggahan-${mockNomorUnggahan}.jpg`;
});
jest.mock('@/services/UploadService', () => ({
  uploadService: { uploadFile: () => mockUploadFile() },
  UploadType: {},
  NAMA_GALAT_UNGGAH_HABIS_WAKTU: 'UploadTimeoutError',
  AWALAN_GALAT_STATUS_UNGGAH: 'Upload failed with status',
  PESAN_RESPONS_UNGGAH_TIDAK_SAH: 'Invalid response from upload server',
}));
jest.mock('@/utils/persistPhoto', () => ({
  persistPhotoForOffline: async (uri: string) => uri,
  isBerkasLokalAda: async () => true,
}));
let mockNomorUuid = 0;
jest.mock('expo-crypto', () => ({
  randomUUID: () => {
    mockNomorUuid += 1;
    return `uuid-integrasi-${mockNomorUuid}`;
  },
}));
jest.mock('expo-router', () => {
  const React = require('react');
  return { useFocusEffect: (efek: () => void) => React.useEffect(() => efek(), [efek]) };
});
// Satu objek tetap: `cari` wajib stabil antar-render (efek fokus bergantung padanya).
const mockLokasiSiap = {
  status: 'siap',
  titik: { latitude: -6.2, longitude: 106.8, akurasiMeter: 12 },
  alamatTerdeteksi: '',
  cari: () => undefined,
};
jest.mock('@/hooks/presurvei/useLokasiKegiatan', () => ({ useLokasiKegiatan: () => mockLokasiSiap }));
jest.mock('@/utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

import { useLayarCatatKegiatan } from '@/hooks/presurvei/useLayarCatatKegiatan';

const bangunGalatServer = (status: number, code: string) => {
  const { AxiosError } = require('axios');
  return Object.assign(new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST'), {
    response: { status, statusText: '', headers: {}, config: {}, data: { success: false, error: 'Galat', code } },
  });
};

/**
 * Server tiruan: kunci pertama kali dilihat → kegiatan tercatat; bila
 * `isBalasanPertamaHilang`, balasan permintaan pertama diganti 504 dari
 * gateway (server sudah commit).
 */
function pasangServerIdempoten(isBalasanPertamaHilang: boolean) {
  const kunciTercatat = new Map<string, string>();
  const server = { jumlahKegiatan: 0, galat504: bangunGalatServer(504, 'GATEWAY_TIMEOUT') };
  mockRequest.mockImplementation(async ({ data, headers }) => {
    const kunci = headers?.['Idempotency-Key'] ?? '';
    const sidikBadan = JSON.stringify(data);
    const lama = kunciTercatat.get(kunci);
    if (lama === undefined) {
      kunciTercatat.set(kunci, sidikBadan);
      server.jumlahKegiatan += 1;
      if (isBalasanPertamaHilang && server.jumlahKegiatan === 1) throw server.galat504;
      return { data: { success: true, data: { kegiatan: { id: `k-${server.jumlahKegiatan}` }, prospek: null } } };
    }
    if (lama === sidikBadan) return { data: { success: true, data: { kegiatan: { id: 'k-replay' }, prospek: null } } };
    throw bangunGalatServer(409, 'IDEMPOTENCY_KEY_REUSED');
  });
  return server;
}

/** Default produksi (`src/lib/queryClient.ts`): mutasi diulang sekali. */
const buatClientSepertiProduksi = () =>
  new QueryClient({ defaultOptions: { mutations: { retry: 1, retryDelay: 1, gcTime: Infinity } } });

const bungkus = (client: QueryClient) =>
  function Pembungkus({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };

const kunciIdempotensiTerkirim = () => mockRequest.mock.calls.map(([konfigurasi]) => konfigurasi.headers?.['Idempotency-Key']);

describe('Catat kegiatan: retry otomatis tidak boleh mencatat ganda (I1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNomorUnggahan = 0;
    mockNomorUuid = 0;
    mockAddToQueue.mockResolvedValue(undefined);
  });

  const simpanDanTunggu = async (client: QueryClient, simpan: () => void) => {
    act(() => simpan());
    await waitFor(() => expect(client.isMutating()).toBe(0));
  };

  it('504 setelah server commit: tidak diulang otomatis, simpan ulang memakai requestId sama dan dianggap sudah tercatat', async () => {
    const server = pasangServerIdempoten(true);
    const client = buatClientSepertiProduksi();
    const onSelesai = jest.fn();
    const { result, unmount } = renderHook(() => useLayarCatatKegiatan({}, onSelesai, true), {
      wrapper: bungkus(client),
    });
    act(() => {
      result.current.form.ubah({ jenis: 'KUNJUNGAN', hasil: 'TERTARIK' });
      result.current.form.tambahFoto('file:///cache/a.jpg');
    });

    await simpanDanTunggu(client, () => result.current.simpan());

    // Upaya pertama: tepat satu POST dan satu unggahan; galat yang tampil
    // adalah 504 itu sendiri, bukan 409 "Idempotency-Key sudah dipakai".
    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(mockUploadFile).toHaveBeenCalledTimes(1);
    expect(mockPresentAppError).toHaveBeenCalledTimes(1);
    expect(mockPresentAppError).toHaveBeenCalledWith(
      server.galat504,
      expect.objectContaining({ source: 'mutation', route: '/api/presurvei/kegiatan' }),
    );
    expect(onSelesai).not.toHaveBeenCalled();

    // Sales menekan Simpan lagi dengan isian yang sama.
    await simpanDanTunggu(client, () => result.current.simpan());

    expect(kunciIdempotensiTerkirim()).toEqual(['presurvei-uuid-integrasi-1', 'presurvei-uuid-integrasi-1']);
    expect(server.jumlahKegiatan).toBe(1);
    expect(mockPresentInfo).toHaveBeenCalledWith('Kegiatan ini sudah tercatat sebelumnya.');
    expect(mockPresentAppError).toHaveBeenCalledTimes(1);
    expect(onSelesai).toHaveBeenCalledTimes(1);
    unmount();
    client.clear();
  });

  it('kontrol: tanpa galat, satu simpan = satu POST = satu kegiatan', async () => {
    const server = pasangServerIdempoten(false);
    const client = buatClientSepertiProduksi();
    const onSelesai = jest.fn();
    const { result, unmount } = renderHook(() => useLayarCatatKegiatan({}, onSelesai, true), {
      wrapper: bungkus(client),
    });
    act(() => {
      result.current.form.ubah({ jenis: 'TELEPON', hasil: 'TIDAK_MINAT' });
    });

    await simpanDanTunggu(client, () => result.current.simpan());

    expect(server.jumlahKegiatan).toBe(1);
    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(mockPresentAppError).not.toHaveBeenCalled();
    expect(onSelesai).toHaveBeenCalledTimes(1);
    unmount();
    client.clear();
  });
});
