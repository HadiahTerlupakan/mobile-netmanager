import React, { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockTandaTangan = jest.fn<(id: string, dataUrl: string) => Promise<{ completed: boolean }>>();
const mockTolak = jest.fn<(id: string, alasan: string) => Promise<{ declined: true }>>();
const mockUnduh = jest.fn<(id: string) => Promise<string>>();
jest.mock('@/services/PengesahanService', () => ({
  PengesahanService: {
    tandaTangan: (id: string, dataUrl: string) => mockTandaTangan(id, dataUrl),
    tolak: (id: string, alasan: string) => mockTolak(id, alasan),
    unduhDokumen: (id: string) => mockUnduh(id),
  },
}));
const mockBukaPdf = jest.fn<(uri: string) => Promise<void>>(async () => undefined);
jest.mock('@/utils/bukaBerkasPdf', () => ({ bukaBerkasPdf: (uri: string) => mockBukaPdf(uri) }));
const mockSukses = jest.fn();
const mockGalat = jest.fn();
const mockPesanGalat = jest.fn();
jest.mock('@/utils/errorPresenter', () => ({
  presentSuccessMessage: (...a: unknown[]) => mockSukses(...a),
  presentAppError: (...a: unknown[]) => mockGalat(...a),
  presentErrorMessage: (...a: unknown[]) => mockPesanGalat(...a),
}));

import { PESAN_SURAT_SAH, PESAN_TANDA_TANGAN_TERSIMPAN, useKirimTandaTangan } from '@/hooks/pengesahan/useKirimTandaTangan';
import { useLihatDokumenPengesahan } from '@/hooks/pengesahan/useLihatDokumenPengesahan';
import { useTolakPengesahan } from '@/hooks/queries/usePengesahan';
import { PESAN_TANDA_TANGAN_KOSONG } from '@/utils/pengesahan/formPengesahan';

const bungkus = (client: QueryClient) =>
  function Pembungkus({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
/** Notifikasi batch TanStack berjalan lewat `setTimeout(0)`. */
const tungguNotifikasiBatch = () => new Promise((resolve) => setTimeout(resolve, 0));
const buatClient = () => new QueryClient({ defaultOptions: { mutations: { gcTime: 0 } } });
const TTD_SAH = 'data:image/png;base64,iVBORw0KGgo=';

describe('useKirimTandaTangan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('mengirim tanda tangan, menyegarkan seluruh cache pengesahan, mengumumkan surat sah, lalu menutup layar', async () => {
    mockTandaTangan.mockResolvedValueOnce({ completed: true });
    const client = buatClient();
    const invalidasi = jest.spyOn(client, 'invalidateQueries');
    const onSelesai = jest.fn();
    const { result } = renderHook(() => useKirimTandaTangan('d-1', onSelesai), { wrapper: bungkus(client) });

    await act(async () => {
      result.current.kirim(TTD_SAH);
      await tungguNotifikasiBatch();
    });

    expect(mockTandaTangan).toHaveBeenCalledWith('d-1', TTD_SAH);
    expect(invalidasi).toHaveBeenCalledWith({ queryKey: ['pengesahan'] });
    expect(mockSukses).toHaveBeenCalledWith(PESAN_SURAT_SAH, 'Surat sah');
    expect(onSelesai).toHaveBeenCalledTimes(1);
    client.clear();
  });

  it('belum semua pihak tanda tangan: pesan tersimpan biasa', async () => {
    mockTandaTangan.mockResolvedValueOnce({ completed: false });
    const client = buatClient();
    const { result } = renderHook(() => useKirimTandaTangan('d-1', jest.fn()), { wrapper: bungkus(client) });

    await act(async () => {
      result.current.kirim(TTD_SAH);
      await tungguNotifikasiBatch();
    });

    expect(mockSukses).toHaveBeenCalledWith(PESAN_TANDA_TANGAN_TERSIMPAN);
    client.clear();
  });

  it('tanda tangan kosong tidak dikirim; galat server (409) ditampilkan tanpa menutup layar', async () => {
    mockTandaTangan.mockRejectedValueOnce(new Error('Anda sudah menandatangani surat ini'));
    const client = buatClient();
    const onSelesai = jest.fn();
    const { result } = renderHook(() => useKirimTandaTangan('d-1', onSelesai), { wrapper: bungkus(client) });

    await act(async () => {
      result.current.kirim('data:image/png;base64,');
      result.current.beriTahuKosong();
      result.current.kirim(TTD_SAH);
      await tungguNotifikasiBatch();
    });

    expect(mockPesanGalat).toHaveBeenCalledWith(PESAN_TANDA_TANGAN_KOSONG);
    expect(mockTandaTangan).toHaveBeenCalledTimes(1);
    expect(mockGalat).toHaveBeenCalledTimes(1);
    expect(onSelesai).not.toHaveBeenCalled();
    client.clear();
  });
});

describe('useTolakPengesahan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('menolak dengan alasan lalu menyegarkan cache pengesahan', async () => {
    mockTolak.mockResolvedValueOnce({ declined: true });
    const client = buatClient();
    const invalidasi = jest.spyOn(client, 'invalidateQueries');
    const onBerhasil = jest.fn();
    const { result } = renderHook(() => useTolakPengesahan('d-1', onBerhasil), { wrapper: bungkus(client) });

    await act(async () => {
      await result.current.mutateAsync('Data keliru');
      await tungguNotifikasiBatch();
    });

    expect(mockTolak).toHaveBeenCalledWith('d-1', 'Data keliru');
    expect(invalidasi).toHaveBeenCalledWith({ queryKey: ['pengesahan'] });
    expect(onBerhasil).toHaveBeenCalledTimes(1);
    client.clear();
  });
});

describe('useLihatDokumenPengesahan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('mengunduh lalu membuka PDF; gagal unduh ditampilkan lewat presentAppError', async () => {
    mockUnduh.mockResolvedValueOnce('file:///cache/pengesahan-d-1.pdf').mockRejectedValueOnce(new Error('Dokumen gagal diunduh.'));
    const client = buatClient();
    const { result } = renderHook(() => useLihatDokumenPengesahan('d-1'), { wrapper: bungkus(client) });

    await act(async () => {
      await result.current.mutateAsync();
      await result.current.mutateAsync().catch(() => undefined);
      await tungguNotifikasiBatch();
    });

    expect(mockBukaPdf).toHaveBeenCalledWith('file:///cache/pengesahan-d-1.pdf');
    expect(mockGalat).toHaveBeenCalledTimes(1);
    client.clear();
  });
});
