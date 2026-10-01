import React, { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockBuat = jest.fn<(muatan: unknown, requestId: string) => Promise<unknown>>();
const mockBatalkan = jest.fn<(id: string, alasan: string) => Promise<unknown>>();
jest.mock('@/services/PresurveiService', () => ({
  PresurveiService: {
    buatRencana: (muatan: unknown, requestId: string) => mockBuat(muatan, requestId),
    batalkanRencana: (id: string, alasan: string) => mockBatalkan(id, alasan),
  },
}));
let mockNomorUuid = 0;
jest.mock('expo-crypto', () => ({
  randomUUID: () => {
    mockNomorUuid += 1;
    return `uuid-${mockNomorUuid}`;
  },
}));
const mockSukses = jest.fn();
const mockGalat = jest.fn();
const mockPesanGalat = jest.fn();
jest.mock('@/utils/errorPresenter', () => ({
  presentSuccessMessage: (...a: unknown[]) => mockSukses(...a),
  presentAppError: (...a: unknown[]) => mockGalat(...a),
  presentErrorMessage: (...a: unknown[]) => mockPesanGalat(...a),
}));

import { PESAN_RENCANA_DITUTUP, useBatalkanRencana, useBuatRencana } from '@/hooks/presurvei/useMutasiRencana';

const bungkus = (client: QueryClient) =>
  function Pembungkus({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };

/** Notifikasi batch TanStack berjalan lewat `setTimeout(0)` (lihat useUbahStatusProspek.test). */
const tungguNotifikasiBatch = () => new Promise((resolve) => setTimeout(resolve, 0));

const MUATAN = { tanggal: '2026-09-27', jam: null, jenis: 'KUNJUNGAN' as const, tujuan: 'Presentasi', prospekId: null, alamat: null };
const buatClient = () => new QueryClient({ defaultOptions: { mutations: { gcTime: 0 } } });

describe('useBuatRencana', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('kirim ulang isian sama memakai requestId sama; sukses menyegarkan presurvei dan menutup layar', async () => {
    mockBuat.mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce({ id: 'r-1' });
    const client = buatClient();
    const invalidasi = jest.spyOn(client, 'invalidateQueries');
    const onSelesai = jest.fn();
    const { result } = renderHook(() => useBuatRencana(onSelesai), { wrapper: bungkus(client) });

    await act(async () => {
      await result.current.mutateAsync(MUATAN).catch(() => undefined);
      await result.current.mutateAsync(MUATAN);
      await tungguNotifikasiBatch();
    });

    const [kunciPertama, kunciKedua] = mockBuat.mock.calls.map((panggilan) => panggilan[1]);
    expect(kunciPertama).toBe(kunciKedua);
    expect(invalidasi).toHaveBeenCalledWith({ queryKey: ['presurvei'] });
    expect(onSelesai).toHaveBeenCalledTimes(1);
    expect(mockGalat).toHaveBeenCalledTimes(1);
    client.clear();
  });

  it('isian berubah setelah gagal adalah niat baru dengan requestId baru', async () => {
    mockBuat.mockRejectedValue(new Error('timeout'));
    const client = buatClient();
    const { result } = renderHook(() => useBuatRencana(jest.fn()), { wrapper: bungkus(client) });

    await act(async () => {
      await result.current.mutateAsync(MUATAN).catch(() => undefined);
      await result.current.mutateAsync({ ...MUATAN, tujuan: 'Lain' }).catch(() => undefined);
      await tungguNotifikasiBatch();
    });

    const [kunciPertama, kunciKedua] = mockBuat.mock.calls.map((panggilan) => panggilan[1]);
    expect(kunciPertama).not.toBe(kunciKedua);
    client.clear();
  });

  it('toast sukses bawaan "Rencana dibuat"; pesanSukses menggantinya dengan muatan terkirim', async () => {
    mockBuat.mockResolvedValue({ id: 'r-2' });
    const client = buatClient();
    const { result } = renderHook(
      () => useBuatRencana<typeof MUATAN & { salesId: string }>(jest.fn(), (muatan) => `Penugasan ke ${muatan.salesId}`),
      { wrapper: bungkus(client) },
    );
    const bawaan = renderHook(() => useBuatRencana(jest.fn()), { wrapper: bungkus(client) });

    await act(async () => {
      await result.current.mutateAsync({ ...MUATAN, salesId: 's-2' });
      await bawaan.result.current.mutateAsync(MUATAN);
      await tungguNotifikasiBatch();
    });

    expect(mockBuat).toHaveBeenCalledWith({ ...MUATAN, salesId: 's-2' }, expect.any(String));
    expect(mockSukses).toHaveBeenCalledWith('Penugasan ke s-2');
    expect(mockSukses).toHaveBeenCalledWith('Rencana dibuat');
    client.clear();
  });
});

describe('useBatalkanRencana', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('409 CONFLICT dijelaskan sebagai rencana sudah ditutup dan data dimuat ulang', async () => {
    mockBatalkan.mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { code: 'CONFLICT' } } });
    const client = buatClient();
    const invalidasi = jest.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useBatalkanRencana('r-1', jest.fn()), { wrapper: bungkus(client) });

    await act(async () => {
      await result.current.mutateAsync('Hujan').catch(() => undefined);
      await tungguNotifikasiBatch();
    });

    expect(mockBatalkan).toHaveBeenCalledWith('r-1', 'Hujan');
    expect(mockPesanGalat).toHaveBeenCalledWith(PESAN_RENCANA_DITUTUP, expect.any(String));
    expect(invalidasi).toHaveBeenCalledWith({ queryKey: ['presurvei'] });
    expect(mockGalat).not.toHaveBeenCalled();
    client.clear();
  });
});
