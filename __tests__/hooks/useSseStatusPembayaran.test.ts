import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

/**
 * SSE mengirim `status` efektif plus `gatewayStatus` mentah. Server memetakan
 * CANCELLED (ganti metode, transfer manual dibatalkan) ke status FAILED juga;
 * aplikasi dulu menyebut semuanya "ditolak oleh Admin".
 */

type Pendengar = (event: { data?: string }) => void;
const mockPendengar: Record<string, Pendengar> = {};
const mockTutup = jest.fn();

jest.mock('react-native-sse', () =>
  jest.fn(() => ({
    addEventListener: (nama: string, pendengar: Pendengar) => {
      mockPendengar[nama] = pendengar;
    },
    close: mockTutup,
  })),
);
jest.mock('@/services/TokenService', () => ({ TokenService: { getToken: () => 'token-1' } }));
jest.mock('@/services/TenantService', () => ({ TenantService: { getTenantUrl: () => 'https://isp.test' } }));

import { useSseStatusPembayaran } from '@/hooks/tagihan/useSseStatusPembayaran';

const kirim = (muatan: Record<string, unknown>) => act(() => mockPendengar.message({ data: JSON.stringify(muatan) }));

beforeEach(() => {
  mockTutup.mockClear();
});

describe('useSseStatusPembayaran', () => {
  it.each([
    [{ status: 'PAID', gatewayStatus: 'PAID' }, 'PAID'],
    [{ status: 'EXPIRED', gatewayStatus: 'EXPIRED' }, 'EXPIRED'],
    [{ status: 'FAILED', gatewayStatus: 'FAILED' }, 'FAILED'],
    [{ status: 'FAILED', gatewayStatus: 'CANCELLED' }, 'CANCELLED'],
  ])('status akhir %j dilaporkan sebagai %s lalu koneksi ditutup', (muatan, harapan) => {
    const onStatusAkhir = jest.fn();
    renderHook(() => useSseStatusPembayaran('inv-1', onStatusAkhir));

    kirim(muatan);

    expect(onStatusAkhir).toHaveBeenCalledWith(harapan);
    expect(mockTutup).toHaveBeenCalled();
  });

  it('status yang belum berakhir diabaikan', () => {
    const onStatusAkhir = jest.fn();
    renderHook(() => useSseStatusPembayaran('inv-1', onStatusAkhir));

    kirim({ status: 'OVERDUE', gatewayStatus: 'PENDING' });

    expect(onStatusAkhir).not.toHaveBeenCalled();
  });
});
