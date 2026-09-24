import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';

/**
 * S7 / Review Focus #4 dengan `queryClient` aplikasi yang asli (QueryCache
 * `onError` + `meta.silentToastStatuses`) dan `useRingkasanPresurvei` asli:
 * hanya layanan HTTP dan penampil toast yang diganti.
 */

const mockShowToast = jest.fn();
const mockRingkasan = jest.fn<() => Promise<unknown>>();

jest.mock('@/utils/errorPresenter', () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
}));
jest.mock('@/services/ErrorReportingService', () => ({
  errorReportingService: { captureException: jest.fn() },
}));
jest.mock('@/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));
jest.mock('@/services/PresurveiService', () => ({
  PresurveiService: { ringkasan: () => mockRingkasan() },
}));
jest.mock('@/hooks/queries/usePresurveiKegiatan', () => ({ useKegiatanMenungguKirim: () => ({ data: [] }) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => () => ({}));

import { BagianPresurveiBeranda, TEKS_PRESURVEI_BELUM_AKTIF } from '@/components/organisms/dashboard/BagianPresurveiBeranda';
import { queryClient } from '@/lib/queryClient';

const galatHttp = (status: number) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status },
  });

const renderDenganQueryClientAsli = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <BagianPresurveiBeranda isPresurveiAktif />
    </QueryClientProvider>,
  );

describe('BagianPresurveiBeranda + queryClient asli', () => {
  const opsiBawaan = queryClient.getDefaultOptions();

  beforeAll(() => {
    // Jeda ulang dinolkan supaya jalur 500 (diulang dua kali oleh hook) tidak
    // menunggu detik nyata; gcTime dinolkan karena timer gc 24 jam bawaan yang
    // dijadwalkan saat layar dilepas membuat proses Jest menggantung.
    queryClient.setDefaultOptions({ ...opsiBawaan, queries: { ...opsiBawaan.queries, retryDelay: 0, gcTime: 0 } });
  });

  afterAll(() => queryClient.setDefaultOptions(opsiBawaan));

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => queryClient.clear());

  it('403 ringkasan: kartu "belum aktif" tanpa toast global "Gagal Memuat Data"', async () => {
    mockRingkasan.mockRejectedValue(galatHttp(403));

    const { findByText, queryByText } = renderDenganQueryClientAsli();

    expect(await findByText(TEKS_PRESURVEI_BELUM_AKTIF)).toBeTruthy();
    expect(mockRingkasan).toHaveBeenCalledTimes(1);
    expect(mockShowToast).not.toHaveBeenCalled();
    expect(queryByText('Gagal Memuat Data')).toBeNull();
  });

  it('500 ringkasan (kontrol): toast global tetap muncul dan layar menampilkan galat', async () => {
    mockRingkasan.mockRejectedValue(galatHttp(500));

    const { findByText } = renderDenganQueryClientAsli();

    expect(await findByText('Ringkasan presurvei gagal dimuat.')).toBeTruthy();
    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith('error', 'Gagal Memuat Data', 'Request failed with status code 500'),
    );
    expect(mockRingkasan).toHaveBeenCalledTimes(3);
  });
});
